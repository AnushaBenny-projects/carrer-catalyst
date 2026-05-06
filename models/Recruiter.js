// Purpose: Defines the Recruiter data model and its MongoDB schema.
import mongoose from "mongoose";

const recruiterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  companyName: { type: String },
  companyWebsite: { type: String },
  companyLogo: { type: String },
});

export default mongoose.model("Recruiter", recruiterSchema);
