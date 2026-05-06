// Purpose: Defines the Question data model and its MongoDB schema.
import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  topic: String,
  question: String,
  options: [String],
  correct_answer: String,
  explanation: String
});

export default mongoose.model("Question", QuestionSchema);
