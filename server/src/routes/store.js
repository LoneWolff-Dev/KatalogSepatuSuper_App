import express from "express";
import { db } from "../db/db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get(`/`, (req, res) => {
  const settings = db.getStoreSettings();
  res.json({
    success: true,
    data: settings,
  });
});

router.put(`/`, authenticateToken, (req, res) => {
  const { storeName, tagline, address, phone } = req.body;

  const current = db.getStoreSettings();
  const updated = db.updateStoreSettings({
    name: storeName || current.storeName,
    tagline: tagline || current.tagline,
    slug: slug || current.slug,
    phone: phone ? phone.replace(/[^0-9]/g, "") : current.phone,
    currency: currency || current.currency,
    activeWhatsApp:
      activeWhatsApp !== undefined ? activeWhatsApp : current.activeWhatsApp,
    address: address !== undefined ? address : current.address,
  });

  res.json({
    success: true,
    data: updated,
    message: "Store settings updated successfully",
  });
});

export default router;
