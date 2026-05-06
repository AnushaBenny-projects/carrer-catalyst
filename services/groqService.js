// Purpose: Contains service logic used by backend routes.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

/* ================= CORE ================= */
async function callGroq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/* ================= TEXT CLEANER ================= */
function cleanText(text = "") {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#+\s?/g, "")
    .replace(/^- /gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/Theory|Practice MCQs|GeeksforGeeks/gi, "")
    .trim();
}

/* ================= THEORY ================= */
export async function generateTheory(subject) {
  const prompt = `
You are a senior computer science professor.

Explain the subject "${subject}" for placement preparation and explain like a GeeksforGeeks tutorial.

FOLLOW THIS ORDER STRICTLY:
1. Simple definition for beginners
2. Why this concept is needed
3. Internal working step by step
4. Diagram explanations in words (flow, structure, states)
5. Advanced concepts and edge cases
6. Interview perspectives and real-world usage

RULES:
- Start from basics to advanced
- Explain diagrams ONLY using words
- Do NOT include MCQs
- No markdown
- No bullet points
- Plain paragraphs only
`;

  const raw = await callGroq(prompt);
  return cleanText(raw);
}

/* ================= GFG TOPICS ================= */
export async function generateGfgTopics(subject) {
  const prompt = `
You are a senior placement trainer.

Generate ONLY the important main topics for "${subject}"
that are commonly asked in campus placements.

For EACH topic:
- Give the exact GeeksforGeeks article URL
- Follow standard GFG tutorial structure

STRICT RULES:
- Output ONLY valid JSON
- NO explanations
- NO markdown
- NO extra text

FORMAT:
[
  {
    "title": "Topic name",
    "gfgLink": "https://www.geeksforgeeks.org/..."
  }
]
`;

  const raw = await callGroq(prompt);
  const match = raw.match(/\[[\s\S]*\]/);

  if (!match) {
    throw new Error("Invalid GFG topic JSON from Groq");
  }

  return JSON.parse(match[0]);
}

function mcqFocusHint(subject) {
  const s = String(subject || "").toLowerCase();
  if (s === "java") {
    return "Focus heavily on Java fundamentals, OOP, collections, exceptions, multithreading, JVM/JRE/JDK, streams, garbage collection, and commonly asked Java interview patterns. Avoid generic preparation advice.";
  }
  return "Cover beginner to advanced interview-level concepts relevant to placements.";
}

const LOW_QUALITY_PATTERNS = [
  /best way to prepare/i,
  /practice set/i,
  /placement interviews?/i,
  /study strategy/i,
  /revision strategy/i,
  /how should you use/i,
];

const JAVA_KEYWORDS = [
  "jvm",
  "jre",
  "jdk",
  "string",
  "immutable",
  "collection",
  "arraylist",
  "linkedlist",
  "hashmap",
  "concurrenthashmap",
  "thread",
  "synchronized",
  "volatile",
  "exception",
  "try-with-resources",
  "interface",
  "abstract class",
  "overloading",
  "overriding",
  "equals",
  "hashcode",
  "stream api",
  "garbage collection",
  "classloader",
];

function parseJsonArray(raw) {
  const match = String(raw || "").match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function looksLowQuality(question) {
  return LOW_QUALITY_PATTERNS.some((pattern) => pattern.test(question || ""));
}

function normalizeMcqItem(item) {
  const question = cleanText(item?.question || "");
  const correct = cleanText(item?.correct || "");
  const wrong = Array.isArray(item?.wrong) ? item.wrong.map((v) => cleanText(v)).filter(Boolean) : [];
  const explanation = cleanText(item?.explanation || "");

  if (!question || !correct || wrong.length < 3 || !explanation) return null;
  if (looksLowQuality(question)) return null;
  if (question.length < 12 || explanation.length < 12) return null;

  const uniqueWrong = Array.from(new Set(wrong)).slice(0, 3);
  if (uniqueWrong.length < 3) return null;
  if (uniqueWrong.includes(correct)) return null;

  const options = [...uniqueWrong, correct];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const correctIndex = options.indexOf(correct);
  const correctAnswer = ["A", "B", "C", "D"][correctIndex];

  return {
    question,
    options: options.map((o, i) => `${["A", "B", "C", "D"][i]}. ${o}`),
    correctAnswer,
    explanation,
  };
}

function enforceSubjectQuality(subject, items, count) {
  const key = String(subject || "").trim().toLowerCase();
  if (key !== "java") return items.slice(0, count);

  const javaSpecific = items.filter((item) => {
    const text = `${item.question} ${item.explanation}`.toLowerCase();
    return JAVA_KEYWORDS.some((kw) => text.includes(kw));
  });

  return javaSpecific.slice(0, count);
}

function questionKey(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeMcqs(items = []) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = questionKey(item?.question || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

/* ================= MCQs ================= */
export async function generateMCQs(subject, count = 25) {
  const prompt = `
Generate exactly ${count} MCQs for ${subject}.

RULES:
- Basic to advanced difficulty
- Conceptual + diagram-based
- Provide ONE correct answer text
- Provide THREE wrong answer texts
- ${mcqFocusHint(subject)}
- Do NOT generate study-strategy or motivation questions
- Return ONLY valid JSON

FORMAT:
[
  {
    "question": "string",
    "correct": "correct answer",
    "wrong": ["wrong1", "wrong2", "wrong3"],
    "explanation": "short reason"
  }
]
`;

  let collected = [];

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const raw = await callGroq(prompt);
    const parsed = parseJsonArray(raw);
    const normalized = parsed.map(normalizeMcqItem).filter(Boolean);
    const filtered = enforceSubjectQuality(subject, normalized, count * 2);
    collected = dedupeMcqs([...collected, ...filtered]);
    if (collected.length >= count) return collected.slice(0, count);
  }

  if (collected.length >= Math.max(8, Math.floor(count * 0.6))) {
    return collected.slice(0, count);
  }

  throw new Error("MCQ generation quality insufficient");
}
