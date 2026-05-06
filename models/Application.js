// Purpose: Defines the Application data model and its MongoDB schema.
import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidateName: { type: String, default: "" },
    candidateEmail: { type: String, default: "" },
    candidateResume: { type: String, default: "" },
    formAnswers: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        value: { type: String, default: "" },
      },
    ],
    status: { type: String, default: "Pending" },
    recruiterMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
