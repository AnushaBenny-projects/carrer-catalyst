// Purpose: Defines API routes for the codingRoutes feature area.
import express from "express";
import CodingProgress from "../models/CodingProgress.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const roadmapSections = [
  {
    id: "basics",
    title: "Step 1: Learn Basics",
    topics: ["Math Basics", "Patterns", "Basic Hashing"],
    problems: [
      { id: "lc-9", title: "Palindrome Number", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/palindrome-number/" },
      { id: "lc-7", title: "Reverse Integer", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/reverse-integer/" },
      { id: "lc-273", title: "Integer to English Words", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/integer-to-english-words/" },
    ],
  },
  {
    id: "sorting",
    title: "Step 2: Sorting Techniques",
    topics: ["Selection/Bubble/Insertion", "Merge Sort", "Quick Sort"],
    problems: [
      { id: "lc-88", title: "Merge Sorted Array", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/merge-sorted-array/" },
      { id: "lc-912", title: "Sort an Array", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/sort-an-array/" },
      { id: "lc-315", title: "Count of Smaller Numbers After Self", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/count-of-smaller-numbers-after-self/" },
    ],
  },
  {
    id: "arrays",
    title: "Step 3: Arrays",
    topics: ["Easy Arrays", "Sorting", "Two Pointers", "Sliding Window"],
    problems: [
      { id: "lc-1", title: "Two Sum", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/two-sum/" },
      { id: "lc-15", title: "3Sum", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/3sum/" },
      { id: "lc-42", title: "Trapping Rain Water", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/trapping-rain-water/" },
    ],
  },
  {
    id: "binary-search",
    title: "Step 4: Binary Search",
    topics: ["1D Binary Search", "2D Binary Search", "Search on Answers"],
    problems: [
      { id: "lc-704", title: "Binary Search", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/binary-search/" },
      { id: "lc-33", title: "Search in Rotated Sorted Array", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/search-in-rotated-sorted-array/" },
      { id: "lc-4", title: "Median of Two Sorted Arrays", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/median-of-two-sorted-arrays/" },
    ],
  },
  {
    id: "strings",
    title: "Step 5: Strings",
    topics: ["Basic String Ops", "Pattern Matching", "Hashing"],
    problems: [
      { id: "lc-14", title: "Longest Common Prefix", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/longest-common-prefix/" },
      { id: "lc-3", title: "Longest Substring Without Repeating Characters", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
      { id: "lc-76", title: "Minimum Window Substring", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/minimum-window-substring/" },
    ],
  },
  {
    id: "linked-list",
    title: "Step 6: Linked List",
    topics: ["Singly Linked List", "Doubly Linked List", "Fast/Slow Pointers"],
    problems: [
      { id: "lc-206", title: "Reverse Linked List", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/reverse-linked-list/" },
      { id: "lc-2", title: "Add Two Numbers", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/add-two-numbers/" },
      { id: "lc-25", title: "Reverse Nodes in k-Group", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/reverse-nodes-in-k-group/" },
    ],
  },
  {
    id: "recursion",
    title: "Step 7: Recursion & Backtracking",
    topics: ["Recursion Basics", "Subsequences", "Backtracking"],
    problems: [
      { id: "lc-509", title: "Fibonacci Number", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/fibonacci-number/" },
      { id: "lc-46", title: "Permutations", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/permutations/" },
      { id: "lc-51", title: "N-Queens", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/n-queens/" },
    ],
  },
  {
    id: "bit-manipulation",
    title: "Step 8: Bit Manipulation",
    topics: ["Bit Basics", "Bitmasking", "XOR Tricks"],
    problems: [
      { id: "lc-136", title: "Single Number", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/single-number/" },
      { id: "lc-78", title: "Subsets", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/subsets/" },
      { id: "lc-421", title: "Maximum XOR of Two Numbers in an Array", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/" },
    ],
  },
  {
    id: "stack-queue",
    title: "Step 9: Stack and Queue",
    topics: ["Monotonic Stack", "Implementation", "Expression Problems"],
    problems: [
      { id: "lc-20", title: "Valid Parentheses", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/valid-parentheses/" },
      { id: "lc-739", title: "Daily Temperatures", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/daily-temperatures/" },
      { id: "lc-84", title: "Largest Rectangle in Histogram", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/largest-rectangle-in-histogram/" },
    ],
  },
  {
    id: "sliding-window",
    title: "Step 10: Sliding Window & Two Pointers",
    topics: ["Fixed Window", "Variable Window", "Two Pointers"],
    problems: [
      { id: "lc-643", title: "Maximum Average Subarray I", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
      { id: "lc-567", title: "Permutation in String", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/permutation-in-string/" },
      { id: "lc-239", title: "Sliding Window Maximum", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/sliding-window-maximum/" },
    ],
  },
  {
    id: "heaps",
    title: "Step 11: Heaps / Priority Queue",
    topics: ["Heap Basics", "Top K", "Heap on Lists"],
    problems: [
      { id: "lc-1046", title: "Last Stone Weight", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/last-stone-weight/" },
      { id: "lc-347", title: "Top K Frequent Elements", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/top-k-frequent-elements/" },
      { id: "lc-23", title: "Merge k Sorted Lists", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/merge-k-sorted-lists/" },
    ],
  },
  {
    id: "greedy",
    title: "Step 12: Greedy Algorithms",
    topics: ["Intervals", "Scheduling", "Optimization"],
    problems: [
      { id: "lc-455", title: "Assign Cookies", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/assign-cookies/" },
      { id: "lc-55", title: "Jump Game", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/jump-game/" },
      { id: "lc-135", title: "Candy", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/candy/" },
    ],
  },
  {
    id: "trees",
    title: "Step 13: Binary Trees",
    topics: ["Traversals", "Binary Search Tree", "Tree DFS/BFS"],
    problems: [
      { id: "lc-94", title: "Binary Tree Inorder Traversal", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/binary-tree-inorder-traversal/" },
      { id: "lc-102", title: "Binary Tree Level Order Traversal", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
      { id: "lc-124", title: "Binary Tree Maximum Path Sum", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/binary-tree-maximum-path-sum/" },
    ],
  },
  {
    id: "bst",
    title: "Step 14: Binary Search Trees",
    topics: ["BST Basics", "Validation", "Advanced BST Ops"],
    problems: [
      { id: "lc-700", title: "Search in a Binary Search Tree", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/" },
      { id: "lc-98", title: "Validate Binary Search Tree", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/validate-binary-search-tree/" },
      { id: "lc-99", title: "Recover Binary Search Tree", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/recover-binary-search-tree/" },
    ],
  },
  {
    id: "graphs",
    title: "Step 15: Graphs",
    topics: ["BFS", "DFS", "Topological Sort", "Shortest Path"],
    problems: [
      { id: "lc-1971", title: "Find if Path Exists in Graph", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/find-if-path-exists-in-graph/" },
      { id: "lc-200", title: "Number of Islands", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/number-of-islands/" },
      { id: "lc-127", title: "Word Ladder", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/word-ladder/" },
    ],
  },
  {
    id: "dp",
    title: "Step 16: Dynamic Programming",
    topics: ["1D DP", "2D DP", "Subsequence DP", "LIS Pattern"],
    problems: [
      { id: "lc-70", title: "Climbing Stairs", difficulty: "Easy", platform: "LeetCode", url: "https://leetcode.com/problems/climbing-stairs/" },
      { id: "lc-322", title: "Coin Change", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/coin-change/" },
      { id: "lc-72", title: "Edit Distance", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/edit-distance/" },
    ],
  },
  {
    id: "tries",
    title: "Step 17: Tries",
    topics: ["Trie Basics", "Word Dictionary", "Advanced Trie Search"],
    problems: [
      { id: "lc-208", title: "Implement Trie (Prefix Tree)", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/implement-trie-prefix-tree/" },
      { id: "lc-211", title: "Design Add and Search Words Data Structure", difficulty: "Medium", platform: "LeetCode", url: "https://leetcode.com/problems/design-add-and-search-words-data-structure/" },
      { id: "lc-212", title: "Word Search II", difficulty: "Hard", platform: "LeetCode", url: "https://leetcode.com/problems/word-search-ii/" },
    ],
  },
];

function createSummary(progressMap) {
  let total = 0;
  let solved = 0;
  let inProgress = 0;

  for (const section of roadmapSections) {
    for (const problem of section.problems) {
      total += 1;
      const status = progressMap[problem.id] || "todo";
      if (status === "solved") solved += 1;
      if (status === "in_progress") inProgress += 1;
    }
  }

  const todo = total - solved - inProgress;
  const completion = total === 0 ? 0 : Math.round((solved / total) * 100);
  return { total, solved, inProgress, todo, completion };
}

router.get("/roadmap", async (_req, res) => {
  return res.json({
    roadmapTitle: "Striver-style A2Z DSA Roadmap",
    source: "https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z",
    sections: roadmapSections,
  });
});

router.get("/progress/me", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "student") {
      return res.status(403).json({ message: "Only students can access coding progress" });
    }

    const primaryLearnerId = `id:${req.user.id}`;
    const possibleIds = [primaryLearnerId];
    if (req.user?.email) possibleIds.push(`email:${String(req.user.email).toLowerCase()}`);

    const progressDoc = await CodingProgress.findOne({ learnerId: { $in: possibleIds } }).lean();
    const progressMap = {};

    if (progressDoc?.entries?.length) {
      for (const item of progressDoc.entries) progressMap[item.problemId] = item.status;
    }

    return res.json({
      learnerId: primaryLearnerId,
      progress: progressMap,
      summary: createSummary(progressMap),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load progress", error: err.message });
  }
});

router.put("/progress/me", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "student") {
      return res.status(403).json({ message: "Only students can update coding progress" });
    }

    const primaryLearnerId = `id:${req.user.id}`;
    const possibleIds = [primaryLearnerId];
    if (req.user?.email) possibleIds.push(`email:${String(req.user.email).toLowerCase()}`);

    const { problemId, status, notes = "" } = req.body || {};
    if (!problemId) return res.status(400).json({ message: "problemId is required" });
    if (!["todo", "in_progress", "solved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let progressDoc = await CodingProgress.findOne({ learnerId: { $in: possibleIds } });
    if (!progressDoc) {
      progressDoc = new CodingProgress({ learnerId: primaryLearnerId, entries: [] });
    } else if (progressDoc.learnerId !== primaryLearnerId) {
      progressDoc.learnerId = primaryLearnerId;
    }

    const existing = progressDoc.entries.find((entry) => entry.problemId === problemId);
    if (existing) {
      existing.status = status;
      existing.notes = notes;
      existing.updatedAt = new Date();
    } else {
      progressDoc.entries.push({ problemId, status, notes, updatedAt: new Date() });
    }

    await progressDoc.save();

    const progressMap = {};
    for (const item of progressDoc.entries) progressMap[item.problemId] = item.status;

    return res.json({
      message: "Progress updated",
      learnerId: primaryLearnerId,
      progress: progressMap,
      summary: createSummary(progressMap),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update progress", error: err.message });
  }
});

router.get("/progress/:learnerId", async (req, res) => {
  try {
    const learnerId = decodeURIComponent((req.params.learnerId || "").trim());
    if (!learnerId) return res.status(400).json({ message: "learnerId is required" });

    const progressDoc = await CodingProgress.findOne({ learnerId }).lean();
    const progressMap = {};

    if (progressDoc?.entries?.length) {
      for (const item of progressDoc.entries) progressMap[item.problemId] = item.status;
    }

    return res.json({
      learnerId,
      progress: progressMap,
      summary: createSummary(progressMap),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load progress", error: err.message });
  }
});

router.put("/progress/:learnerId", async (req, res) => {
  try {
    const learnerId = decodeURIComponent((req.params.learnerId || "").trim());
    const { problemId, status, notes = "" } = req.body || {};

    if (!learnerId || !problemId) {
      return res.status(400).json({ message: "learnerId and problemId are required" });
    }
    if (!["todo", "in_progress", "solved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    let progressDoc = await CodingProgress.findOne({ learnerId });
    if (!progressDoc) progressDoc = new CodingProgress({ learnerId, entries: [] });

    const existing = progressDoc.entries.find((entry) => entry.problemId === problemId);
    if (existing) {
      existing.status = status;
      existing.notes = notes;
      existing.updatedAt = new Date();
    } else {
      progressDoc.entries.push({ problemId, status, notes, updatedAt: new Date() });
    }

    await progressDoc.save();

    const progressMap = {};
    for (const item of progressDoc.entries) progressMap[item.problemId] = item.status;

    return res.json({
      message: "Progress updated",
      learnerId,
      progress: progressMap,
      summary: createSummary(progressMap),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update progress", error: err.message });
  }
});

export default router;
