// Purpose: Defines the Roadmap data model and its MongoDB schema.
import mongoose from "mongoose";

const RoadmapStageSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    focus: { type: String, default: "" },
    topics: [{ type: String }],
    projects: [{ type: String }],
    outcomes: [{ type: String }]
  },
  { _id: false }
);

const RoadmapSchema = new mongoose.Schema(
  {
    area: { type: String, required: true, index: true },
    role: { type: String, required: true, index: true },
    level: { type: String, default: "Entry" },
    summary: { type: String, default: "" },
    skills: [{ type: String }],
    tools: [{ type: String }],
    roadmap: [RoadmapStageSchema]
  },
  { timestamps: true }
);

const Roadmap = mongoose.model("Roadmap", RoadmapSchema);

export default Roadmap;
