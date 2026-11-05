import express from "express";
import { db } from "../db/storeDatabase.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Lists shoe types for the public catalog and product editor.
router.get("/", (req, res) => {
  res.json({ success: true, data: db.getCategories() });
});

// Adds a unique shoe type for authenticated administrators.
router.post("/", authenticateToken, (req, res) => {
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Nama kategori wajib diisi.",
    });
  }

  const normalizedName = name.trim();
  const existing = db
    .getCategories()
    .find((category) => category.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Kategori tersebut sudah ada.",
    });
  }

  try {
    const category = db.addCategory(normalizedName);
    return res.status(201).json({
      success: true,
      data: category,
      message: "Kategori berhasil ditambahkan.",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Renames a shoe type without changing its assigned products.
router.put("/:id", authenticateToken, (req, res) => {
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Nama kategori wajib diisi.",
    });
  }

  try {
    const category = db.updateCategory(req.params.id, name.trim());
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori tidak ditemukan.",
      });
    }
    return res.json({
      success: true,
      data: category,
      message: "Kategori berhasil diperbarui.",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Removes a shoe type only when no products use it.
router.delete("/:id", authenticateToken, (req, res) => {
  if (db.getProducts({ categoryId: req.params.id }).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Kategori tidak dapat dihapus karena masih memiliki produk.",
    });
  }

  try {
    if (!db.deleteCategory(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Kategori tidak ditemukan.",
      });
    }
    return res.json({
      success: true,
      message: "Kategori berhasil dihapus.",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
