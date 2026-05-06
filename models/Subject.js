// Purpose: Defines the Subject data model and its MongoDB schema.
import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  subject: {
    type: String,
    unique: true,
    required: true
  },

  // Long theory text
  theory: {
    type: String
  },

  // GFG topic list (THIS WAS MISSING)
  gfgTopics: [
    {
      title: String,
      gfgLink: String
    }
  ],

  // MCQs
  mcqs: [
    {
      question: String,
      options: [String],
      correctAnswer: String,
      explanation: String
    }
  ]
});

export default mongoose.model("Subject", subjectSchema);
