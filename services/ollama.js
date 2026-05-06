// Purpose: Contains service logic used by backend routes.
/**
 * Ollama MCQ Generator with Self-Verification
 * Placement-level aptitude questions
 * Prevents wrong answers from being stored
 * Uses native fetch (Node 18+)
 */

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = process.env.OLLAMA_MODEL || "mistral";

const VERBAL_TOPICS = [
  "reading comprehension",
  "error spotting",
  "sentence correction",
  "fill in the blanks",
  "sentence completion",
  "para jumbles",
  "synonyms",
  "antonyms",
  "one word substitution",
  "idioms and phrases",
  "active passive voice",
  "direct indirect speech",
  "tenses",
  "articles",
  "prepositions",
  "subject verb agreement",
  "vocabulary",
  "spelling",
];

/**
 * Call Ollama once
 */
async function callOllama(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      temperature: 0.25,
      stream: false
    })
  });

  if (!res.ok) {
    throw new Error(`Ollama API error: ${res.status}`);
  }

  return res.json();
}

function isVerbalTopic(topic) {
  const normalized = String(topic || "").toLowerCase().trim();
  return VERBAL_TOPICS.some((t) => normalized.includes(t));
}

function normalizeGeneratedQuestion(questionObj) {
  if (!questionObj || typeof questionObj !== "object") return null;

  const question = String(questionObj.question || "").trim();
  const explanation = String(questionObj.explanation || "").trim();
  const options = Array.isArray(questionObj.options)
    ? questionObj.options.map((o) => String(o || "").trim()).filter(Boolean)
    : [];
  const correctAnswer = String(questionObj.correct_answer || "").trim();

  if (!question || !explanation || options.length !== 4 || !correctAnswer) return null;
  if (!options.includes(correctAnswer)) return null;

  return {
    question,
    options,
    correct_answer: correctAnswer,
    explanation,
  };
}

/**
 * Extract JSON safely from Ollama response
 */
function extractJSON(text) {
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Verify the generated answer using LLM itself
 */
export async function verifyQuestion(questionObj) {
  const verifyPrompt = `
You are verifying an aptitude MCQ for placement exams.

Question:
${questionObj.question}

Options:
${questionObj.options.join("\n")}

Proposed correct answer:
${questionObj.correct_answer}

Task:
- Solve the question independently
- Check if the proposed correct answer is correct
- Respond ONLY with one word:
VALID or INVALID
`;

  const verifyRes = await callOllama(verifyPrompt);
  const verdict = String(verifyRes.response || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return verdict === "VALID";
}

/**
 * Generate ONE verified placement-level MCQ
 */
export async function generateQuestion(topic) {
  const verbal = isVerbalTopic(topic);
  const generationPrompt = `
You are an expert aptitude question setter for
engineering campus placements
(TCS, Infosys, Accenture, Cognizant, Wipro).

Generate ONE placement-level ${verbal ? "verbal ability" : "aptitude"} MCQ.

Topic: ${topic}

Rules:
- Difficulty: Medium to Hard
- Keep the question strictly within the given topic
- ${verbal ? "Use grammar, vocabulary, comprehension, or sentence-order reasoning (no math)." : "Use logical or numerical reasoning where relevant."}
- Options must be distinct and unambiguous
- ONLY one option must be correct
- Solve internally before answering
- Ensure the correct answer EXACTLY matches one option
- Do NOT guess

Return ONLY valid JSON:

{
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "exact option text",
  "explanation": "brief reasoning (1–2 lines)"
}
`;

  // Try multiple times until a verified question is produced
  for (let attempt = 1; attempt <= 5; attempt++) {
    const genRes = await callOllama(generationPrompt);
    const questionObj = normalizeGeneratedQuestion(extractJSON(genRes.response));

    if (!questionObj) {
      continue; // malformed output
    }

    // Self verification step
    const isValid = await verifyQuestion(questionObj);
    if (!isValid) {
      continue; // discard incorrect question
    }

    // ✅ Verified & safe question
    return questionObj;
  }

  throw new Error("Failed to generate a verified question after multiple attempts");
}
