import express from "express";
import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db/storeDatabase.js";
import { authenticateToken } from "../middleware/auth.js";

const routeDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(routeDirectory, "../../uploads");
const allowedImages = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

fs.mkdirSync(uploadDirectory, { recursive: true });

// Generates a collision-resistant file name for an uploaded shoe photo.
function createImageFilename(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
}

// Accepts only supported image extensions with their matching MIME type.
function filterUploadedImage(file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (allowedImages.get(extension) === file.mimetype.toLowerCase()) {
    callback(null, true);
    return;
  }
  callback(new Error("Hanya gambar JPG, PNG, atau WEBP yang diizinkan."));
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (request, file, callback) => {
      callback(null, createImageFilename(file));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    filterUploadedImage(file, callback);
  },
});

const router = express.Router();

// Parses and validates each shoe color, size, and stock combination.
function parseVariants(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { error: "Format varian warna dan ukuran tidak valid." };
    }
  }
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "Tambahkan setidaknya satu varian warna dan ukuran." };
  }

  const variants = [];
  const variantKeys = new Set();
  for (const variant of value) {
    const color = String(variant?.color ?? "").trim();
    const colorHex = String(variant?.colorHex ?? "").trim();
    const size = String(variant?.size ?? "").trim();
    const stock = Number(variant?.stock);
    if (!color || !/^#[\da-f]{6}$/i.test(colorHex) || !size) {
      return { error: "Warna, kode warna, dan ukuran wajib diisi dengan benar." };
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "Stok ukuran harus bilangan bulat nol atau lebih." };
    }
    const variantKey = `${color.toLocaleLowerCase("id")}:${size.toLocaleLowerCase("id")}`;
    if (variantKeys.has(variantKey)) {
      return { error: `Kombinasi warna ${color} dan ukuran ${size} terduplikasi.` };
    }
    variantKeys.add(variantKey);
    variants.push({ color, colorHex, size, stock });
  }
  return { variants };
}

// Validates and normalizes product fields before they reach the database.
function validateProductFields(body = {}, { creating = false } = {}) {
  const name = body.name === undefined ? undefined : String(body.name).trim();
  const brand = body.brand === undefined ? undefined : String(body.brand).trim();
  const categoryId = body.categoryId || body.category_id;
  const price = body.price === undefined ? undefined : Number(body.price);

  if (creating && !name) return { error: "Nama produk wajib diisi." };
  if (name !== undefined && !name) return { error: "Nama produk wajib diisi." };
  if (creating && !brand) return { error: "Merek produk wajib diisi." };
  if (creating && !categoryId) return { error: "Jenis sepatu wajib dipilih." };
  if (categoryId && !db.getCategoryById(categoryId)) {
    return { error: "Jenis sepatu tidak ditemukan." };
  }
  if (creating && (body.price === undefined || String(body.price).trim() === "")) {
    return { error: "Harga produk wajib diisi." };
  }
  if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
    return { error: "Harga harus berupa angka nol atau lebih." };
  }

  const payload = {};
  if (name !== undefined) payload.name = name;
  if (brand !== undefined) payload.brand = brand;
  if (categoryId !== undefined) payload.categoryId = categoryId;
  if (price !== undefined) payload.price = price;
  if (body.description !== undefined) {
    payload.description = String(body.description).trim();
  }
  if (body.image !== undefined) payload.image = String(body.image).trim();
  if (body.imageUrl !== undefined) payload.image = String(body.imageUrl).trim();
  if (body.variants !== undefined || creating) {
    const result = parseVariants(body.variants);
    if (result.error) return result;
    payload.variants = result.variants;
  }
  return { payload };
}

// Returns shoe listings with their brands, types, and color-size stock.
router.get("/", (request, response) => {
  const products = db.getProducts({
    categoryId: request.query.categoryId,
    search: request.query.search,
    stockStatus: request.query.stockStatus,
  });
  return response.json({ success: true, count: products.length, data: products });
});

// Returns one shoe and all of its inventory variants.
router.get("/:id", (request, response) => {
  const product = db.getProductById(request.params.id);
  if (!product) {
    return response.status(404).json({
      success: false,
      message: "Produk tidak ditemukan.",
    });
  }
  return response.json({ success: true, data: product });
});

// Creates a shoe after validating its form and optional image upload.
router.post("/", authenticateToken, upload.single("image"), (request, response) => {
  const { payload, error } = validateProductFields(request.body, { creating: true });
  if (error) return response.status(400).json({ success: false, message: error });
  if (!request.file && !String(request.body.imageUrl || request.body.image || "").trim()) {
    return response.status(400).json({
      success: false,
      message: "Foto produk wajib diunggah sebelum menyimpan koleksi.",
    });
  }
  if (request.file) payload.image = `/uploads/${request.file.filename}`;
  const product = db.addProduct(payload);
  return response.status(201).json({
    success: true,
    data: product,
    message: "Produk berhasil ditambahkan.",
  });
});

// Updates a shoe while leaving omitted fields and variants unchanged.
router.put("/:id", authenticateToken, upload.single("image"), (request, response) => {
  if (!db.getProductById(request.params.id)) {
    return response.status(404).json({
      success: false,
      message: "Produk tidak ditemukan.",
    });
  }
  const { payload, error } = validateProductFields(request.body);
  if (error) return response.status(400).json({ success: false, message: error });
  if (request.file) payload.image = `/uploads/${request.file.filename}`;
  const product = db.updateProduct(request.params.id, payload);
  return response.json({
    success: true,
    data: product,
    message: "Produk berhasil diperbarui.",
  });
});

// Toggles the stock state of every size and color for one shoe.
router.patch("/:id", authenticateToken, (request, response) => {
  const product = db.toggleStock(request.params.id);
  if (!product) {
    return response.status(404).json({
      success: false,
      message: "Produk tidak ditemukan.",
    });
  }
  return response.json({
    success: true,
    data: product,
    message: `Stok produk diperbarui: ${product.stockStatus}.`,
  });
});

// Deletes a product without deleting its stored order history.
router.delete("/:id", authenticateToken, (request, response) => {
  if (!db.deleteProduct(request.params.id)) {
    return response.status(404).json({
      success: false,
      message: "Produk tidak ditemukan.",
    });
  }
  return response.json({ success: true, message: "Produk berhasil dihapus." });
});

export default router;
