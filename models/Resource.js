// Purpose: Defines the Resource data model and its MongoDB schema.
import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, default: "General", trim: true },
    companyName: { type: String, default: "", trim: true },
    salaryOffered: { type: String, default: "", trim: true },
    applySource: { type: String, default: "", trim: true },
    offerStatus: { type: String, default: "", trim: true },
    experience: { type: String, default: "Average", trim: true },
    experienceDetails: { type: String, default: "", trim: true },
    interviewQuestions: { type: String, default: "", trim: true },
    fileName: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploaderName: { type: String, default: "" },
    uploaderEmail: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    approvedBy: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Resource", resourceSchema);
