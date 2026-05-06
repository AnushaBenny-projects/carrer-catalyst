// Purpose: Defines API routes for the adminRoutes feature area.
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Recruiter from "../models/Recruiter.js";

const router = express.Router();
const ADMIN_JOBS_EMAIL = "admin.jobs@careercatalyst.local";
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "Career123";

const buildFileUrl = (req, filename) => {
  if (!filename) return "";
  if (/^https?:\/\//i.test(String(filename))) return filename;
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};

const signAdminToken = () =>
  jwt.sign(
    { role: "admin", scope: "admin-panel" },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "12h" }
  );

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

async function ensureAdminRecruiter(companyName = "Admin") {
  let user = await User.findOne({ email: ADMIN_JOBS_EMAIL, role: "recruiter" });
  if (!user) {
    const hashedPassword = await bcrypt.hash("admin-system-user", 10);
    user = await User.create({
      name: "Admin Jobs",
      email: ADMIN_JOBS_EMAIL,
      password: hashedPassword,
      role: "recruiter",
      status: "Approved",
    });
  }

  let recruiter = await Recruiter.findOne({ userId: user._id });
  if (!recruiter) {
    recruiter = await Recruiter.create({
      userId: user._id,
      companyName: companyName || "Admin",
      companyWebsite: "",
      companyLogo: "",
    });
  } else if (companyName && recruiter.companyName !== companyName) {
    recruiter.companyName = companyName;
    await recruiter.save();
  }

  return { user, recruiter };
}

router.post("/login", async (req, res) => {
  const { accessCode } = req.body || {};
  if (!accessCode || String(accessCode).trim() !== ADMIN_ACCESS_CODE) {
    return res.status(401).json({ message: "Invalid access code" });
  }
  return res.json({ token: signAdminToken() });
});

router.get("/users", protectAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select("-password").lean();
    return res.json(
      users.map((user) => ({
        ...user,
        profilePicUrl: buildFileUrl(req, user.profilePic),
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

router.delete("/users/:id", protectAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting user", error: err.message });
  }
});

router.patch("/users/:id/block", protectAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.status = "Blocked";
    await user.save();
    return res.json({ message: "User blocked successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error blocking user", error: err.message });
  }
});

router.patch("/users/:id/approve", protectAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.status = "Approved";
    await user.save();
    return res.json({ message: "User approved successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error approving user", error: err.message });
  }
});

router.get("/jobs", protectAdmin, async (_req, res) => {
  try {
    const jobs = await Job.find({}).sort({ createdAt: -1 }).lean();
    const recruiterIds = jobs.map((job) => job.recruiter).filter(Boolean);
    const recruiters = await Recruiter.find({ userId: { $in: recruiterIds } }).lean();
    const recruiterByUserId = new Map(recruiters.map((rec) => [String(rec.userId), rec]));

    return res.json(
      jobs.map((job) => {
        const rec = recruiterByUserId.get(String(job.recruiter));
        return {
          ...job,
          companyName: rec?.companyName || "Company",
          companyWebsite: rec?.companyWebsite || "",
        };
      })
    );
  } catch (err) {
    return res.status(500).json({ message: "Error fetching jobs", error: err.message });
  }
});

router.delete("/jobs/:id", protectAdmin, async (req, res) => {
  try {
    const deleted = await Job.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Job not found" });
    return res.json({ message: "Job deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting job", error: err.message });
  }
});

const normalizeApplicationForm = (applicationForm = []) => {
  if (!Array.isArray(applicationForm)) return [];
  return applicationForm
    .map((field, idx) => {
      const label = String(field?.label || "").trim();
      const type = String(field?.type || "text").trim().toLowerCase();
      const key = String(field?.key || `admin_field_${idx + 1}`).trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
      const allowedTypes = ["text", "textarea", "number", "date", "select"];
      const safeType = allowedTypes.includes(type) ? type : "text";
      const options = safeType === "select"
        ? (Array.isArray(field?.options) ? field.options : [])
            .map((opt) => String(opt || "").trim())
            .filter(Boolean)
        : [];
      if (!label) return null;
      return {
        key,
        label,
        type: safeType,
        required: Boolean(field?.required),
        options,
      };
    })
    .filter(Boolean);
};

router.post("/jobs", protectAdmin, async (req, res) => {
  try {
    const {
      company,
      title,
      location,
      type,
      salary,
      description,
      applicationForm,
    } = req.body || {};

    if (!company || !title || !location || !type || !description) {
      return res.status(400).json({ message: "company, title, location, type and description are required" });
    }

    const { user } = await ensureAdminRecruiter(String(company).trim());
    const job = await Job.create({
      title: String(title).trim(),
      location: String(location).trim(),
      type: String(type).trim(),
      salary: String(salary || "").trim(),
      description: String(description).trim(),
      status: "Active",
      recruiter: user._id,
      applicationForm: normalizeApplicationForm(applicationForm),
    });

    return res.status(201).json(job);
  } catch (err) {
    return res.status(500).json({ message: "Error creating job", error: err.message });
  }
});

router.post("/posts", protectAdmin, async (req, res) => {
  try {
    const { company, type, desc, formType, formLabel, formOptions } = req.body || {};
    const allowedFormTypes = ["text", "textarea", "number", "date", "select"];
    if (!company || !type || !desc || !formType) {
      return res.status(400).json({ message: "company, type, desc and formType are required" });
    }
    if (!allowedFormTypes.includes(String(formType))) {
      return res.status(400).json({ message: "Invalid formType" });
    }

    const { user } = await ensureAdminRecruiter(String(company).trim());
    const safeDesc = String(desc).trim();
    const title = safeDesc.length > 60 ? `${safeDesc.slice(0, 57)}...` : safeDesc;
    const safeFormType = String(formType).trim();
    const safeFormLabel = String(formLabel || "Additional Details").trim() || "Additional Details";
    const parsedOptions = safeFormType === "select"
      ? String(formOptions || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    const job = await Job.create({
      title: title || "Admin Job Post",
      location: "Campus",
      type: String(type).trim(),
      salary: "",
      description: safeDesc,
      status: "Active",
      recruiter: user._id,
      applicationForm: [
        {
          key: `admin_field_${safeFormLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          label: safeFormLabel,
          type: safeFormType,
          required: true,
          options: parsedOptions,
        },
      ],
    });

    return res.status(201).json({
      _id: job._id,
      company: String(company).trim(),
      type: job.type,
      desc: job.description,
      formType: safeFormType,
      formLabel: safeFormLabel,
      createdAt: job.createdAt,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error creating post", error: err.message });
  }
});

router.get("/posts", protectAdmin, async (_req, res) => {
  try {
    const { user, recruiter } = await ensureAdminRecruiter("Admin");
    const jobs = await Job.find({ recruiter: user._id }).sort({ createdAt: -1 }).lean();
    const companyName = recruiter?.companyName || "Admin";
    return res.json(
      jobs.map((job) => ({
        _id: job._id,
        company: companyName,
        type: job.type,
        desc: job.description,
        formType: job.applicationForm?.[0]?.type || "",
        formLabel: job.applicationForm?.[0]?.label || "",
        createdAt: job.createdAt,
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Error fetching posts", error: err.message });
  }
});

router.delete("/posts/:id", protectAdmin, async (req, res) => {
  try {
    const { user } = await ensureAdminRecruiter("Admin");
    const deleted = await Job.findOneAndDelete({ _id: req.params.id, recruiter: user._id });
    if (!deleted) return res.status(404).json({ message: "Post not found" });
    return res.json({ message: "Post deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting post", error: err.message });
  }
});

export default router;
