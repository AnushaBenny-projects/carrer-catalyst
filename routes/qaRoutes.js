// Purpose: Defines API routes for the qaRoutes feature area.
import express from "express";
import QaItem from "../models/QaItem.js";

const router = express.Router();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CACHE_HOURS = 24;
const TECH_DEFAULT_COUNT = 60;
const HR_DEFAULT_COUNT = 150;
const TECH_PREFILL_DEFAULT_COUNT = 180;
const MAX_ALLOWED_COUNT = 200;
const MAX_TOPUP_ATTEMPTS = 5;
const GROQ_BATCH_SIZE = 20;

const TECH_TOPIC_BLUEPRINT = [
  {
    key: "python",
    title: "Python interview questions",
    focus:
      "Python fundamentals, data types, list/dict/set comprehensions, functions, decorators, generators, OOP, exceptions, file handling, and time complexity",
    weight: 3,
  },
  {
    key: "java",
    title: "Java interview questions",
    focus:
      "Java fundamentals, JVM/JRE/JDK, OOP, collections, exception handling, multithreading, streams, and memory model",
    weight: 3,
  },
  {
    key: "dsa",
    title: "Data structures and algorithms",
    focus:
      "Arrays, strings, linked lists, stacks, queues, trees, graphs, recursion, sorting, searching, hashing, dynamic programming, greedy, and backtracking",
    weight: 4,
  },
  {
    key: "core_cs",
    title: "Core CS fundamentals",
    focus:
      "Operating systems, DBMS, SQL, computer networks, OOP principles, and software engineering",
    weight: 3,
  },
  {
    key: "gfg_important",
    title: "GeeksforGeeks important placement topics",
    focus:
      "Most asked coding/interview topics from GeeksforGeeks style preparation: arrays, strings, two pointers, sliding window, hashing, trees, graphs, dynamic programming, greedy, and bit manipulation",
    weight: 4,
  },
];

function buildPrompt(type, count, role = "") {
  const cleanRole = normalizeRole(role);
  const domain =
    type === "hr"
      ? "HR, behavioral, situational, and communication interviews"
      : "technical interview questions in computer science and software engineering with strong coverage of Python, Java, DSA, and GeeksforGeeks important placement topics";
  const roleLine = cleanRole
    ? `Target role: ${cleanRole}. Questions must be specific to this role and real interview expectations for this role. `
    : "";

  return [
    {
      role: "system",
      content:
        "You are an interview coach. Provide accurate, correct answers. " +
        `Return exactly ${count} items as JSON. Each item must have fields: question, answer. ` +
        "Answers must be a single paragraph with clear, correct explanations and no bullet points. " +
        'Output must be a valid JSON object with this exact shape: {"items":[{"question":"...","answer":"..."}]}. ' +
        "Do not include markdown or extra text outside JSON.",
    },
    {
      role: "user",
      content:
        `Generate ${count} ${domain} questions and answers. ` +
        roleLine +
        "Answers must be accurate and suitable for students preparing for placements.",
    },
  ];
}

function buildTechnicalTopicPrompt(topic, count, role = "") {
  const cleanRole = normalizeRole(role);
  const roleLine = cleanRole
    ? `Target role: ${cleanRole}. Connect each question to practical responsibilities for this role. `
    : "";
  return [
    {
      role: "system",
      content:
        "You are an interview coach. Provide accurate, correct answers. " +
        `Return exactly ${count} items as JSON. Each item must have fields: question, answer. ` +
        "Answers must be a single paragraph with clear, correct explanations and no bullet points. " +
        'Output must be a valid JSON object with this exact shape: {"items":[{"question":"...","answer":"..."}]}. ' +
        "Questions must be unique and placement-ready. Do not include markdown or extra text outside JSON.",
    },
    {
      role: "user",
      content:
        `Generate ${count} unique technical interview Q/A items for: ${topic.title}. ` +
        roleLine +
        `Focus areas: ${topic.focus}. ` +
        "Keep difficulty mix beginner to advanced and avoid repeating the same concept wording.",
    },
  ];
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function shuffleCopy(items = []) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomItems(items = [], count = TECH_DEFAULT_COUNT) {
  if (!Array.isArray(items) || items.length <= count) return items;
  return shuffleCopy(items).slice(0, count);
}

function buildRoleFallbackItems(type, role, count) {
  const cleanRole = normalizeRole(role);
  if (!cleanRole) return [];

  const techTemplates = [
    {
      question: `How would you design a 90-day preparation plan to become job-ready for the ${cleanRole} role?`,
      answer:
        `For ${cleanRole}, split the plan into fundamentals, applied projects, and interview simulation. In the first month, build strong foundations in core concepts expected for ${cleanRole}. In the second month, complete at least two role-relevant projects with measurable outcomes and documented trade-offs. In the final month, practice timed coding or system/problem rounds, revise weak areas, and prepare concise explanations for design choices, debugging strategy, and real-world constraints.`,
    },
    {
      question: `What technical skills are most important for ${cleanRole}, and how would you demonstrate them in an interview?`,
      answer:
        `For ${cleanRole}, prioritize role-critical fundamentals, practical tooling, and problem-solving depth. Demonstrate this with concrete project stories: explain architecture, decisions, edge cases, failure handling, performance considerations, and testing approach. Interviewers look for clarity of reasoning, not just tool names, so connect each skill to how you used it to solve a business or engineering problem.`,
    },
    {
      question: `How would you explain one challenging project relevant to ${cleanRole} in a structured way?`,
      answer:
        `Use a simple structure: problem context, constraints, solution architecture, implementation details, and impact. For a ${cleanRole} interview, include trade-offs you considered, how you validated correctness, what failed initially, and what you optimized later. End with measurable outcomes such as latency reduction, accuracy improvement, reliability gains, or developer productivity impact.`,
    },
    {
      question: `What are common technical interview mistakes candidates make for ${cleanRole}, and how can they avoid them?`,
      answer:
        `Frequent mistakes for ${cleanRole} include shallow fundamentals, overemphasis on buzzwords, and inability to explain implementation decisions. Candidates should avoid this by practicing first-principles explanations, revising core concepts, and preparing deep dives for 2 to 3 projects. In interviews, think aloud, clarify assumptions, and validate edge cases before finalizing the answer.`,
    },
    {
      question: `How would you prepare role-specific mock interview questions for ${cleanRole}?`,
      answer:
        `Create a balanced set for ${cleanRole}: fundamentals, practical scenarios, debugging or optimization, and project-based discussion. Practice concise answers under time limits, then review gaps after each session. Track recurring weaknesses and convert them into focused revision tasks, so each mock directly improves your readiness for real interviews.`,
    },
  ];

  const hrTemplates = [
    {
      question: `Why are you interested in the ${cleanRole} role, and what value will you bring in your first six months?`,
      answer:
        `I am interested in ${cleanRole} because it matches my strengths in structured problem solving and practical execution. In the first six months, I would focus on understanding team workflows, delivering reliable role-specific tasks, and improving speed without compromising quality. I would add value by communicating clearly, learning quickly from feedback, and consistently converting requirements into measurable outcomes.`,
    },
    {
      question: `Describe a situation where you handled pressure while preparing for ${cleanRole} interviews.`,
      answer:
        `During preparation for ${cleanRole}, I handled pressure by breaking a large preparation goal into weekly milestones and focusing on high-impact topics first. I tracked progress daily, reviewed mistakes systematically, and adjusted the plan instead of reacting emotionally. This approach kept me consistent, improved confidence, and helped me perform better in mock interview conditions.`,
    },
    {
      question: `How do you handle feedback when your approach for a ${cleanRole} task is not accepted?`,
      answer:
        `If feedback challenges my approach for a ${cleanRole} task, I first clarify the underlying concern and success criteria. I compare alternatives objectively, update the solution based on team priorities, and communicate the revised plan clearly. I treat feedback as a way to improve decision quality and alignment, not as a personal setback.`,
    },
    {
      question: `Tell me about a conflict in teamwork and what you learned that helps in a ${cleanRole} position.`,
      answer:
        `In a team conflict, I learned that assumptions and unclear ownership create most friction. I resolved it by aligning on goals, responsibilities, and delivery checkpoints. For a ${cleanRole} position, this taught me to communicate early, document decisions, and validate understanding continuously so collaboration remains productive and deadlines stay realistic.`,
    },
    {
      question: `Where do you see yourself growing after joining as ${cleanRole}?`,
      answer:
        `After joining as ${cleanRole}, I see my growth in three stages: first, mastering core execution expectations; second, taking ownership of complex problems; and third, contributing to process improvements and mentoring newer teammates. My focus is to grow into a dependable contributor who combines technical quality with strong collaboration and accountability.`,
    },
  ];

  const base = type === "technical" ? techTemplates : hrTemplates;
  return Array.from({ length: count }, (_, idx) => base[idx % base.length]).map((item) => ({
    ...item,
    source: "local_role_fallback",
  }));
}

function fillRoleSet(existingItems, type, role, count) {
  const current = dedupeItems(existingItems || [], count);
  if (!normalizeRole(role)) return current.slice(0, count);
  if (current.length >= count) return current.slice(0, count);

  const needed = count - current.length;
  const extra = buildRoleFallbackItems(type, role, needed);
  return dedupeItems([...current, ...extra], count);
}

function questionKey(item) {
  const base = normalizeText(item?.question);
  if (!base) return "";

  // Remove common opener variants so semantically identical HR questions dedupe.
  return base
    .replace(/^(can you|could you|would you|will you|please)\s+/g, "")
    .replace(/^(tell me|walk me)\s+/g, "")
    .replace(/^(about|through)\s+/g, "")
    .replace(/^what is\s+/g, "whats ")
    .trim();
}

function technicalCoverageOk(items, role = "") {
  if (normalizeRole(role)) {
    return (items || []).length > 0;
  }

  const normalized = (items || []).map((item) =>
    normalizeText(`${item?.question || ""} ${item?.answer || ""}`)
  );

  if (!normalized.length) return false;

  const pythonCount = normalized.filter((text) => text.includes("python")).length;
  const javaCount = normalized.filter((text) => text.includes("java")).length;
  const minLangCoverage = Math.max(2, Math.floor((items.length || 0) * 0.08));

  const gfgSignals = [
    "dynamic programming",
    "two pointers",
    "sliding window",
    "bit manipulation",
    "greedy",
    "backtracking",
    "hashing",
    "graph",
    "tree",
  ];

  const gfgHits = gfgSignals.filter((signal) =>
    normalized.some((text) => text.includes(signal))
  ).length;

  return pythonCount >= minLangCoverage && javaCount >= minLangCoverage && gfgHits >= 3;
}

function pickBalancedTechnicalItems(items, count, role = "") {
  if (normalizeRole(role)) {
    return pickRandomItems(dedupeItems(items || [], count * 6), count);
  }

  const unique = dedupeItems(items || [], Math.max((items || []).length, count));
  if (!unique.length) return [];

  const selected = [];
  const used = new Set();
  const minLangCoverage = Math.max(2, Math.floor(count * 0.08));

  const addBy = (predicate, limit) => {
    for (const item of shuffleCopy(unique)) {
      if (selected.length >= count) break;
      if (limit <= 0) break;
      const key = questionKey(item);
      if (!key || used.has(key) || !predicate(item)) continue;
      selected.push(item);
      used.add(key);
      limit -= 1;
    }
  };

  const textOf = (item) => normalizeText(`${item?.question || ""} ${item?.answer || ""}`);
  addBy((item) => textOf(item).includes("java"), minLangCoverage);
  addBy((item) => textOf(item).includes("python"), minLangCoverage);

  for (const item of shuffleCopy(unique)) {
    if (selected.length >= count) break;
    const key = questionKey(item);
    if (!key || used.has(key)) continue;
    selected.push(item);
    used.add(key);
  }

  return shuffleCopy(selected).slice(0, count);
}

function dedupeItems(items, count = TECH_DEFAULT_COUNT) {
  const seen = new Set();
  const unique = [];

  for (const item of items || []) {
    const qKey = questionKey(item);
    if (!qKey || !normalizeText(item?.answer) || seen.has(qKey)) {
      continue;
    }

    seen.add(qKey);
    unique.push(item);

    if (unique.length >= count) break;
  }

  return unique;
}

function sanitizeItems(items, count) {
  if (!Array.isArray(items)) return [];

  const cleaned = items
    .map((item) => ({
      question: typeof item?.question === "string" ? item.question.trim() : "",
      answer: typeof item?.answer === "string" ? item.answer.trim() : "",
    }))
    .filter((item) => item.question && item.answer);

  return dedupeItems(cleaned, count);
}

function buildWeightedTopicPlan(count) {
  if (count <= 0) return [];

  const totalWeight = TECH_TOPIC_BLUEPRINT.reduce((sum, topic) => sum + topic.weight, 0);
  const minOneEach = Math.min(count, TECH_TOPIC_BLUEPRINT.length);

  const plan = TECH_TOPIC_BLUEPRINT.map((topic, idx) => ({
    ...topic,
    count: idx < minOneEach ? 1 : 0,
  }));

  let remaining = count - minOneEach;
  if (remaining <= 0) return plan.filter((topic) => topic.count > 0);

  const baseAlloc = plan.map((topic) => Math.floor((remaining * topic.weight) / totalWeight));
  let allocated = 0;
  for (let i = 0; i < plan.length; i += 1) {
    plan[i].count += baseAlloc[i];
    allocated += baseAlloc[i];
  }

  let leftover = remaining - allocated;
  let cursor = 0;
  while (leftover > 0) {
    plan[cursor % plan.length].count += 1;
    leftover -= 1;
    cursor += 1;
  }

  return plan.filter((topic) => topic.count > 0);
}

async function collectItemsWithMessages(buildMessages, targetCount) {
  const collected = [];
  let remaining = targetCount;
  let batchCalls = 0;
  const maxCalls = Math.ceil(targetCount / GROQ_BATCH_SIZE) + 2;

  while (remaining > 0 && batchCalls < maxCalls) {
    const batchSize = Math.min(remaining, GROQ_BATCH_SIZE);
    const rawItems = await fetchGroq(buildMessages(batchSize));
    const validBatch = sanitizeItems(rawItems, batchSize);
    if (!validBatch.length) break;
    collected.push(...validBatch);
    remaining = targetCount - collected.length;
    batchCalls += 1;
  }

  return dedupeItems(collected, targetCount);
}

async function collectTechnicalTopicItems(targetCount, role = "") {
  const plan = buildWeightedTopicPlan(targetCount);
  const all = [];

  for (const topic of plan) {
    const topicItems = await collectItemsWithMessages(
      (batchSize) => buildTechnicalTopicPrompt(topic, batchSize, role),
      topic.count
    );
    all.push(...topicItems);
  }

  return dedupeItems(all, targetCount);
}

async function getCachedItems(type, count, role = "") {
  const since = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000);
  const cleanRole = normalizeRole(role);
  const query = {
    type,
    createdAt: { $gte: since },
    ...(cleanRole
      ? { role: cleanRole }
      : { $or: [{ role: "" }, { role: null }, { role: { $exists: false } }] }),
  };

  const recent = await QaItem.find(query)
    .sort({ createdAt: -1 })
    .limit(count * 6)
    .lean();

  const unique = dedupeItems(recent, count * 6);
  return pickRandomItems(unique, count);
}

async function fetchGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 2200,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content from Groq");
  }

  const normalized = String(content)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    const arrayMatch = normalized.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {}
    }
    throw new Error("Failed to parse Groq JSON");
  }

  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.questions)) return parsed.questions;
  throw new Error("Unexpected Groq JSON shape");
}

async function saveUniqueItems(type, items, role = "") {
  if (!items.length) return;
  const cleanRole = normalizeRole(role);

  const existing = await QaItem.find({
    type,
    role: cleanRole,
    question: { $in: items.map((item) => item.question) },
  })
    .select("question answer")
    .lean();

  const existingKeys = new Set(existing.map((item) => questionKey(item)));

  const toSave = items
    .filter((item) => !existingKeys.has(questionKey(item)))
    .map((item) => ({
      type,
      role: cleanRole,
      question: item.question,
      answer: item.answer,
      source: "groq",
    }));

  if (toSave.length) {
    await QaItem.insertMany(toSave, { ordered: false });
  }
}

async function getLatestUnique(type, count, role = "") {
  const cleanRole = normalizeRole(role);
  const latest = await QaItem.find(
    cleanRole
      ? { type, role: cleanRole }
      : { type, $or: [{ role: "" }, { role: null }, { role: { $exists: false } }] }
  )
    .sort({ createdAt: -1 })
    .limit(count * 12)
    .lean();

  if (type === "technical") {
    return pickBalancedTechnicalItems(latest, count, cleanRole);
  }
  const unique = dedupeItems(latest, count * 12);
  return pickRandomItems(unique, count);
}

async function handleQa(req, res, type) {
  try {
    const count = resolveCount(req, type);
    const role = type === "technical" ? "" : normalizeRole(req.query?.role);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);

    const cached = await getCachedItems(type, count, role);
    const cachedCoverageOk = type !== "technical" || technicalCoverageOk(cached, role);
    if (cached.length >= count && cachedCoverageOk) {
      return res.json({ items: cached, cached: true, provider: "cache", role });
    }

    // If role-specific generation is requested but Groq is unavailable,
    // fall back to generic bank so practice does not fail.
    if (role && !hasGroq) {
      const roleOnly = await getLatestUnique(type, count, role);
      const roleFirstItems = fillRoleSet(roleOnly, type, role, count);
      if (roleFirstItems.length > 0) {
        return res.json({
          items: roleFirstItems,
          cached: true,
          provider: "local_role_fallback",
          role,
          warning: "Role-specific generation unavailable. Showing role-focused fallback questions.",
        });
      }
    }

    for (let attempt = 0; attempt < MAX_TOPUP_ATTEMPTS; attempt++) {
      const current = await getLatestUnique(type, count, role);
      const currentCoverageOk = type !== "technical" || technicalCoverageOk(current, role);
      const missing = count - current.length;
      if (missing <= 0 && currentCoverageOk) break;

      const targetTopup =
        missing > 0
          ? missing
          : Math.min(Math.max(Math.floor(count / 3), 10), GROQ_BATCH_SIZE * 2);

      let validItems =
        type === "technical"
          ? await collectTechnicalTopicItems(targetTopup, role)
          : [];

      if (validItems.length < targetTopup) {
        const genericTopup = await collectItemsWithMessages(
          (batchSize) => buildPrompt(type, batchSize, role),
          targetTopup - validItems.length
        );
        validItems = dedupeItems([...validItems, ...genericTopup], targetTopup);
      }

      await saveUniqueItems(type, validItems, role);

      const latestUnique = await getLatestUnique(type, count, role);
      const latestCoverageOk = type !== "technical" || technicalCoverageOk(latestUnique, role);
      if (latestUnique.length >= count && latestCoverageOk) {
        return res.json({ items: latestUnique, cached: false, provider: "groq", role });
      }
    }

    const latestUnique = await getLatestUnique(type, count, role);
    if (latestUnique.length > 0) {
      const coverageWarning =
        type === "technical" && !technicalCoverageOk(latestUnique, role)
          ? "Technical coverage still limited; retry prefill/technical for stronger Python/Java/GFG mix."
          : undefined;
      return res.json({ items: latestUnique, cached: false, provider: "cache", warning: coverageWarning, role });
    }

    if (role) {
      const roleOnly = await getLatestUnique(type, count, role);
      const roleFirstItems = fillRoleSet(roleOnly, type, role, count);
      if (roleFirstItems.length > 0) {
        return res.json({
          items: roleFirstItems,
          cached: true,
          provider: "local_role_fallback",
          role,
          warning: "Role-specific questions are still building. Showing role-focused fallback questions.",
        });
      }
    }

    return res.status(503).json({
      message: "No Q/A available from Groq and no cached items found",
    });
  } catch (err) {
    const count = resolveCount(req, type);
    const role = type === "technical" ? "" : normalizeRole(req.query?.role);
    const fallback = await getLatestUnique(type, count, role);

    if (fallback.length > 0) {
      return res.json({ items: fallback, cached: true, provider: "cache", warning: "Using stored items", role });
    }

    if (role) {
      const roleOnly = await getLatestUnique(type, count, role);
      const roleFirstItems = fillRoleSet(roleOnly, type, role, count);
      if (roleFirstItems.length > 0) {
        return res.json({
          items: roleFirstItems,
          cached: true,
          provider: "local_role_fallback",
          role,
          warning: "Role-specific generation failed. Showing role-focused fallback questions.",
        });
      }
    }

    return res.status(500).json({ message: err.message || "Failed to load Q/A" });
  }
}

router.get("/technical", async (req, res) => {
  return handleQa(req, res, "technical");
});

router.get("/hr", async (req, res) => {
  return handleQa(req, res, "hr");
});

router.post("/prefill", async (req, res) => {
  try {
    const [techItems, hrItems] = await Promise.all([
      collectTechnicalTopicItems(TECH_DEFAULT_COUNT),
      collectItemsWithMessages((batchSize) => buildPrompt("hr", batchSize, ""), HR_DEFAULT_COUNT),
    ]);

    const validTechItems = sanitizeItems(techItems, TECH_DEFAULT_COUNT);
    const validHrItems = sanitizeItems(hrItems, HR_DEFAULT_COUNT);

    await saveUniqueItems("technical", validTechItems, "");
    await saveUniqueItems("hr", validHrItems, "");

    return res.json({
      message: "Prefilled Q/A items",
      created: validTechItems.length + validHrItems.length,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Prefill failed" });
  }
});

router.post("/prefill/technical", async (req, res) => {
  try {
    const requested = Number.parseInt(req.query?.count, 10);
    const count = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 1), MAX_ALLOWED_COUNT)
      : TECH_PREFILL_DEFAULT_COUNT;

    const generated = await collectTechnicalTopicItems(count);
    const validItems = sanitizeItems(generated, count);

    await saveUniqueItems("technical", validItems, "");

    const available = await getLatestUnique("technical", count, "");
    return res.json({
      message: "Technical Q/A generated and stored",
      requested: count,
      generated: validItems.length,
      available: available.length,
      topics: TECH_TOPIC_BLUEPRINT.map((topic) => topic.key),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Technical prefill failed" });
  }
});

function resolveCount(req, type) {
  const defaultCount = type === "hr" ? HR_DEFAULT_COUNT : TECH_DEFAULT_COUNT;
  const requested = Number.parseInt(req.query?.count, 10);

  if (!Number.isFinite(requested)) return defaultCount;
  if (requested < 1) return 1;
  return Math.min(requested, MAX_ALLOWED_COUNT);
}

export default router;
