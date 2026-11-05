import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import ordersRoutes from "./routes/ordersRoutes.js";
import productTypesRoutes from "./routes/productTypesRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import storeSettingsRoutes from "./routes/storeSettingsRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadPath));

app.use("/api/auth", authRoutes);
app.use("/api/categories", productTypesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/stores", storeSettingsRoutes);
app.use("/api/orders", ordersRoutes);

// Exposes a lightweight health check for deployment and local verification.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "KatalogSepatuSuper API",
    timestamp: new Date().toISOString(),
  });
});

// Documents the public API entry points for the local backend.
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to KatalogSepatuSuper API",
    endpoints: {
      auth: "/api/auth",
      categories: "/api/categories",
      products: "/api/products",
      stores: "/api/stores",
      orders: "/api/orders",
      health: "/api/health",
    },
  });
});

// Converts upload and API failures into explicit JSON error responses.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status =
    error?.code === "LIMIT_FILE_SIZE"
      ? 413
      : error?.status === 400 ||
          (error instanceof Error && error.message.startsWith("Hanya"))
        ? 400
        : 500;
  if (status === 500) console.error(error);
  return res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Terjadi kesalahan pada server."
        : error.message,
  });
});

// Starts the catalog API on the configured local or deployment port.
app.listen(port, () => {
  console.log(
    `Server KatalogSepatuSuper is running on http://localhost:${port}`,
  );
});
