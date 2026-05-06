// Purpose: Defines API routes for the aptitudeRoutes feature area.
import express from "express";
import Question from "../models/Question.js";
import { verifyQuestion } from "../services/ollama.js";

const router = express.Router();
const TARGET_COUNT = 10;
const GENERATION_TIMEOUT_MS = 15000;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_GENERATION_ATTEMPTS = 40;

const GENERIC_FALLBACK = [
  {
    question: "A train 120 m long crosses a pole in 6 seconds. What is its speed?",
    options: ["20 m/s", "15 m/s", "18 m/s", "25 m/s"],
    correct_answer: "20 m/s",
    explanation: "Speed = distance/time = 120/6 = 20 m/s.",
  },
  {
    question: "If the ratio of boys to girls in a class is 3:2 and total students are 50, how many girls are there?",
    options: ["20", "25", "30", "15"],
    correct_answer: "20",
    explanation: "Total parts = 5, each part = 50/5 = 10, girls = 2 x 10 = 20.",
  },
  {
    question: "A sum becomes Rs. 1210 in 2 years at 10% simple interest. What is the principal?",
    options: ["Rs. 1000", "Rs. 1100", "Rs. 900", "Rs. 950"],
    correct_answer: "Rs. 1000",
    explanation: "Amount = P(1 + rt) = P(1 + 0.1x2) = 1.2P, so P = 1210/1.2.",
  },
  {
    question: "Find the next number: 2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "46"],
    correct_answer: "42",
    explanation: "Pattern is n(n+1): 1x2, 2x3, 3x4, 4x5, 5x6, so next is 6x7 = 42.",
  },
  {
    question: "If 15% of a number is 45, what is the number?",
    options: ["250", "300", "275", "225"],
    correct_answer: "300",
    explanation: "Number = 45/0.15 = 300.",
  },
];

const VERBAL_FALLBACK = [
  {
    question: "Arrange the sentences to form a coherent paragraph: P) She revised every chapter twice. Q) The exam was scheduled for Monday. R) As a result, she felt confident. S) She created a strict weekend study plan.",
    options: ["Q-S-P-R", "S-Q-P-R", "Q-P-S-R", "S-P-Q-R"],
    correct_answer: "Q-S-P-R",
    explanation: "The timeline is exam announcement, planning, execution, then result/confidence.",
  },
  {
    question: "Choose the best opening sentence for a paragraph about time management.",
    options: [
      "Time management is the process of planning tasks to use available hours effectively.",
      "Many people enjoy watching movies on weekends.",
      "Cloud computing has transformed storage systems.",
      "Photosynthesis happens in plant leaves.",
    ],
    correct_answer: "Time management is the process of planning tasks to use available hours effectively.",
    explanation: "It introduces the core topic clearly and sets context for the paragraph.",
  },
  {
    question: "Identify the sentence that should come third in the paragraph: (1) The team missed two deadlines. (2) The manager reviewed the workflow bottlenecks. (3) ______ (4) In the next sprint, delivery improved significantly.",
    options: [
      "She introduced weekly progress checkpoints.",
      "The cafeteria served a new menu.",
      "The office parking area was expanded.",
      "The weather changed suddenly.",
    ],
    correct_answer: "She introduced weekly progress checkpoints.",
    explanation: "It logically follows the problem analysis and leads to improved delivery.",
  },
  {
    question: "Which sequence best forms a meaningful paragraph? A) Therefore, customer satisfaction increased. B) The support team analyzed common complaints. C) They created faster response templates. D) Ticket resolution time dropped by 30%.",
    options: ["B-C-D-A", "C-B-A-D", "D-A-B-C", "A-B-C-D"],
    correct_answer: "B-C-D-A",
    explanation: "Diagnosis comes first, then action, measured result, and final outcome.",
  },
  {
    question: "Choose the most suitable concluding sentence for a paragraph on consistent practice.",
    options: [
      "Regular practice converts weak areas into reliable strengths over time.",
      "The traffic near the stadium was heavy yesterday.",
      "Many laptops now include high-refresh displays.",
      "The museum closes at six in the evening.",
    ],
    correct_answer: "Regular practice converts weak areas into reliable strengths over time.",
    explanation: "It summarizes the idea and provides a clear concluding insight.",
  },
];

const SENTENCE_COMPLETION_FALLBACK = [
  {
    question: "The manager asked the team to ______ the report before submitting it to the client.",
    options: ["review", "reviews", "reviewed", "reviewing"],
    correct_answer: "review",
    explanation: "After 'asked the team to', the base form of the verb is required.",
  },
  {
    question: "If she had left earlier, she ______ the train.",
    options: ["would catch", "would have caught", "will catch", "has caught"],
    correct_answer: "would have caught",
    explanation: "This is a third conditional sentence: if + past perfect, would have + past participle.",
  },
  {
    question: "Neither the students nor the teacher ______ aware of the sudden schedule change.",
    options: ["were", "are", "is", "have been"],
    correct_answer: "is",
    explanation: "With 'neither...nor', the verb agrees with the nearest subject; 'teacher' is singular, so 'is' fits here.",
  },
  {
    question: "The proposal was rejected because it failed to ______ the main concerns of the board.",
    options: ["address", "addresses", "addressed", "addressing"],
    correct_answer: "address",
    explanation: "After 'failed to', the base form verb is used.",
  },
  {
    question: "By the time the meeting started, the analysts ______ all the required data.",
    options: ["compile", "compiled", "had compiled", "have compiling"],
    correct_answer: "had compiled",
    explanation: "Past perfect is used for an action completed before another past action.",
  },
];

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

function isValidQuestion(item) {
  const options = Array.isArray(item?.options) ? item.options.map((o) => String(o || "").trim()) : [];
  const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
  const question = String(item?.question || "").trim();
  const explanation = String(item?.explanation || "").trim();
  const correct = String(item?.correct_answer || "").trim();

  return (
    question.length >= 20 &&
    options.length === 4 &&
    uniqueOptions.size === 4 &&
    correct &&
    options.includes(correct) &&
    explanation.length >= 20
  );
}

function isVerbalTopic(topic) {
  const t = String(topic || "").toLowerCase().trim();
  return VERBAL_TOPICS.some((v) => t.includes(v));
}

function isTopicRelevantQuestion(topic, item) {
  const verbal = isVerbalTopic(topic);
  const qText = String(item?.question || "").toLowerCase();
  const allText = [qText, ...(item?.options || []).map((o) => String(o || "").toLowerCase())].join(" ");

  if (!verbal) return true;

  const quantHints = [
    "train",
    "speed",
    "distance",
    "km",
    "m/s",
    "simple interest",
    "compound interest",
    "ratio",
    "percentage",
    "probability",
    "algebra",
    "number series",
  ];

  if (quantHints.some((h) => allText.includes(h))) return false;

  if (topic.toLowerCase().includes("para jumbles")) {
    const paraHints = ["arrange", "sequence", "paragraph", "sentence", "coherent", "order"];
    return paraHints.some((h) => allText.includes(h));
  }

  if (topic.toLowerCase().includes("sentence completion")) {
    const hasBlank =
      qText.includes("_____") ||
      qText.includes("___") ||
      qText.includes("(blank)") ||
      qText.includes("fill in");
    return hasBlank;
  }

  return true;
}

function normalizeQuestionText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchGroqVerbalQuestion(topic) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const topicName = String(topic || "Verbal Ability").trim();
  const lowerTopic = topicName.toLowerCase();
  const paraRule = lowerTopic.includes("para jumbles")
    ? "For Para Jumbles: give 4 labeled sentence units (P,Q,R,S) in the question and options must be 4 order sequences like 'Q-S-P-R'."
    : "Question must strictly match the topic and be verbal-only (no numbers-based aptitude).";

  const quantitativeTopicHints = [
    "number system", "percentages", "ratio", "averages", "profit and loss", "simple interest",
    "compound interest", "time and work", "time speed distance", "mixtures", "data interpretation",
    "permutation", "probability", "algebra", "mensuration", "statistics", "problems on trains",
    "lcm", "hcf", "ages"
  ];
  const logicalTopicHints = [
    "number series", "alphabet series", "coding decoding", "direction", "blood relations",
    "seating arrangement", "puzzles", "syllogisms", "statement", "data sufficiency",
    "input output", "analogy", "classification", "cause and effect", "venn", "logical deduction"
  ];

  let mode = "verbal";
  if (quantitativeTopicHints.some((x) => lowerTopic.includes(x))) mode = "quant";
  else if (logicalTopicHints.some((x) => lowerTopic.includes(x))) mode = "logical";

  const topicSpecificRule = lowerTopic.includes("sentence completion")
    ? "For Sentence Completion: the question must contain exactly one clear blank (use '_____'). Options must be candidate words/phrases to fill the blank, with one best answer by grammar/meaning."
    : lowerTopic.includes("error spotting")
      ? "For Error Spotting: provide one sentence where only one option correctly identifies the error segment."
      : lowerTopic.includes("synonym")
        ? "For Synonyms: ask the meaning of a target word and provide 4 single-word/short-phrase choices."
        : lowerTopic.includes("antonym")
          ? "For Antonyms: ask opposite meaning of a target word and provide 4 single-word/short-phrase choices."
          : "";

  const styleRule =
    mode === "quant"
      ? "Create one realistic placement-style quantitative MCQ. Use correct arithmetic and plausible close distractors."
      : mode === "logical"
        ? "Create one logical reasoning MCQ with clear inference constraints and one unambiguous answer."
        : "Create one verbal ability MCQ with clear grammar/comprehension focus and one unambiguous answer.";

  const messages = [
    {
      role: "system",
      content:
        "You are a placement aptitude trainer. Return ONLY valid JSON object with key 'item'. " +
        "item must have fields: question, options, correct_answer, explanation. " +
        "options must be array of exactly 4 strings. " +
        "correct_answer must exactly equal one option string. " +
        "Explanation must be concise and correct. No markdown. No extra text.",
    },
    {
      role: "user",
      content:
        `Generate ONE high-quality placement MCQ for topic: ${topicName}. ` +
        "Difficulty: medium to hard. " +
        `${styleRule} ` +
        `${topicSpecificRule} ` +
        `${paraRule} ` +
        "Avoid vague or trick wording. Ensure the question is factually correct and exam-appropriate.",
    },
  ];

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No Groq content");

  const normalized = String(content)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error("Failed to parse Groq aptitude JSON");
  }

  const item = parsed?.item || parsed;

  // Verify with Ollama for higher quality
  try {
    const isValid = await verifyQuestion({
      question: item.question,
      options: item.options,
      correct_answer: item.correct_answer
    });
    if (!isValid) {
      throw new Error("Question verification failed with Ollama");
    }
  } catch (verifyError) {
    console.warn("Ollama verification failed, proceeding with Groq question:", verifyError.message);
  }

  return {
    question: String(item?.question || "").trim(),
    options: Array.isArray(item?.options) ? item.options.map((o) => String(o || "").trim()) : [],
    correct_answer: String(item?.correct_answer || "").trim(),
    explanation: String(item?.explanation || "").trim(),
  };
}

function buildFallbackQuestions(topic, count) {
  let baseItems = GENERIC_FALLBACK;
  const lowerTopic = String(topic || "").toLowerCase();

  if (lowerTopic.includes("sentence completion")) {
    baseItems = SENTENCE_COMPLETION_FALLBACK;
  } else if (isVerbalTopic(topic)) {
    baseItems = VERBAL_FALLBACK;
  }

  return Array.from({ length: count }, (_, idx) => {
    const base = baseItems[idx % baseItems.length];
    return {
      topic: topic || "General Aptitude",
      question: base.question,
      options: base.options,
      correct_answer: base.correct_answer,
      explanation: base.explanation,
      source: "local_fallback",
    };
  });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Question generation timed out")), timeoutMs)
    ),
  ]);
}

router.get("/:topic", async (req, res) => {
  const decodedTopic = decodeURIComponent(req.params.topic || "").trim();
  const topic = decodedTopic || "General Aptitude";

  try {
    const existing = await Question.find({ topic }).limit(TARGET_COUNT * 4);
    const seen = new Set();
    const questions = [];

    for (const q of existing) {
      if (!isValidQuestion(q) || !isTopicRelevantQuestion(topic, q)) continue;
      const key = normalizeQuestionText(q.question);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      questions.push(q);
      if (questions.length >= TARGET_COUNT) break;
    }

    let generated = 0;
    let attempts = 0;
    const generatedKeys = new Set();
    while (questions.length < TARGET_COUNT && attempts < MAX_GENERATION_ATTEMPTS) {
      attempts += 1;
      try {
        const q = await withTimeout(
          fetchGroqVerbalQuestion(topic),
          GENERATION_TIMEOUT_MS
        );
        if (!isValidQuestion(q) || !isTopicRelevantQuestion(topic, q)) continue;
        const key = normalizeQuestionText(q.question);
        if (!key || seen.has(key) || generatedKeys.has(key)) continue;

        const saved = await Question.create({ topic, ...q });
        seen.add(key);
        generatedKeys.add(key);
        questions.push(saved);
        generated += 1;
      } catch {
        continue;
      }
    }

    if (questions.length < TARGET_COUNT) {
      if (questions.length > 0) {
        return res.json({
          topic,
          questions,
          warning: "Returning best available high-quality questions for now",
        });
      }

      const fallback = buildFallbackQuestions(topic, TARGET_COUNT);
      return res.json({
        topic,
        questions: fallback,
        warning: "Using fallback questions",
      });
    }

    return res.json({ topic, questions });
  } catch (err) {
    const fallback = buildFallbackQuestions(topic, TARGET_COUNT);
    return res.json({
      topic,
      questions: fallback,
      warning: err.message || "Using fallback questions",
    });
  }
});

export default router;
