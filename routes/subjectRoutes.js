// Purpose: Defines API routes for the subjectRoutes feature area.
import express from "express";
import Subject from "../models/Subject.js";
import {
  generateTheory,
  generateMCQs,
  generateGfgTopics
} from "../services/groqService.js";

const router = express.Router();

function desiredMcqCount(subjectName) {
  return 25;
}

function subjectTitle(subjectName) {
  return String(subjectName || "subject")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fallbackTheory(subjectName) {
  const title = subjectTitle(subjectName);
  return (
    `${title} is an important topic for placements and interviews. ` +
    `Start by understanding the basic definition, core concepts, and common terminology used in ${title}. ` +
    `Then learn how the concept works internally, what inputs and outputs it handles, and where it is used in real systems. ` +
    `After fundamentals, focus on common interview scenarios, trade-offs, time and space complexity where relevant, and practical examples. ` +
    `Finally, revise edge cases and frequently asked interview questions to build confidence for placement rounds.`
  );
}

function fallbackGfgTopics(subjectName) {
  const title = subjectTitle(subjectName);
  return [
    { title: `${title} Tutorial`, gfgLink: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(`${title} tutorial`)}` },
    { title: `${title} Interview Questions`, gfgLink: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(`${title} interview questions`)}` },
    { title: `${title} Practice Problems`, gfgLink: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(`${title} practice`)}` },
  ];
}

function curatedJavaMcqs() {
  return [
    {
      question: "What is the primary role of the JVM in Java?",
      options: ["A. Compile Java source code to bytecode", "B. Execute bytecode and provide runtime services", "C. Manage only database connections", "D. Replace the JDK entirely"],
      correctAnswer: "B",
      explanation: "JVM executes bytecode and handles runtime tasks like memory management and garbage collection.",
    },
    {
      question: "Which component contains both development tools and JRE?",
      options: ["A. JDK", "B. JVM", "C. JRE", "D. JIT only"],
      correctAnswer: "A",
      explanation: "JDK includes tools like javac and also contains JRE.",
    },
    {
      question: "Why is String immutable in Java?",
      options: ["A. To reduce syntax complexity", "B. For security, thread-safety, and string pool optimization", "C. To avoid heap usage", "D. Because JVM cannot modify objects"],
      correctAnswer: "B",
      explanation: "Immutability enables safe sharing, improves caching via string pool, and supports security.",
    },
    {
      question: "What is the key difference between == and equals() for objects?",
      options: ["A. Both compare object content always", "B. == compares references; equals() compares logical equality", "C. == compares strings only", "D. equals() compares memory addresses only"],
      correctAnswer: "B",
      explanation: "For objects, == checks reference identity, while equals() checks value/logic (if overridden).",
    },
    {
      question: "What must be done when equals() is overridden?",
      options: ["A. Override toString() only", "B. Override hashCode() consistently", "C. Make class final", "D. Remove constructors"],
      correctAnswer: "B",
      explanation: "equals and hashCode contract requires equal objects to have same hashCode.",
    },
    {
      question: "Which collection preserves insertion order and allows duplicates?",
      options: ["A. HashSet", "B. TreeSet", "C. ArrayList", "D. HashMap"],
      correctAnswer: "C",
      explanation: "ArrayList is ordered by insertion and allows duplicate values.",
    },
    {
      question: "When is LinkedList generally preferred over ArrayList?",
      options: ["A. Frequent random index access", "B. Frequent insertions/deletions in middle", "C. Minimal memory usage", "D. Primitive-only storage"],
      correctAnswer: "B",
      explanation: "LinkedList can be advantageous for frequent insert/delete operations compared to shifting array elements.",
    },
    {
      question: "What happens if HashMap has many collisions and keys are Comparable?",
      options: ["A. Data is lost", "B. Buckets may transform to balanced trees in modern Java", "C. Map becomes synchronized", "D. Hashing is disabled"],
      correctAnswer: "B",
      explanation: "In Java 8+, heavily collided buckets can be treeified to improve worst-case lookup performance.",
    },
    {
      question: "Which map is thread-safe for concurrent updates without global locking?",
      options: ["A. HashMap", "B. TreeMap", "C. ConcurrentHashMap", "D. LinkedHashMap"],
      correctAnswer: "C",
      explanation: "ConcurrentHashMap is designed for high-concurrency access patterns.",
    },
    {
      question: "Which keyword ensures visibility of variable updates across threads?",
      options: ["A. final", "B. static", "C. volatile", "D. transient"],
      correctAnswer: "C",
      explanation: "volatile ensures reads/writes go to main memory for visibility between threads.",
    },
    {
      question: "What does synchronized provide?",
      options: ["A. Compile-time optimization only", "B. Mutual exclusion and happens-before memory guarantees", "C. Automatic exception handling", "D. Async execution"],
      correctAnswer: "B",
      explanation: "synchronized controls critical section access and ensures memory consistency effects.",
    },
    {
      question: "Which statement about checked exceptions is correct?",
      options: ["A. Must be handled or declared", "B. Are ignored by compiler", "C. Inherit from Error", "D. Cannot be custom"],
      correctAnswer: "A",
      explanation: "Checked exceptions require handling with try/catch or declaration via throws.",
    },
    {
      question: "What is the main benefit of try-with-resources?",
      options: ["A. Faster loops", "B. Automatic closing of AutoCloseable resources", "C. Avoids all runtime exceptions", "D. Makes code multithreaded"],
      correctAnswer: "B",
      explanation: "try-with-resources automatically closes resources, reducing leaks.",
    },
    {
      question: "What is method overloading?",
      options: ["A. Same method signature in subclass", "B. Same method name with different parameter list", "C. Changing return type only", "D. Private method hiding"],
      correctAnswer: "B",
      explanation: "Overloading means same method name but different parameters in same class/scope.",
    },
    {
      question: "What is method overriding?",
      options: ["A. Different method names in parent-child classes", "B. Redefining superclass method with same signature in subclass", "C. Overloading constructors", "D. Hiding fields only"],
      correctAnswer: "B",
      explanation: "Overriding provides runtime polymorphism by redefining inherited behavior.",
    },
    {
      question: "Which access modifier allows visibility only within the same package?",
      options: ["A. public", "B. private", "C. protected", "D. default (no modifier)"],
      correctAnswer: "D",
      explanation: "Default access (package-private) allows access within same package.",
    },
    {
      question: "Can a class implement multiple interfaces in Java?",
      options: ["A. No", "B. Yes", "C. Only if abstract", "D. Only in Java 7"],
      correctAnswer: "B",
      explanation: "Java supports multiple interface implementation by a class.",
    },
    {
      question: "What is the purpose of the final keyword on a variable?",
      options: ["A. Makes it globally visible", "B. Prevents reassignment after initialization", "C. Makes it thread-safe automatically", "D. Moves it to stack"],
      correctAnswer: "B",
      explanation: "final variable cannot be reassigned once initialized.",
    },
    {
      question: "Which memory area typically stores object instances?",
      options: ["A. Stack", "B. Heap", "C. Method parameter table only", "D. CPU register"],
      correctAnswer: "B",
      explanation: "Objects are allocated on heap memory in Java.",
    },
    {
      question: "What is garbage collection in Java?",
      options: ["A. Manual memory free() calls", "B. Automatic reclamation of unreachable objects", "C. File cleanup only", "D. Thread scheduling"],
      correctAnswer: "B",
      explanation: "GC automatically frees memory used by objects no longer reachable.",
    },
    {
      question: "What does Stream API primarily help with?",
      options: ["A. Network socket handling only", "B. Declarative processing of collections (filter/map/reduce)", "C. JVM startup tuning", "D. File compression"],
      correctAnswer: "B",
      explanation: "Streams support functional-style operations for collection processing.",
    },
    {
      question: "Which interface represents a sequence of characters in Java?",
      options: ["A. CharSequence", "B. Serializable", "C. Iterable", "D. Comparable"],
      correctAnswer: "A",
      explanation: "CharSequence is the common interface for String, StringBuilder, etc.",
    },
    {
      question: "What is the time complexity of average HashMap get() operation?",
      options: ["A. O(log n)", "B. O(n)", "C. O(1)", "D. O(n log n)"],
      correctAnswer: "C",
      explanation: "Average-case lookup in HashMap is O(1), though collisions can degrade performance.",
    },
    {
      question: "Which feature was introduced to support lambda expressions?",
      options: ["A. Anonymous classes only", "B. Functional interfaces", "C. Reflection", "D. Serialization"],
      correctAnswer: "B",
      explanation: "Functional interfaces with single abstract method are core for lambda expressions.",
    },
    {
      question: "Why is StringBuilder preferred over String for repeated concatenation?",
      options: ["A. StringBuilder is immutable", "B. StringBuilder avoids creating many intermediate immutable objects", "C. StringBuilder uses less syntax", "D. String cannot hold text"],
      correctAnswer: "B",
      explanation: "StringBuilder is mutable and efficient for repeated modifications.",
    },
  ];
}

function fallbackMcqs(subjectName, count = 25) {
  const key = String(subjectName || "").trim().toLowerCase();
  if (key === "java") {
    return curatedJavaMcqs().slice(0, count);
  }

  const title = subjectTitle(subjectName);
  const base = [
    {
      question: `Which statement best describes ${title}?`,
      options: [
        `A. ${title} focuses only on syntax with no practical use`,
        `B. ${title} is used only in academic exams`,
        `C. ${title} includes concepts important for real-world systems and interviews`,
        `D. ${title} is unrelated to software engineering`,
      ],
      correctAnswer: "C",
      explanation: `${title} is widely used in practical development and interview preparation.`,
    },
    {
      question: `What is the best way to prepare ${title} for placements?`,
      options: [
        "A. Memorize definitions without examples",
        "B. Study concepts, solve problems, and revise interview questions",
        "C. Read only one short article",
        "D. Avoid practicing MCQs",
      ],
      correctAnswer: "B",
      explanation: "Interview preparation is strongest when theory, problem solving, and revision are combined.",
    },
    {
      question: `Why are edge cases important in ${title}?`,
      options: [
        "A. They are never asked in interviews",
        "B. They only matter in UI design",
        "C. They help validate correctness and robustness",
        "D. They reduce the need for testing",
      ],
      correctAnswer: "C",
      explanation: "Edge cases reveal failures in logic and improve reliability in interviews and real projects.",
    },
  ];

  return base.slice(0, Math.min(count, base.length));
}

function validTheory(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validGfgTopics(value) {
  return Array.isArray(value) && value.length > 0;
}

function validMcqs(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasLowQualityMcqs(mcqs = []) {
  const bad = /best way to prepare|practice set|study strategy|motivation/i;
  return (mcqs || []).some((item) => bad.test(String(item?.question || "")));
}

/* ================= GET SUBJECT ================= */
router.get("/:subject", async (req, res) => {
  try {
    const subjectName = req.params.subject;
    const forceRefresh = String(req.query?.refresh || "").toLowerCase() === "true" || String(req.query?.refresh || "") === "1";

    if (!subjectName) {
      return res.status(400).json({ error: "Subject is required" });
    }

    let subject = await Subject.findOne({ subject: subjectName });
    const mcqTarget = desiredMcqCount(subjectName);

    // If not exists, generate and store. If generation fails partially, fallback safely.
    if (!subject || forceRefresh) {
      const [theoryResult, mcqResult, gfgResult] = await Promise.allSettled([
        generateTheory(subjectName),
        generateMCQs(subjectName, mcqTarget),
        generateGfgTopics(subjectName),
      ]);

      const theory =
        theoryResult.status === "fulfilled" && validTheory(theoryResult.value)
          ? theoryResult.value
          : fallbackTheory(subjectName);

      const mcqs =
        mcqResult.status === "fulfilled" && validMcqs(mcqResult.value)
          ? mcqResult.value
          : fallbackMcqs(subjectName, mcqTarget);

      const gfgTopics =
        gfgResult.status === "fulfilled" && validGfgTopics(gfgResult.value)
          ? gfgResult.value
          : fallbackGfgTopics(subjectName);

      if (!subject) {
        subject = await Subject.create({
          subject: subjectName,
          theory,
          gfgTopics,
          mcqs,
        });
      } else {
        subject.theory = theory;
        subject.gfgTopics = gfgTopics;
        subject.mcqs = mcqs;
        await subject.save();
      }
    } else {
      // Backfill old/incomplete subject docs so frontend never stays empty.
      let changed = false;
      if (!validTheory(subject.theory)) {
        subject.theory = fallbackTheory(subjectName);
        changed = true;
      }
      if (!validGfgTopics(subject.gfgTopics)) {
        subject.gfgTopics = fallbackGfgTopics(subjectName);
        changed = true;
      }
      if (!validMcqs(subject.mcqs)) {
        subject.mcqs = fallbackMcqs(subjectName, mcqTarget);
        changed = true;
      } else if (subject.mcqs.length < mcqTarget || hasLowQualityMcqs(subject.mcqs)) {
        try {
          const generated = await generateMCQs(subjectName, mcqTarget);
          if (validMcqs(generated) && generated.length >= mcqTarget) {
            subject.mcqs = generated;
            changed = true;
          }
        } catch {
          if (subject.mcqs.length < mcqTarget) {
            subject.mcqs = fallbackMcqs(subjectName, mcqTarget);
            changed = true;
          }
        }
      }
      if (changed) {
        await subject.save();
      }
    }

    res.json(subject);
  } catch (err) {
    console.error("Subject API Error:", err.message);
    res.status(500).json({ error: "Failed to load subject" });
  }
});

export default router;
