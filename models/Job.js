// Purpose: Defines the Job data model and its MongoDB schema.
import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true },
    salary: { type: String },
    description: { type: String, required: true },
    status: { type: String, default: "Active" },

    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationForm: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, enum: ["text", "textarea", "number", "date", "select"], default: "text" },
        required: { type: Boolean, default: false },
        options: { type: [String], default: [] },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
