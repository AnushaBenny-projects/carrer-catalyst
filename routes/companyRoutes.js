// Purpose: Defines API routes for the companyRoutes feature area.
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authMiddleware from "../middleware/authMiddleware.js";
import Recruiter from "../models/Recruiter.js";
import Company from "../models/Company.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage });

const buildFileUrl = (req, filename) => {
  if (!filename) return "";
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can access company profile" });
    }

    const [recruiter, company] = await Promise.all([
      Recruiter.findOne({ userId: req.user.id }).lean(),
      Company.findOne({ recruiter: req.user.id }).lean(),
    ]);

    return res.json({
      name: company?.name || recruiter?.companyName || "",
      website: company?.website || recruiter?.companyWebsite || "",
      description: company?.description || "",
      companyLogo: recruiter?.companyLogo || "",
      companyLogoUrl: buildFileUrl(req, recruiter?.companyLogo),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load company profile", error: err.message });
  }
});

router.post("/profile", authMiddleware, upload.single("companyLogo"), async (req, res) => {
  try {
    if (req.user?.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can update company profile" });
    }

    const name = String(req.body?.name || "").trim();
    const website = String(req.body?.website || "").trim();
    const description = String(req.body?.description || "").trim();

    let recruiter = await Recruiter.findOne({ userId: req.user.id });
    if (!recruiter) {
      recruiter = await Recruiter.create({ userId: req.user.id });
    }

    if (name) recruiter.companyName = name;
    recruiter.companyWebsite = website;
    if (req.file?.filename) recruiter.companyLogo = req.file.filename;
    await recruiter.save();

    const company = await Company.findOneAndUpdate(
      { recruiter: req.user.id },
      {
        recruiter: req.user.id,
        name,
        website,
        description,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      message: "Company profile saved",
      profile: {
        name: company.name || recruiter.companyName || "",
        website: company.website || recruiter.companyWebsite || "",
        description: company.description || "",
        companyLogo: recruiter.companyLogo || "",
        companyLogoUrl: buildFileUrl(req, recruiter.companyLogo),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to save company profile", error: err.message });
  }
});

export default router;
