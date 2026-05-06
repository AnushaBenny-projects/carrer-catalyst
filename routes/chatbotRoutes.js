// Purpose: Defines API routes for the chatbotRoutes feature area.
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const intentsPath = path.join(__dirname, "..", "python", "chatbot", "intents.json");

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is",
  "it", "of", "on", "or", "that", "the", "to", "was", "what", "when", "where", "who", "why",
  "with", "you", "your", "me", "my", "we", "our"
]);

let intents = [];
let searchablePatterns = [];

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function buildIndex() {
  searchablePatterns = [];

  for (const intent of intents) {
    const patterns = Array.isArray(intent.patterns) ? intent.patterns : [];
    for (const pattern of patterns) {
      const tokens = tokenize(pattern);
      if (!tokens.length) continue;
      searchablePatterns.push({
        tag: intent.tag,
        tokens,
        responsePool: Array.isArray(intent.responses) ? intent.responses : []
      });
    }
  }
}

function loadIntents() {
  try {
    const raw = fs.readFileSync(intentsPath, "utf-8");
    const parsed = JSON.parse(raw);
    intents = Array.isArray(parsed.intents) ? parsed.intents : [];
    buildIndex();
    console.log("[chatbot] Loaded", intents.length, "intents (" + searchablePatterns.length + " patterns)");
  } catch (error) {
    intents = [];
    searchablePatterns = [];
    console.error("[chatbot] Failed to load intents.json:", error.message);
  }
}

function scoreMatch(queryTokens, patternTokens) {
  if (!queryTokens.length || !patternTokens.length) return 0;
  const q = new Set(queryTokens);
  const p = new Set(patternTokens);
  let overlap = 0;
  for (const token of q) {
    if (p.has(token)) overlap += 1;
  }
  return overlap / Math.max(q.size, p.size);
}

function getLocalResponse(message) {
  const queryTokens = tokenize(message);
  if (!queryTokens.length) {
    return "Please enter a message so I can help with placements, coding, aptitude, resume, or interview prep.";
  }

  let best = null;
  let bestScore = 0;

  for (const item of searchablePatterns) {
    const score = scoreMatch(queryTokens, item.tokens);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < 0.18 || !best.responsePool.length) {
    return "I can help with resume analysis, coding practice, aptitude prep, interview questions, and career roadmap. Ask me something specific in one line.";
  }

  const index = Math.floor(Math.random() * best.responsePool.length);
  return best.responsePool[index];
}

loadIntents();

router.get("/health", (_req, res) => {
  res.json({ ok: true, intents: intents.length, patterns: searchablePatterns.length });
});

router.post("/chat", (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const response = getLocalResponse(message);
    return res.json({ response, source: "node-local-chatbot" });
  } catch (error) {
    console.error("[chatbot] /chat error:", error.message);
    return res.status(500).json({ error: "Chat service failed" });
  }
});

export default router;
