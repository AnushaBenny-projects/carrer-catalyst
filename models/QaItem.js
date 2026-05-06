// Purpose: Defines the QaItem data model and its MongoDB schema.
import mongoose from "mongoose";

const qaItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["technical", "hr"],
      required: true,
      index: true,
    },
    role: {
      type: String,
      default: "",
      index: true,
    },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    source: { type: String, default: "groq" },
  },
  { timestamps: true }
);

qaItemSchema.index({ type: 1, createdAt: -1 });
qaItemSchema.index({ type: 1, role: 1, createdAt: -1 });

export default mongoose.model("QaItem", qaItemSchema);
