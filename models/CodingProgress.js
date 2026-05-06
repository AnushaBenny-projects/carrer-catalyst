// Purpose: Defines the CodingProgress data model and its MongoDB schema.
import mongoose from "mongoose";

const ProblemProgressSchema = new mongoose.Schema(
  {
    problemId: { type: String, required: true },
    status: {
      type: String,
      enum: ["todo", "in_progress", "solved"],
      default: "todo",
    },
    notes: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CodingProgressSchema = new mongoose.Schema(
  {
    learnerId: { type: String, required: true, unique: true, index: true },
    entries: { type: [ProblemProgressSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("CodingProgress", CodingProgressSchema);
