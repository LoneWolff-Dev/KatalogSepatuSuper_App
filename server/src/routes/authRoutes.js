import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/storeDatabase.js";
import { authenticateToken, JWT_SECRET } from "../middleware/auth.js";

const router = express.Router();

// Authenticates the seeded store administrator and issues a signed session token.
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Email dan kata sandi wajib diisi.",
    });
  }

  const admin = db.getAdmin();

  if (!admin || email.trim().toLowerCase() !== admin.email.toLowerCase()) {
    return res.status(401).json({
      success: false,
      message: "Email atau kata sandi tidak sesuai.",
    });
  }

  const isMatch = bcrypt.compareSync(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Email atau kata sandi tidak sesuai.",
    });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
  }

  const token = jwt.sign({ email: admin.email, name: admin.name }, JWT_SECRET, {
    expiresIn: "24h",
  });
  return res.json({
    success: true,
    message: "Berhasil masuk ke dashboard.",
    token,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  });
});

// Returns the current administrator's profile without exposing credential data.
router.get("/me", authenticateToken, (req, res) => {
  const admin = db.getAdmin();

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin tidak ditemukan.",
    });
  }

  res.json({
    success: true,
    data: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  });
});

export default router;
