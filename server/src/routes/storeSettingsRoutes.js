import express from "express";
import { db } from "../db/storeDatabase.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const settingKeys = [
  "storeName",
  "tagline",
  "address",
  "phone",
  "whatsappNumber",
  "currency",
  "activeWhatsApp",
];

// Provides the public store identity and WhatsApp ordering configuration.
router.get("/", (req, res) => {
  res.json({ success: true, data: db.getStoreSettings() });
});

// Saves validated store details and WhatsApp settings for administrators.
router.put("/", authenticateToken, (req, res) => {
  const updates = {};
  for (const key of settingKeys) {
    if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  }
  if (
    updates.whatsappNumber !== undefined &&
    !/^[+\d\s()-]*$/.test(String(updates.whatsappNumber))
  ) {
    return res.status(400).json({
      success: false,
      message: "Nomor WhatsApp hanya boleh berisi angka dan tanda nomor.",
    });
  }
  return res.json({
    success: true,
    data: db.updateStoreSettings(updates),
    message: "Pengaturan toko berhasil diperbarui.",
  });
});

export default router;
