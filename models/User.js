// Purpose: Defines the User data model and its MongoDB schema.
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "recruiter"], required: true },
    profilePic: { type: String },
    dob: { type: Date },
    course: { type: String },
    resume: { type: String },
    status: { type: String, enum: ["Pending", "Approved", "Blocked"], default: "Pending" },
    skills: { type: [String], default: [] },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
