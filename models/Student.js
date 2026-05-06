// Purpose: Defines the Student data model and its MongoDB schema.
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  skills: [String],
});

export default mongoose.model("Student", studentSchema);
