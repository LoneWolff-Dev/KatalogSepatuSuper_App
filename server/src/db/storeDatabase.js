import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_FILE = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, "katalogwa.sqlite");
const DATA_FILE = path.join(__dirname, "data.json");

class StoreDatabase {
  // Opens the SQLite database and runs migrations and starter catalog data.
  constructor() {
    this.db = new DatabaseSync(SQLITE_FILE);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.migrateLegacyTables();
    this.initTables();
    this.seedInitialData();
    this.seedProductVariants();
  }

  // Checks the local schema before applying a migration.
  tableExists(name) {
    return Boolean(
      this.db
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(name),
    );
  }

  // Renames legacy tables and safely upgrades existing product inventory.
  migrateLegacyTables() {
    for (const [legacyName, tableName] of [
      ["categories", "product_categories"],
      ["settings", "store_settings"],
      ["admins", "admin_users"],
    ]) {
      if (this.tableExists(legacyName) && !this.tableExists(tableName)) {
        this.db.exec(`ALTER TABLE ${legacyName} RENAME TO ${tableName}`);
      }
    }

    if (
      this.tableExists("products") &&
      !this.db
        .prepare("PRAGMA table_info(products)")
        .all()
        .some((column) => column.name === "brand")
    ) {
      this.db.exec(
        "ALTER TABLE products ADD COLUMN brand TEXT NOT NULL DEFAULT ''",
      );
    }

    if (
      this.tableExists("product_variants") &&
      !this.db
        .prepare("PRAGMA table_info(product_variants)")
        .all()
        .some((column) => column.name === "color")
    ) {
      this.db.exec(`
        BEGIN;
        DROP INDEX IF EXISTS idx_product_variants_product;
        ALTER TABLE product_variants RENAME TO product_variants_legacy;
        CREATE TABLE product_variants (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          color TEXT NOT NULL DEFAULT 'Putih',
          color_hex TEXT NOT NULL DEFAULT '#f5f5f0',
          size TEXT NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
          UNIQUE (product_id, color, size)
        );
        INSERT INTO product_variants (id, product_id, color, color_hex, size, stock)
          SELECT id, product_id, 'Putih', '#f5f5f0', size, stock
          FROM product_variants_legacy;
        DROP TABLE product_variants_legacy;
        COMMIT;
      `);
    }

    if (this.tableExists("admin_users")) {
      this.db
        .prepare("UPDATE admin_users SET email = ? WHERE email = ?")
        .run("admin@sepatusuper.id", "admin@sepatusuper.com");
    }
  }

  // Menyiapkan tabel katalog, variasi sepatu, pengaturan, dan alur pesanan.
  // Ensures all store, catalog, and order tables exist.
  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        category_id TEXT NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
        price INTEGER NOT NULL CHECK (price >= 0),
        stock_status TEXT NOT NULL DEFAULT 'Tersedia',
        description TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        color TEXT NOT NULL DEFAULT 'Putih',
        color_hex TEXT NOT NULL DEFAULT '#f5f5f0',
        size TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        UNIQUE (product_id, color, size)
      );

      CREATE TABLE IF NOT EXISTS store_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (full_name, address)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        status TEXT NOT NULL DEFAULT 'Menunggu konfirmasi',
        total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
        customer_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        size TEXT NOT NULL,
        color TEXT NOT NULL,
        color_hex TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_status);
      CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);
  }

  // Inserts default store and shoe catalog data without overwriting user records.
  seedInitialData() {
    const seedData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const insertSetting = this.db.prepare(
      "INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)",
    );
    const settings = {
      ...seedData.settings,
      whatsappNumber:
        process.env.WHATSAPP_NUMBER || seedData.settings.whatsappNumber,
    };
    for (const [key, value] of Object.entries(settings)) {
      insertSetting.run(key, String(value));
    }

    if (!this.db.prepare("SELECT 1 FROM admin_users LIMIT 1").get()) {
      const { id, name, email, password } = seedData.admin;
      this.db
        .prepare(
          "INSERT INTO admin_users (id, name, email, password) VALUES (?, ?, ?, ?)",
        )
        .run(id, name, email, bcrypt.hashSync(password, 10));
    }

    const insertCategory = this.db.prepare(
      "INSERT OR IGNORE INTO product_categories (id, name, slug) VALUES (?, ?, ?)",
    );
    for (const category of seedData.categories) {
      insertCategory.run(category.id, category.name, category.slug);
    }

    this.db
      .prepare(`
        UPDATE product_categories SET name = ?, slug = ?
        WHERE id = 'cat_3' AND name = 'Sandals'
      `)
      .run("Sepatu Kasual", "sepatu-kasual");

    const insertProduct = this.db.prepare(`
      INSERT OR IGNORE INTO products
        (id, name, brand, category_id, price, stock_status, description, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const getSeedCategory = this.db.prepare(`
      SELECT id FROM product_categories
      WHERE id = ? OR name = ?
      ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
      LIMIT 1
    `);
    const categoryNames = new Map(
      seedData.categories.map((category) => [category.id, category.name]),
    );
    for (const product of seedData.products) {
      const categoryName = categoryNames.get(product.categoryId);
      const category = getSeedCategory.get(
        product.categoryId,
        categoryName,
        product.categoryId,
      );
      if (!category) {
        throw new Error(`Jenis sepatu untuk produk seed ${product.id} tidak ditemukan.`);
      }
      insertProduct.run(
        product.id,
        product.name,
        product.brand || "",
        category.id,
        product.price,
        product.stockStatus || "Tersedia",
        product.description || "",
        product.image || "",
      );
    }

    for (const [key, value] of Object.entries(settings)) {
      this.db
        .prepare(
          "UPDATE store_settings SET value = ? WHERE key = ? AND value = ''",
        )
        .run(String(value), key);
    }

    for (const product of seedData.products) {
      if (product.brand) {
        this.db
          .prepare("UPDATE products SET brand = ? WHERE id = ? AND brand = ''")
          .run(product.brand, product.id);
      }
    }

    this.db
      .prepare(
        "UPDATE store_settings SET value = ? WHERE key = 'tagline' AND value = ?",
      )
      .run(seedData.settings.tagline, "The best shoes in town");
    this.db
      .prepare(
        "UPDATE store_settings SET value = '' WHERE key = 'address' AND value = ?",
      )
      .run("123 Main St, Anytown, USA");
    this.db
      .prepare(
        "UPDATE store_settings SET value = '' WHERE key = 'phone' AND value = ?",
      )
      .run("555-1234");

    const legacyNames = new Map([
      ["prod_1", "Nike Air Max"],
      ["prod_2", "Adidas Ultraboost"],
      ["prod_3", "Timberland Classic Boots"],
      ["prod_4", "Birkenstock Arizona Sandals"],
    ]);
    const updateLegacyProduct = this.db.prepare(`
      UPDATE products
      SET name = ?, brand = ?, category_id = ?, description = ?, image = ?
      WHERE id = ? AND name = ?
    `);
    for (const product of seedData.products) {
      const legacyName = legacyNames.get(product.id);
      if (legacyName) {
        updateLegacyProduct.run(
          product.name,
          product.brand,
          product.categoryId,
          product.description,
          product.image,
          product.id,
          legacyName,
        );
      }
    }
  }

  seedProductVariants() {
    // Menambahkan warna dan ukuran awal hanya untuk produk yang belum memiliki variasi.
    const insertVariant = this.db.prepare(`
      INSERT OR IGNORE INTO product_variants
        (id, product_id, color, color_hex, size, stock)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const seedProducts = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")).products;
    const seededById = new Map(
      seedProducts.map((product) => [product.id, product]),
    );
    const products = this.db
      .prepare(`
        SELECT p.id, p.stock_status
        FROM products p
        WHERE NOT EXISTS (
          SELECT 1 FROM product_variants v WHERE v.product_id = p.id
        )
      `)
      .all();

    for (const product of products) {
      const seedProduct = seededById.get(product.id);
      const colors = seedProduct?.colors?.length
        ? seedProduct.colors
        : [
            {
              name: "Putih",
              hex: "#f5f5f0",
              sizes:
                seedProduct?.variants ||
                [
                  {
                    size: "40",
                    stock: product.stock_status === "Tersedia" ? 1 : 0,
                  },
                ],
            },
          ];
      for (const color of colors) {
        for (const variant of color.sizes) {
          insertVariant.run(
            randomUUID(),
            product.id,
            String(color.name).trim(),
            color.hex,
            String(variant.size).trim(),
            Math.max(0, Number(variant.stock) || 0),
          );
        }
      }
    }
    this.refreshStockStatuses();
  }

  // Synchronizes the product availability label with its variant inventory.
  refreshStockStatuses() {
    this.db.exec(`
      UPDATE products
      SET stock_status = CASE
        WHEN EXISTS (
          SELECT 1 FROM product_variants
          WHERE product_id = products.id AND stock > 0
        ) THEN 'Tersedia'
        ELSE 'Habis'
      END
    `);
  }

  // Reads store settings as a key/value object.
  getSettings() {
    return Object.fromEntries(
    this.db
      .prepare("SELECT key, value FROM store_settings")
      .all()
      .map(({ key, value }) => [key, value]),
    );
  }

  // Returns the public store profile and WhatsApp configuration.
  getStoreSettings() {
    const settings = this.getSettings();
    return {
      storeName: settings.storeName || "SepatuSuper",
      tagline: settings.tagline || "",
      address: settings.address || "",
      phone: settings.phone || "",
      whatsappNumber: settings.whatsappNumber || "",
      currency: settings.currency || "Rp",
      activeWhatsApp: settings.activeWhatsApp !== "false",
    };
  }

  // Saves only the store settings supplied by an administrator.
  updateStoreSettings(newSettings) {
    const updateSetting = this.db.prepare(`
      INSERT INTO store_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    for (const [key, value] of Object.entries(newSettings)) {
      if (value !== undefined) updateSetting.run(key, String(value));
    }
    return this.getStoreSettings();
  }

  // Loads the administrator credential record used by the login endpoint.
  getAdmin() {
    return this.db
      .prepare("SELECT id, name, email, password FROM admin_users LIMIT 1")
      .get();
  }

  // Lists shoe types with the number of products assigned to each type.
  getCategories() {
    return this.db
      .prepare(`
        SELECT c.id, c.name, c.slug, c.created_at AS createdAt,
          COUNT(p.id) AS productCount
        FROM product_categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at ASC, c.name ASC
      `)
      .all();
  }

  // Looks up a shoe type by its identifier.
  getCategoryById(id) {
    return this.db
      .prepare("SELECT id, name, slug FROM product_categories WHERE id = ?")
      .get(id);
  }

  // Creates a shoe type with a URL-safe slug.
  addCategory(name) {
    const id = `cat-${randomUUID()}`;
    const slug = this.slugify(name);
    this.db
      .prepare("INSERT INTO product_categories (id, name, slug) VALUES (?, ?, ?)")
      .run(id, name, slug);
    return { id, name, slug, productCount: 0 };
  }

  // Updates a shoe type and returns null when it does not exist.
  updateCategory(id, name) {
    const slug = this.slugify(name);
    const result = this.db
      .prepare("UPDATE product_categories SET name = ?, slug = ? WHERE id = ?")
      .run(name, slug, id);
    return result.changes ? { id, name, slug } : null;
  }

  // Deletes a shoe type when no product references it.
  deleteCategory(id) {
    const result = this.db
      .prepare("DELETE FROM product_categories WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // Converts a display name to a normalized URL slug.
  slugify(value) {
    return value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Queries products and attaches their available color and size variants.
  productQuery(where = "", params = []) {
    const products = this.db
      .prepare(`
        SELECT p.id, p.name, p.brand, p.category_id AS categoryId,
          c.name AS categoryName, p.price, p.description, p.image,
          p.created_at AS createdAt, p.updated_at AS updatedAt
        FROM products p
        JOIN product_categories c ON c.id = p.category_id
        ${where}
        ORDER BY p.created_at DESC, p.name ASC
      `)
      .all(...params);
    return this.attachVariants(products);
  }

  // Adds stock variants and color choices to each product result.
  attachVariants(products) {
    const getVariants = this.db.prepare(`
      SELECT id, color, color_hex AS colorHex, size, stock
      FROM product_variants
      WHERE product_id = ?
      ORDER BY color, CAST(size AS REAL), size
    `);
    return products.map((product) => {
      const variants = getVariants.all(product.id);
      const stockCount = variants.reduce((total, variant) => total + variant.stock, 0);
      const colors = [
        ...new Map(
          variants.map(({ color, colorHex }) => [
            color.toLocaleLowerCase("id"),
            { name: color, hex: colorHex },
          ]),
        ).values(),
      ];
      return {
        ...product,
        variants,
        colors,
        stockCount,
        stockStatus: stockCount > 0 ? "Tersedia" : "Habis",
      };
    });
  }

  // Lists products filtered by shoe type, stock status, or search text.
  getProducts(filters = {}) {
    const conditions = [];
    const params = [];
    if (filters.categoryId) {
      conditions.push("p.category_id = ?");
      params.push(filters.categoryId);
    }
    if (filters.stockStatus === "Tersedia") {
      conditions.push("EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock > 0)");
    } else if (filters.stockStatus === "Habis") {
      conditions.push("NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock > 0)");
    }
    if (filters.search) {
      conditions.push("(LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(p.description) LIKE ?)");
      const query = `%${filters.search.toLowerCase()}%`;
      params.push(query, query, query);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.productQuery(where, params);
  }

  // Retrieves one product with its color, size, and stock variants.
  getProductById(id) {
    return this.productQuery("WHERE p.id = ?", [id])[0] || null;
  }

  // Replaces the product's color/size inventory inside the active transaction.
  replaceVariants(productId, variants) {
    this.db
      .prepare("DELETE FROM product_variants WHERE product_id = ?")
      .run(productId);
    const insertVariant = this.db.prepare(`
      INSERT INTO product_variants
        (id, product_id, color, color_hex, size, stock)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const variant of variants) {
      insertVariant.run(
        randomUUID(),
        productId,
        String(variant.color).trim(),
        variant.colorHex,
        String(variant.size).trim(),
        Number(variant.stock),
      );
    }
  }

  // Creates a shoe and all its color/size inventory atomically.
  addProduct(productData) {
    const id = `prod-${randomUUID()}`;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(`
          INSERT INTO products
            (id, name, brand, category_id, price, stock_status, description, image)
          VALUES (?, ?, ?, ?, ?, 'Tersedia', ?, ?)
        `)
        .run(
          id,
          productData.name,
          productData.brand || "",
          productData.categoryId,
          Number(productData.price),
          productData.description || "",
          productData.image || "",
        );
      this.replaceVariants(id, productData.variants);
      this.refreshStockStatuses();
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getProductById(id);
  }

  // Updates product details and replaces variant inventory when provided.
  updateProduct(id, productData) {
    const current = this.getProductById(id);
    if (!current) return null;

    const updated = {
      name: productData.name ?? current.name,
      brand: productData.brand ?? current.brand,
      categoryId: productData.categoryId ?? current.categoryId,
      price: productData.price === undefined ? current.price : Number(productData.price),
      description: productData.description ?? current.description,
      image: productData.image ?? current.image,
    };

    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(`
          UPDATE products
          SET name = ?, brand = ?, category_id = ?, price = ?, description = ?,
            image = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .run(
          updated.name,
          updated.brand,
          updated.categoryId,
          updated.price,
          updated.description,
          updated.image,
          id,
        );
      if (productData.variants !== undefined) {
        this.replaceVariants(id, productData.variants);
      }
      this.refreshStockStatuses();
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getProductById(id);
  }

  // Toggles availability by setting all shoe variants to zero or one pair.
  toggleStock(id) {
    const product = this.getProductById(id);
    if (!product) return null;
    const stock = product.stockCount > 0 ? 0 : 1;
    this.db
      .prepare("UPDATE product_variants SET stock = ? WHERE product_id = ?")
      .run(stock, id);
    this.refreshStockStatuses();
    return this.getProductById(id);
  }

  // Deletes a shoe while preserving order line snapshots.
  deleteProduct(id) {
    return (
      this.db.prepare("DELETE FROM products WHERE id = ?").run(id).changes > 0
    );
  }

  // Records customer information, an order, and its shoe snapshot atomically.
  createOrder(orderData) {
    const id = `order-${randomUUID()}`;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(`
          INSERT INTO customers (id, full_name, address)
          VALUES (?, ?, ?)
          ON CONFLICT(full_name, address) DO NOTHING
        `)
        .run(randomUUID(), orderData.buyerName, orderData.address);
      const customer = this.db
        .prepare("SELECT id FROM customers WHERE full_name = ? AND address = ?")
        .get(orderData.buyerName, orderData.address);
      this.db
        .prepare(`
          INSERT INTO orders (id, customer_id, status, total_amount, customer_note)
          VALUES (?, ?, 'Menunggu konfirmasi', ?, ?)
        `)
        .run(
          id,
          customer.id,
          orderData.product.price * orderData.quantity,
          orderData.note,
        );
      this.db
        .prepare(`
          INSERT INTO order_items (
            id, order_id, product_id, product_name, brand, size,
            color, color_hex, quantity, unit_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          randomUUID(),
          id,
          orderData.product.id,
          orderData.product.name,
          orderData.product.brand,
          orderData.variant.size,
          orderData.variant.color,
          orderData.variant.colorHex,
          orderData.quantity,
          orderData.product.price,
        );
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getOrderById(id);
  }

  // Loads a customer, order status, product snapshot, and WhatsApp order details.
  getOrderById(id) {
    return (
      this.db
        .prepare(`
          SELECT o.id, o.status, o.total_amount AS totalAmount,
            o.customer_note AS note, o.created_at AS createdAt,
            o.updated_at AS updatedAt,
            c.full_name AS buyerName, c.address,
            i.product_id AS productId, i.product_name AS productName,
            i.brand, i.size, i.color, i.color_hex AS colorHex,
            i.quantity, i.unit_price AS unitPrice
          FROM orders o
          JOIN customers c ON c.id = o.customer_id
          JOIN order_items i ON i.order_id = o.id
          WHERE o.id = ?
        `)
        .get(id) || null
    );
  }

  // Lists recent orders for the authenticated admin.
  getOrders() {
    return this.db
      .prepare(`
        SELECT o.id, o.status, o.total_amount AS totalAmount,
          o.customer_note AS note, o.created_at AS createdAt,
          o.updated_at AS updatedAt,
          c.full_name AS buyerName, c.address,
          i.product_id AS productId, i.product_name AS productName,
          i.brand, i.size, i.color, i.color_hex AS colorHex,
          i.quantity, i.unit_price AS unitPrice
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        JOIN order_items i ON i.order_id = o.id
        ORDER BY o.created_at DESC
      `)
      .all();
  }

  // Updates an order status and records when the administrator changed it.
  updateOrderStatus(id, status) {
    const result = this.db
      .prepare(`
        UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(status, id);
    return result.changes ? this.getOrderById(id) : null;
  }

  // Lists unique customers with order counts and their most recent order.
  getCustomers() {
    return this.db
      .prepare(`
        SELECT c.id, c.full_name AS fullName, c.address,
          COUNT(o.id) AS orderCount, MAX(o.created_at) AS lastOrderAt
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id
        ORDER BY lastOrderAt DESC
      `)
      .all();
  }

  // Builds dashboard and report metrics from completed and pending orders.
  getOrderSummary() {
    const totals = this.db
      .prepare(`
        SELECT COUNT(*) AS orderCount,
          SUM(CASE WHEN status = 'Menunggu konfirmasi' THEN 1 ELSE 0 END) AS pendingCount,
          SUM(CASE WHEN status = 'Selesai' THEN total_amount ELSE 0 END) AS revenue,
          SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END) AS completedCount
        FROM orders
      `)
      .get();
    const topBrands = this.db
      .prepare(`
        SELECT i.brand, SUM(i.quantity) AS pairsSold
        FROM order_items i
        JOIN orders o ON o.id = i.order_id
        WHERE o.status = 'Selesai' AND i.brand != ''
        GROUP BY i.brand
        ORDER BY pairsSold DESC, i.brand ASC
        LIMIT 5
      `)
      .all();
    return {
      ...totals,
      orderCount: totals.orderCount || 0,
      pendingCount: totals.pendingCount || 0,
      revenue: totals.revenue || 0,
      completedCount: totals.completedCount || 0,
      customerCount: this.getCustomers().length,
      topBrands,
    };
  }
}

export const db = new StoreDatabase();
