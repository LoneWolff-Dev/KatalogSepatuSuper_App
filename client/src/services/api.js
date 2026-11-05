const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";
const adminTokenKey = "sepatuSuperAdminToken";

// Reads the administrator's saved token for protected store operations.
export function getAdminToken() {
  return localStorage.getItem(adminTokenKey) || sessionStorage.getItem(adminTokenKey) || "";
}

// Stores or removes the administrator's authentication token.
export function setAdminToken(token, remember = true) {
  localStorage.removeItem(adminTokenKey);
  sessionStorage.removeItem(adminTokenKey);
  if (token) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(adminTokenKey, token);
    return;
  }
}

// Sends a JSON or multipart request and surfaces the server's error message.
async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (getAdminToken()) {
    headers.set("Authorization", `Bearer ${getAdminToken()}`);
  }
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    ...options,
    headers,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Server mengirim respons yang tidak dapat dibaca.");
  }
  if (!response.ok || result.success === false) {
    const error = new Error(result.message || "Permintaan ke server gagal.");
    error.status = response.status;
    throw error;
  }
  return Object.hasOwn(result, "data") ? result.data : result;
}

// Retrieves the public catalog of shoes and their current size/color stock.
export function getProducts() {
  return request("/products");
}

// Retrieves the shoe-type filters used by the public catalog.
export function getCategories() {
  return request("/categories");
}

// Retrieves the store profile and WhatsApp number.
export function getStoreSettings() {
  return request("/stores");
}

// Authenticates an administrator and returns the signed access token.
export function loginAdmin(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// Verifies an administrator's token before showing the dashboard.
export function getCurrentAdmin() {
  return request("/auth/me");
}

// Retrieves product, order, customer, and store data for the admin workspace.
export async function getAdminWorkspace() {
  const [products, categories, settings, orders, customers, summary] =
    await Promise.all([
      request("/products"),
      request("/categories"),
      request("/stores"),
      request("/orders"),
      request("/orders/customers"),
      request("/orders/summary"),
    ]);
  return { products, categories, settings, orders, customers, summary };
}

// Creates a shoe product with image upload and color-size stock variants.
export function createProduct(formData) {
  return request("/products", {
    method: "POST",
    body: formData,
  });
}

// Updates an existing product and its color-size stock variants.
export function updateProduct(productId, formData) {
  return request(`/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: formData,
  });
}

// Removes a product without deleting saved order snapshots.
export function deleteProduct(productId) {
  return request(`/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}

// Updates a product's availability across all color and size variants.
export function toggleProductStock(productId) {
  return request(`/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
  });
}

// Saves changes to the store profile and its WhatsApp contact.
export function updateStoreSettings(settings) {
  return request("/stores", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

// Records a pending customer order before opening WhatsApp.
export function createOrder(order) {
  return request("/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

// Updates the status of an order from the administrator dashboard.
export function updateOrderStatus(orderId, status) {
  return request(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Formats an amount using the Indonesian rupiah currency convention.
export function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

// Normalizes local Indonesian phone numbers into WhatsApp's international format.
export function normalizeWhatsAppNumber(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  const internationalNumber = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits.startsWith("8")
      ? `62${digits}`
      : digits;
  return internationalNumber.length >= 8 && internationalNumber.length <= 15
    ? internationalNumber
    : "";
}

// Creates a WhatsApp deep link from the saved order and its buyer details.
export function buildOrderWhatsAppLink(phoneNumber, order, storeName) {
  const normalizedNumber = normalizeWhatsAppNumber(phoneNumber);
  if (!normalizedNumber) return "";
  const message = [
    `Halo ${storeName}, saya mau pesan:`,
    `${order.brand ? `${order.brand} — ` : ""}${order.productName}`,
    `Warna: ${order.color} · Ukuran: ${order.size} · Jumlah: ${order.quantity} pasang`,
    `Harga: ${formatPrice(order.unitPrice)} · Total: ${formatPrice(order.totalAmount)}`,
    "",
    `Nama: ${order.buyerName}`,
    `Alamat: ${order.address}`,
    order.note ? `Catatan: ${order.note}` : "",
    `No. pesanan: ${order.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
