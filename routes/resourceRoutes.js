// Purpose: Defines API routes for the resourceRoutes feature area.
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/authMiddleware.js";
import Resource from "../models/Resource.js";
import User from "../models/User.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const buildFileUrl = (req, fileName) => {
  if (!fileName) return "";
  return `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
};

const normalizeCategory = (category) => {
  const rawCategory = String(category || "").trim().toLowerCase();
  if (rawCategory === "aptitude") return "Aptitude";
  if (rawCategory === "coding") return "Coding";
  if (
    rawCategory === "interview experience" ||
    rawCategory === "interview_experience" ||
    rawCategory === "interview-experience"
  ) {
    return "Interview Experience";
  }
  return "General";
};

const protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Admin token missing" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    if (decoded?.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }
    req.admin = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid admin token" });
  }
};

router.get("/public", async (req, res) => {
  try {
    const resources = await Resource.find({ status: "Approved" }).sort({ createdAt: -1 }).lean();
    return res.json(
      resources.map((item) => ({
        ...item,
        interviewQuestions:
          item.interviewQuestions || item.questions || item.interview_questions || "",
        questions: item.interviewQuestions || item.questions || item.interview_questions || "",
        applicationSource: item.applySource || item.applicationSource || "",
        fileUrl: buildFileUrl(req, item.fileName),
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Failed to load resources", error: err.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 }).lean();
    return res.json(
      resources.map((item) => ({
        ...item,
        interviewQuestions:
          item.interviewQuestions || item.questions || item.interview_questions || "",
        questions: item.interviewQuestions || item.questions || item.interview_questions || "",
        applicationSource: item.applySource || item.applicationSource || "",
        fileUrl: buildFileUrl(req, item.fileName),
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Failed to load your resources", error: err.message });
  }
});

router.post("/", authMiddleware, upload.single("resourceFile"), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      companyName = "",
      salaryOffered = "",
      applySource = "",
      offerStatus = "",
      experience = "Average",
      experienceDetails = "",
      interviewQuestions = "",
      questions = "",
    } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const normalizedCategory = normalizeCategory(category);

    const cleanCompanyName = String(companyName || "").trim();
    const cleanSalaryOffered = String(salaryOffered || "").trim();
    const cleanApplySource = String(applySource || "").trim();
    const cleanOfferStatus = String(offerStatus || "").trim();
    const normalizedExperience = (() => {
      const value = String(experience || "").trim().toLowerCase();
      if (value === "good" || value === "positive") return "Good";
      if (value === "bad" || value === "negative") return "Bad";
      return "Average";
    })();
    const cleanExperienceDetails = String(experienceDetails || "").trim();
    const cleanInterviewQuestions = String(interviewQuestions || questions || "").trim();

    if (normalizedCategory === "Interview Experience") {
      if (!cleanCompanyName) {
        return res.status(400).json({ message: "Company name is required for interview experiences" });
      }
      if (!cleanOfferStatus) {
        return res.status(400).json({ message: "Please select accepted or not status" });
      }
      if (!cleanApplySource) {
        return res.status(400).json({ message: "Please provide application source" });
      }
      if (!cleanExperienceDetails) {
        return res.status(400).json({ message: "Please add your interview experience details" });
      }
    } else {
      if (!req.file?.filename) {
        return res.status(400).json({ message: "Resource file is required" });
      }
    }

    const user = await User.findById(req.user.id).select("name email").lean();
    const resource = await Resource.create({
      title: String(title).trim(),
      description: String(description || "").trim(),
      category: normalizedCategory,
      companyName: cleanCompanyName,
      salaryOffered: cleanSalaryOffered,
      applySource: cleanApplySource,
      offerStatus: cleanOfferStatus,
      experience: normalizedExperience,
      experienceDetails: cleanExperienceDetails,
      interviewQuestions: cleanInterviewQuestions,
      fileName: req.file?.filename || "",
      uploadedBy: req.user.id,
      uploaderName: user?.name || "",
      uploaderEmail: user?.email || "",
      status: "Pending",
    });

    return res.status(201).json({
      message: "Resource uploaded. Waiting for admin approval.",
      resource: {
        ...resource.toObject(),
        interviewQuestions:
          resource.interviewQuestions || resource.questions || resource.interview_questions || "",
        questions:
          resource.interviewQuestions || resource.questions || resource.interview_questions || "",
        applicationSource: resource.applySource || resource.applicationSource || "",
        fileUrl: buildFileUrl(req, resource.fileName),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to upload resource", error: err.message });
  }
});

router.patch("/:id", authMiddleware, upload.single("resourceFile"), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    if (String(resource.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can edit only your own resources" });
    }

    const {
      title,
      description,
      category,
      companyName = "",
      salaryOffered = "",
      applySource = "",
      offerStatus = "",
      experience = "Average",
      experienceDetails = "",
      interviewQuestions = "",
      questions = "",
    } = req.body || {};

    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) {
      return res.status(400).json({ message: "Title is required" });
    }

    const normalizedCategory = normalizeCategory(category || resource.category);
    const cleanCompanyName = String(companyName || "").trim();
    const cleanSalaryOffered = String(salaryOffered || "").trim();
    const cleanApplySource = String(applySource || "").trim();
    const cleanOfferStatus = String(offerStatus || "").trim();
    const normalizedExperience = (() => {
      const value = String(experience || "").trim().toLowerCase();
      if (value === "good" || value === "positive") return "Good";
      if (value === "bad" || value === "negative") return "Bad";
      return "Average";
    })();
    const cleanExperienceDetails = String(experienceDetails || "").trim();
    const cleanInterviewQuestions = String(interviewQuestions || questions || "").trim();

    if (normalizedCategory === "Interview Experience") {
      if (!cleanCompanyName) {
        return res.status(400).json({ message: "Company name is required for interview experiences" });
      }
      if (!cleanOfferStatus) {
        return res.status(400).json({ message: "Please select accepted or not status" });
      }
      if (!cleanApplySource) {
        return res.status(400).json({ message: "Please provide application source" });
      }
      if (!cleanExperienceDetails) {
        return res.status(400).json({ message: "Please add your interview experience details" });
      }
    } else if (!resource.fileName && !req.file?.filename) {
      return res.status(400).json({ message: "Resource file is required" });
    }

    const newFileName = req.file?.filename || resource.fileName || "";
    const oldFileName = resource.fileName || "";
    if (req.file?.filename && oldFileName && oldFileName !== req.file.filename) {
      const oldPath = path.join(uploadsDir, oldFileName);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    resource.title = cleanTitle;
    resource.description = String(description || "").trim();
    resource.category = normalizedCategory;
    resource.companyName = cleanCompanyName;
    resource.salaryOffered = cleanSalaryOffered;
    resource.applySource = cleanApplySource;
    resource.offerStatus = cleanOfferStatus;
    resource.experience = normalizedExperience;
    resource.experienceDetails = cleanExperienceDetails;
    resource.interviewQuestions = cleanInterviewQuestions;
    resource.fileName = newFileName;
    // Keep moderation state unchanged so edits remain visible as expected.
    // Admin can still change status from the admin panel when needed.
    resource.status = resource.status || "Pending";

    await resource.save();

    return res.json({
      message: "Resource updated. Waiting for admin approval.",
      resource: {
        ...resource.toObject(),
        interviewQuestions:
          resource.interviewQuestions || resource.questions || resource.interview_questions || "",
        questions:
          resource.interviewQuestions || resource.questions || resource.interview_questions || "",
        applicationSource: resource.applySource || resource.applicationSource || "",
        fileUrl: buildFileUrl(req, resource.fileName),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update resource", error: err.message });
  }
});

router.get("/admin/all", protectAdmin, async (req, res) => {
  try {
    const resources = await Resource.find({}).sort({ createdAt: -1 }).lean();
    return res.json(
      resources.map((item) => ({
        ...item,
        interviewQuestions:
          item.interviewQuestions || item.questions || item.interview_questions || "",
        questions: item.interviewQuestions || item.questions || item.interview_questions || "",
        applicationSource: item.applySource || item.applicationSource || "",
        fileUrl: buildFileUrl(req, item.fileName),
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Failed to load resources", error: err.message });
  }
});

router.patch("/admin/:id/status", protectAdmin, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body || {};
    const normalized = String(status || "").trim();
    if (!["Approved", "Rejected"].includes(normalized)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const update = {
      status: normalized,
      approvedBy: "Admin",
      approvedAt: new Date(),
      rejectionReason: normalized === "Rejected" ? String(rejectionReason || "").trim() : "",
    };

    const resource = await Resource.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    return res.json({
      message: `Resource ${normalized.toLowerCase()}`,
      resource: {
        ...resource,
        fileUrl: buildFileUrl(req, resource.fileName),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update resource", error: err.message });
  }
});

export default router;
