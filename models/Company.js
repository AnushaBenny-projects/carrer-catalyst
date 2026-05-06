// Purpose: Defines the Company data model and its MongoDB schema.
import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    name: String,
    website: String,
    description: String
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
