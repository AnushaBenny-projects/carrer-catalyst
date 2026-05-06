// Purpose: Defines API routes for the codeExecutionRoutes feature area.
import express from "express";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const router = express.Router();

const LANGUAGE_MAP = {
  javascript: { judge0Id: 63, label: "JavaScript" },
  python: { judge0Id: 71, label: "Python" },
  cpp: { judge0Id: 54, label: "C++" },
  java: { judge0Id: 62, label: "Java" },
  c: { judge0Id: 50, label: "C" },
  csharp: { judge0Id: 51, label: "C#" },
  go: { judge0Id: 60, label: "Go" },
  rust: { judge0Id: 73, label: "Rust" },
  php: { judge0Id: 68, label: "PHP" },
  ruby: { judge0Id: 72, label: "Ruby" },
  kotlin: { judge0Id: 78, label: "Kotlin" },
  typescript: { judge0Id: 74, label: "TypeScript" },
};

const CODE_EXEC_PROVIDER = (process.env.CODE_EXEC_PROVIDER || "remote").toLowerCase();
const JUDGE0_URL = (
  process.env.JUDGE0_URL ||
  process.env.JUDGE0_API_URL ||
  "http://localhost:2358"
).replace(/\/+$/, "");
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || process.env.RAPIDAPI_KEY || "";
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || process.env.RAPIDAPI_HOST || "";

function runProcess(command, args, options = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    let killedByTimeout = false;

    const timeout = setTimeout(() => {
      killedByTimeout = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({
        code,
        signal: killedByTimeout ? "TIMEOUT" : signal,
        stdout,
        stderr,
      });
    });
  });
}

async function commandExists(command, args = ["--version"]) {
  try {
    const result = await runProcess(command, args, {}, 5000);
    return result.code === 0 || (result.stderr || "").length > 0 || (result.stdout || "").length > 0;
  } catch {
    return false;
  }
}

async function tryLocalExecution(language, code) {
  if (language === "javascript") {
    const ok = await commandExists("node");
    if (!ok) throw new Error("Node.js runtime not found. Install Node.js to run JavaScript.");
    return runProcess("node", ["-e", code], {}, 15000);
  }

  if (language === "python") {
    const py = await commandExists("python");
    const py3 = await commandExists("python3");
    const pyLauncher = await commandExists("py", ["-3", "--version"]);
    if (!py && !py3 && !pyLauncher) {
      throw new Error("Python runtime not found. Install Python and ensure it is in PATH.");
    }
    try {
      return await runProcess("python", ["-c", code], {}, 15000);
    } catch {
      try {
        return await runProcess("python3", ["-c", code], {}, 15000);
      } catch {
        return runProcess("py", ["-3", "-c", code], {}, 15000);
      }
    }
  }

  if (language === "cpp") {
    const hasGpp = await commandExists("g++");
    const hasClang = await commandExists("clang++");
    if (!hasGpp && !hasClang) {
      throw new Error("C++ compiler not found. Install g++ (MinGW) or clang++ and add to PATH.");
    }
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cc-cpp-"));
    const src = path.join(tmpDir, "main.cpp");
    const out = path.join(tmpDir, process.platform === "win32" ? "main.exe" : "main");
    await fs.writeFile(src, code, "utf8");

    const compiler = hasGpp ? "g++" : "clang++";
    const compile = await runProcess(compiler, [src, "-O2", "-std=c++17", "-o", out], {}, 20000);
    if (compile.code !== 0) {
      return { code: compile.code, signal: compile.signal, stdout: "", stderr: compile.stderr, compile };
    }
    const run = await runProcess(out, [], { cwd: tmpDir }, 15000);
    return { ...run, compile };
  }

  if (language === "java") {
    const hasJavac = await commandExists("javac");
    const hasJava = await commandExists("java");
    if (!hasJavac || !hasJava) {
      throw new Error("Java runtime/compiler not found. Install JDK and add java/javac to PATH.");
    }
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cc-java-"));
    const src = path.join(tmpDir, "Main.java");
    await fs.writeFile(src, code, "utf8");

    const compile = await runProcess("javac", [src], { cwd: tmpDir }, 20000);
    if (compile.code !== 0) {
      return { code: compile.code, signal: compile.signal, stdout: "", stderr: compile.stderr, compile };
    }
    const run = await runProcess("java", ["-cp", tmpDir, "Main"], { cwd: tmpDir }, 15000);
    return { ...run, compile };
  }

  throw new Error("Unsupported local language");
}

router.get("/languages", (_req, res) => {
  const localSupported = new Set(["javascript", "python", "cpp", "java"]);
  const languages = Object.entries(LANGUAGE_MAP).map(([key, cfg]) => ({
    key,
    label: cfg.label || key,
    localSupported: localSupported.has(key),
    remoteSupported: true,
  }));
  return res.json({ languages });
});

function buildJudge0Headers() {
  const headers = { "Content-Type": "application/json" };
  if (JUDGE0_API_KEY) headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
  if (JUDGE0_API_HOST) headers["X-RapidAPI-Host"] = JUDGE0_API_HOST;
  return headers;
}

async function tryRemoteExecution(language, code, stdin = "") {
  const cfg = LANGUAGE_MAP[language];
  if (!cfg) throw new Error("Unsupported language for remote execution");
  if (!JUDGE0_URL) {
    throw new Error("Remote provider not configured. Set JUDGE0_URL and restart backend.");
  }

  const res = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: buildJudge0Headers(),
    body: JSON.stringify({
      language_id: cfg.judge0Id,
      source_code: code,
      stdin,
    }),
  });

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`Remote provider returned non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    const detail = payload?.message || payload?.error || JSON.stringify(payload);
    throw new Error(`Remote provider failed (${res.status}): ${detail}`);
  }

  const compileOutput = payload?.compile_output || "";
  const runStdout = payload?.stdout || "";
  const runStderr = payload?.stderr || "";
  const runnerMessage = payload?.message || "";
  const statusText = payload?.status?.description || "";
  const exitCode = typeof payload?.exit_code === "number" ? payload.exit_code : 0;

  return {
    code: exitCode,
    signal: payload?.signal || null,
    stdout: [runStdout, statusText].filter(Boolean).join("\n"),
    stderr: [runStderr, runnerMessage].filter(Boolean).join("\n"),
    compile: {
      stdout: "",
      stderr: compileOutput,
    },
  };
}

router.post("/execute", async (req, res) => {
  try {
    const { language, code, stdin = "" } = req.body || {};
    if (!language || !code) {
      return res.status(400).json({ message: "language and code are required" });
    }

    if (!LANGUAGE_MAP[language]) {
      return res.status(400).json({ message: "Unsupported language" });
    }

    const attempts = [];
    if (CODE_EXEC_PROVIDER === "remote") attempts.push("remote");
    else if (CODE_EXEC_PROVIDER === "auto") attempts.push("remote", "local");
    else attempts.push("local");

    let lastError = null;
    for (const provider of attempts) {
      try {
        const result = provider === "remote"
          ? await tryRemoteExecution(language, code, stdin)
          : await tryLocalExecution(language, code);

        return res.json({
          provider,
          language,
          stdout: result?.stdout || "",
          stderr: result?.stderr || "",
          output: (result?.stdout || "") + (result?.stderr || ""),
          compile: {
            stdout: result?.compile?.stdout || "",
            stderr: result?.compile?.stderr || "",
            output: (result?.compile?.stdout || "") + (result?.compile?.stderr || ""),
          },
          code: result?.code ?? 0,
          signal: result?.signal || null,
        });
      } catch (err) {
        lastError = err;
      }
    }

    return res.status(502).json({
      message: "Execution provider failed",
      error: lastError?.message || "Execution failed.",
      hint: CODE_EXEC_PROVIDER === "remote"
        ? "Configure JUDGE0_URL (and optional API key/host), then restart backend."
        : "Install local runtime or set CODE_EXEC_PROVIDER=remote with Judge0 config.",
    });
  } catch (err) {
    return res.status(500).json({ message: "Execution error", error: err.message });
  }
});

export default router;
