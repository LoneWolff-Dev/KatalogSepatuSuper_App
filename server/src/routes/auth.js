import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/db.js";
import { authenticateToken, JWT_SECRET } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const admin = db.getAdmin();

  if (!admin || email.trim().toLowerCase() !== admin.email.toLowerCase()) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isMatch = bcrypt.compareSync(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
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
    message: "Login successful",
    token,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  });
});

router.get("/me", authenticateToken, (req, res) => {
  const admin = db.getAdmin();

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found",
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
