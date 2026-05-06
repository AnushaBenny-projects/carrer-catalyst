// Purpose: Defines API routes for the questionRoutes feature area.
const express = require("express");
const Question = require("../models/Question");
const generateQuestion = require("../services/ollama");
const CONCEPTS = require("../utils/concepts");

const router = express.Router();

/* 🔥 MAIN ENDPOINT */
router.get("/:topic", async (req, res) => {
  const topic = req.params.topic;

  let questions = await Question.find({ topic }).limit(10);

  if (questions.length < 10) {
    const needed = 10 - questions.length;

    for (let i = 0; i < needed; i++) {
      const conceptList = CONCEPTS[topic];
      if (!conceptList) break;

      const concept = conceptList[Math.floor(Math.random() * conceptList.length)];
      const q = await generateQuestion(topic, concept);

      const saved = await Question.create({
        topic,
        concept,
        difficulty: "Medium",
        ...q
      });

      questions.push(saved);
    }
  }

  res.json({ topic, questions });
});

module.exports = router;
