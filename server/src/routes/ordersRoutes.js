import express from "express";
import { db } from "../db/storeDatabase.js";
import { authenticateToken } from "../middleware/auth.js";

const orderStatuses = new Set([
  "Menunggu konfirmasi",
  "Diproses",
  "Selesai",
  "Dibatalkan",
]);
const router = express.Router();

// Validates the buyer details and selected color-size inventory for an order.
function validateOrder(body = {}) {
  const buyerName = String(body.buyerName || "").trim();
  const address = String(body.address || "").trim();
  const note = String(body.note || "").trim();
  const quantity = Number(body.quantity ?? 1);
  if (!buyerName || buyerName.length > 120) {
    return { error: "Nama lengkap wajib diisi (maksimal 120 karakter)." };
  }
  if (!address || address.length > 1000) {
    return { error: "Alamat lengkap wajib diisi (maksimal 1000 karakter)." };
  }
  if (note.length > 500) {
    return { error: "Catatan maksimal 500 karakter." };
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Jumlah pesanan minimal satu pasang." };
  }

  const product = db.getProductById(String(body.productId || ""));
  if (!product) return { error: "Produk tidak ditemukan." };
  const variant = product.variants.find(
    (item) =>
      item.size === String(body.size || "").trim() &&
      item.color.toLocaleLowerCase("id") ===
        String(body.color || "").trim().toLocaleLowerCase("id"),
  );
  if (!variant || variant.stock < quantity) {
    return { error: "Ukuran dan warna yang dipilih tidak memiliki stok cukup." };
  }
  const settings = db.getStoreSettings();
  if (!settings.activeWhatsApp || !settings.whatsappNumber) {
    return { error: "Pemesanan WhatsApp belum diaktifkan oleh toko." };
  }

  return {
    orderData: {
      product,
      variant,
      buyerName,
      address,
      note,
      quantity,
    },
  };
}

// Creates a pending order before the customer continues in WhatsApp.
router.post("/", (request, response) => {
  const { orderData, error } = validateOrder(request.body);
  if (error) return response.status(400).json({ success: false, message: error });
  const order = db.createOrder(orderData);
  return response.status(201).json({
    success: true,
    data: order,
    message: "Pesanan tersimpan dan siap dikirim melalui WhatsApp.",
  });
});

// Lists order snapshots for the authenticated store dashboard.
router.get("/", authenticateToken, (request, response) => {
  return response.json({ success: true, data: db.getOrders() });
});

// Returns customer records derived from saved orders.
router.get("/customers", authenticateToken, (request, response) => {
  return response.json({ success: true, data: db.getCustomers() });
});

// Returns sales and order summary metrics for the dashboard.
router.get("/summary", authenticateToken, (request, response) => {
  return response.json({ success: true, data: db.getOrderSummary() });
});

// Changes an order's administrative status to one of the supported states.
router.patch("/:id/status", authenticateToken, (request, response) => {
  const status = String(request.body?.status || "");
  if (!orderStatuses.has(status)) {
    return response.status(400).json({
      success: false,
      message: "Status pesanan tidak valid.",
    });
  }
  const order = db.updateOrderStatus(request.params.id, status);
  if (!order) {
    return response.status(404).json({
      success: false,
      message: "Pesanan tidak ditemukan.",
    });
  }
  return response.json({
    success: true,
    data: order,
    message: "Status pesanan berhasil diperbarui.",
  });
});

export default router;
