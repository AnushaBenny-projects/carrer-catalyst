// Purpose: Defines API routes for the authRoutes feature area.
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Recruiter from "../models/Recruiter.js";
import authMiddleware from "../middleware/authMiddleware.js";

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
  filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const getUploadedFile = (files = [], keys = []) => {
  if (!Array.isArray(files) || files.length === 0) return null;
  const file = files.find((f) => keys.includes(f.fieldname));
  return file ? file.filename : null;
};

const buildFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


router.post(
  "/signup",
  upload.any(),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        skills,
        dob,
        course,
        companyName,
        companyWebsite,
      } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);

      const normalizedRole = role === "candidate" ? "student" : role;

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: normalizedRole,
        profilePic: getUploadedFile(req.files, ["profilePic", "file"]),
        resume: getUploadedFile(req.files, ["resume"]),
        dob: dob || null,
        course: course || "",
        skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });

      if (normalizedRole === "student") {
        await Student.create({
          userId: user._id,
          skills: user.skills,
        });
      } else if (normalizedRole === "recruiter") {
        await Recruiter.create({
          userId: user._id,
          companyName,
          companyWebsite,
          companyLogo: getUploadedFile(req.files, ["companyLogo", "file"]),
        });
      }

      return res.status(201).json({
        message: "Signup successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          dob: user.dob,
          course: user.course,
          profilePic: user.profilePic,
          profilePicUrl: buildFileUrl(req, user.profilePic),
          resume: user.resume,
          resumeUrl: buildFileUrl(req, user.resume),
        },
      });
    } catch (err) {
      console.error("Signup Error:", err);
      return res.status(500).json({ message: "Server error during signup" });
    }
  }
);

router.post("/login", async (req, res) => {
  try {
    let { email, password, role } = req.body;
    if (role === "candidate") role = "student";

    const user = await User.findOne({ email, role });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dob: user.dob,
        course: user.course,
        skills: user.skills,
        profilePic: user.profilePic,
        profilePicUrl: buildFileUrl(req, user.profilePic),
        resume: user.resume,
        resumeUrl: buildFileUrl(req, user.resume),
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
    });

    if (!user) {
      return res.json({
        message: "If an account exists for this email, a reset link has been generated.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || `${req.protocol}://${req.get("host")}/frontend`;
    const resetUrl = `${frontendBaseUrl}/reset-password.html?token=${resetToken}`;

    return res.json({
      message: "Reset link generated.",
      resetUrl,
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Server error while generating reset link" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Server error while resetting password" });
  }
});

router.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dob: user.dob,
        course: user.course,
        skills: user.skills,
        profilePic: user.profilePic,
        profilePicUrl: buildFileUrl(req, user.profilePic),
        resume: user.resume,
        resumeUrl: buildFileUrl(req, user.resume),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load profile", error: err.message });
  }
});

const updateProfileHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, dob, course, skills } = req.body || {};

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof dob === "string" && dob.trim()) user.dob = dob;
    if (typeof course === "string") user.course = course.trim();

    if (typeof email === "string" && email.trim() && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const exists = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ message: "Email already in use" });
      user.email = email.trim().toLowerCase();
    }

    if (typeof skills === "string") {
      user.skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const newProfilePic = getUploadedFile(req.files, ["profilePic", "file"]);
    const newResume = getUploadedFile(req.files, ["resume"]);
    if (newProfilePic) user.profilePic = newProfilePic;
    if (newResume) user.resume = newResume;

    await user.save();

    return res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dob: user.dob,
        course: user.course,
        skills: user.skills,
        profilePic: user.profilePic,
        profilePicUrl: buildFileUrl(req, user.profilePic),
        resume: user.resume,
        resumeUrl: buildFileUrl(req, user.resume),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
};

router.put("/profile/me", authMiddleware, upload.any(), updateProfileHandler);
router.post("/profile/me", authMiddleware, upload.any(), updateProfileHandler);

export default router;
