// Purpose: Defines API routes for the applicationRoutes feature area.
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Recruiter from "../models/Recruiter.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

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

const buildFileUrl = (req, filename) => {
  if (!filename) return "";
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};

router.post("/", protect, upload.any(), async (req, res) => {
  try {
    const { jobId } = req.body;
    const answersRaw = req.body?.answers;
    let answers = {};
    if (typeof answersRaw === "string" && answersRaw.trim()) {
      try {
        answers = JSON.parse(answersRaw);
      } catch {
        answers = {};
      }
    } else if (answersRaw && typeof answersRaw === "object") {
      answers = answersRaw;
    }

    const uploadedResume = Array.isArray(req.files)
      ? req.files.find((f) => f.fieldname === "resume")?.filename || ""
      : "";

    if (!jobId) return res.status(400).json({ message: "jobId is required" });
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid jobId" });
    }
    if (req.user?.role !== "student") return res.status(403).json({ message: "Only students can apply" });

    const job = await Job.findById(jobId).lean();
    if (!job || job.status !== "Active") return res.status(404).json({ message: "Job not found" });

    const existing = await Application.findOne({ jobId, candidateId: req.user.id });
    if (existing) return res.status(409).json({ message: "Already applied" });

    const user = await User.findById(req.user.id).select("name email resume");
    const resumeToUse = uploadedResume || user?.resume || "";
    if (!resumeToUse) {
      return res.status(400).json({ message: "Please upload resume in Complete Profile before applying." });
    }

    if (uploadedResume && user) {
      user.resume = uploadedResume;
      await user.save();
    }

    const formAnswers = [];
    const formDef = Array.isArray(job.applicationForm) ? job.applicationForm : [];
    for (let i = 0; i < formDef.length; i += 1) {
      const field = formDef[i] || {};
      const normalizedLabel = String(field.label || `Field ${i + 1}`).trim();
      const normalizedKey = String(field.key || normalizedLabel || `field_${i + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
      const isResumeField = normalizedKey.includes("resume") || normalizedLabel.toLowerCase().includes("resume");
      if (isResumeField) {
        continue;
      }
      const raw = answers?.[normalizedKey] ?? answers?.[field.key];
      const value = raw === undefined || raw === null ? "" : String(raw).trim();
      if (field.required && !value) {
        return res.status(400).json({ message: `${normalizedLabel} is required` });
      }
      if (value) formAnswers.push({ key: normalizedKey, label: normalizedLabel, value });
    }

    const created = await Application.create({
      jobId,
      candidateId: req.user.id,
      candidateName: user?.name || "",
      candidateEmail: user?.email || "",
      candidateResume: resumeToUse,
      formAnswers,
      status: "Pending",
    });

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: "Application failed", error: err.message });
  }
});

// Student: own applied jobs
router.get("/me", protect, async (req, res) => {
  try {
    if (req.user?.role !== "student") {
      return res.status(403).json({ message: "Only students can view own applications" });
    }

    const apps = await Application.find({ candidateId: req.user.id }).sort({ createdAt: -1 }).lean();
    const me = await User.findById(req.user.id).select("resume").lean();
    const jobIds = apps.map((a) => a.jobId).filter(Boolean);

    const jobs = await Job.find({ _id: { $in: jobIds } }).lean();
    const recruiters = await Recruiter.find({ userId: { $in: jobs.map((j) => j.recruiter).filter(Boolean) } }).lean();

    const jobById = new Map(jobs.map((j) => [String(j._id), j]));
    const recByUserId = new Map(recruiters.map((r) => [String(r.userId), r]));

    const result = apps.map((app) => {
      const job = jobById.get(String(app.jobId));
      const rec = job ? recByUserId.get(String(job.recruiter)) : null;
      return {
        ...app,
        jobTitle: job?.title || "Job",
        jobLocation: job?.location || "",
        jobType: job?.type || "",
        companyName: rec?.companyName || "Company",
        companyWebsite: rec?.companyWebsite || "",
        candidateResumeUrl: buildFileUrl(req, app.candidateResume || me?.resume),
      };
    });

    return res.json(result);
  } catch {
    return res.status(500).json({ message: "Failed to load applied jobs" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    if (req.user?.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can view applicants" });
    }

    const jobs = await Job.find({ recruiter: req.user.id }).select("_id title").lean();
    const jobIds = jobs.map((j) => j._id);
    const jobTitleById = new Map(jobs.map((j) => [String(j._id), j.title]));

    const applications = await Application.find({ jobId: { $in: jobIds } }).sort({ createdAt: -1 }).lean();

    const enriched = applications.map((app) => ({
      ...app,
      jobTitle: jobTitleById.get(String(app.jobId)) || "Job",
      candidateResumeUrl: buildFileUrl(req, app.candidateResume),
    }));

    return res.json(enriched);
  } catch {
    return res.status(500).json({ message: "Failed to load applications" });
  }
});

router.get("/job/:jobId", protect, async (req, res) => {
  try {
    if (req.user?.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can view applicants" });
    }

    const job = await Job.findOne({ _id: req.params.jobId, recruiter: req.user.id }).select("_id title");
    if (!job) return res.status(404).json({ message: "Job not found" });

    const applications = await Application.find({ jobId: job._id }).sort({ createdAt: -1 }).lean();

    return res.json(
      applications.map((app) => ({
        ...app,
        jobTitle: job.title,
        candidateResumeUrl: buildFileUrl(req, app.candidateResume),
      }))
    );
  } catch {
    return res.status(500).json({ message: "Failed to load applications" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    if (req.user?.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can update applicants" });
    }

    const { status, message } = req.body;
    const allowed = ["Pending", "Accepted", "Rejected", "Hired"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    const ownsJob = await Job.exists({ _id: app.jobId, recruiter: req.user.id });
    if (!ownsJob) {
      return res.status(403).json({ message: "You can only update applications for your own jobs" });
    }

    app.status = status;
    app.recruiterMessage = typeof message === "string" ? message.trim().slice(0, 1000) : "";
    await app.save();

    return res.json(app);
  } catch {
    return res.status(500).json({ message: "Failed to update application" });
  }
});

export default router;
