// Purpose: Defines API routes for the jobRoutes feature area.
import express from "express";
import jwt from "jsonwebtoken";
import Job from "../models/Job.js";
import Recruiter from "../models/Recruiter.js";

const router = express.Router();

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

router.get("/public", async (_req, res) => {
  try {
    const jobs = await Job.find({ status: "Active" }).sort({ createdAt: -1 }).lean();

    const recruiterIds = jobs.map((job) => job.recruiter).filter(Boolean);
    const recruiters = await Recruiter.find({ userId: { $in: recruiterIds } }).lean();
    const recruiterByUserId = new Map(recruiters.map((rec) => [String(rec.userId), rec]));

    const enriched = jobs.map((job) => {
      const rec = recruiterByUserId.get(String(job.recruiter));
      return {
        ...job,
        companyName: rec?.companyName || "Company",
        companyWebsite: rec?.companyWebsite || "",
        companyLogo: rec?.companyLogo || "",
      };
    });

    return res.json(enriched);
  } catch {
    return res.status(500).json({ message: "Failed to load jobs" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const jobs = await Job.find({ recruiter: req.user.id }).sort({ createdAt: -1 });
    return res.json(jobs);
  } catch {
    return res.status(500).json({ message: "Failed to load jobs" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { title, location, type, salary, description, applicationForm } = req.body;

    if (!title || !location || !type || !description) {
      return res.status(400).json({ message: "All fields required" });
    }

    let parsedApplicationForm = [];
    if (Array.isArray(applicationForm)) {
      parsedApplicationForm = applicationForm
        .map((f, idx) => ({
          key: String(f?.key || `field_${idx + 1}`).trim(),
          label: String(f?.label || "").trim(),
          type: ["text", "textarea", "number", "date", "select"].includes(f?.type) ? f.type : "text",
          required: Boolean(f?.required),
          options: Array.isArray(f?.options)
            ? f.options.map((o) => String(o).trim()).filter(Boolean)
            : [],
        }))
        .filter((f) => f.label);
    }

    const job = await Job.create({
      title,
      location,
      type,
      salary,
      description,
      status: "Active",
      recruiter: req.user.id,
      applicationForm: parsedApplicationForm,
    });

    return res.status(201).json(job);
  } catch {
    return res.status(500).json({ message: "Job creation failed" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    return res.json({ message: "Job deleted" });
  } catch {
    return res.status(500).json({ message: "Delete failed" });
  }
});

export default router;
