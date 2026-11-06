import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteProduct,
  formatPrice,
  createProduct,
  getAdminWorkspace,
  getCurrentAdmin,
  setAdminToken,
  toggleProductStock,
  updateProduct,
  updateOrderStatus,
  updateStoreSettings,
} from "../services/api.js";
import {
  getAvailableSizes,
  getProductColorLabel,
  getProductSku,
} from "../services/catalogMeta.js";
import AdminConfirmDialog from "./adminConfirmDialog.jsx";
import ProductFormModal from "./productEditorModal.jsx";
import { getPageItems } from "./Pagination.jsx";
import ToastStack, { useToasts } from "./Toast.jsx";

const pageSize = 6;
const orderStatuses = [
  "Menunggu konfirmasi",
  "Diproses",
  "Selesai",
  "Dibatalkan",
];
const navigationItems = [
  { id: "overview", label: "Ringkasan", icon: "/images/figma/icons/layout-dashboard.svg" },
  { id: "products", label: "Kelola Produk", icon: "/images/figma/icons/package-2.svg" },
  { id: "orders", label: "Pesanan", icon: "/images/figma/icons/shopping-bag.svg" },
  { id: "customers", label: "Pelanggan", icon: "/images/figma/icons/users.svg" },
  { id: "reports", label: "Laporan", icon: "/images/figma/icons/chart.svg" },
  { id: "settings", label: "Pengaturan", icon: "/images/figma/icons/settings.svg" },
];

// Formats dates using the language and date conventions used by the store.
function formatStoreDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

// Returns a readable stock state for a product card or table row.
function getStockLabel(product) {
  if (!product.stockCount) return "Habis";
  if (product.stockCount <= 5) return "Menipis";
  return "Aman";
}

// Displays secure product, order, customer, report, and store management.
function AdminDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const [admin, setAdmin] = useState(null);
  const [workspace, setWorkspace] = useState({
    products: [],
    categories: [],
    settings: {},
    orders: [],
    customers: [],
    summary: {},
  });
  const [productForm, setProductForm] = useState(null);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsDraft, setSettingsDraft] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const desktopNotificationMenuRef = useRef(null);
  const mobileNotificationMenuRef = useRef(null);
  const { toasts, push: notify, dismiss: dismissToast } = useToasts();

  // Mirror inline banners into the pretty toast stack.
  const lastNotice = useRef("");
  const lastError = useRef("");
  useEffect(() => {
    if (notice && notice !== lastNotice.current) {
      lastNotice.current = notice;
      notify("success", notice);
    }
  }, [notice, notify]);
  useEffect(() => {
    if (error && error !== lastError.current) {
      lastError.current = error;
      notify("error", error);
    }
  }, [error, notify]);

  // Loads administrator identity and all management data from protected APIs.
  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [currentAdmin, data] = await Promise.all([
        getCurrentAdmin(),
        getAdminWorkspace(),
      ]);
      setAdmin(currentAdmin);
      setWorkspace(data);
      setSettingsDraft(data.settings);
    } catch (loadError) {
      if (loadError.status === 401 || loadError.status === 403) {
        setAdminToken("");
        onLogout();
      } else {
        setError(loadError.message);
      }
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  // Loads protected workspace data when the admin screen is first opened.
  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    return workspace.products.filter((product) => {
      const matchesSearch = [
        product.name,
        product.brand,
        product.categoryName,
      ]
        .join(" ")
        .toLocaleLowerCase("id")
        .includes(query);
      const matchesBrand = brandFilter === "all" || product.brand === brandFilter;
      const matchesType =
        typeFilter === "all" || product.categoryId === typeFilter;
      const stockLabel = getStockLabel(product);
      const matchesStock = statusFilter === "all" || stockLabel === statusFilter;
      return matchesSearch && matchesBrand && matchesType && matchesStock;
    });
  }, [brandFilter, search, statusFilter, typeFilter, workspace.products]);

  const visibleProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [currentPage, filteredProducts]);

  const visibleOrders = useMemo(() => {
    const start = (ordersPage - 1) * pageSize;
    return workspace.orders.slice(start, start + pageSize);
  }, [ordersPage, workspace.orders]);

  const visibleCustomers = useMemo(() => {
    const start = (customersPage - 1) * pageSize;
    return workspace.customers.slice(start, start + pageSize);
  }, [customersPage, workspace.customers]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const ordersPageCount = Math.max(1, Math.ceil(workspace.orders.length / pageSize));
  const customersPageCount = Math.max(1, Math.ceil(workspace.customers.length / pageSize));
  const totalPairs = workspace.products.reduce(
    (total, product) => total + product.stockCount,
    0,
  );
  const lowStockCount = workspace.products.filter(
    (product) => product.stockCount > 0 && product.stockCount <= 5,
  ).length;
  const adminNotifications = useMemo(() => {
    const pendingCount = workspace.orders.filter(
      (order) => order.status === "Menunggu konfirmasi",
    ).length;
    const lowStockProducts = workspace.products.filter(
      (product) => product.stockCount <= 5,
    );
    const outOfStockCount = lowStockProducts.filter((product) => product.stockCount === 0).length;
    return [
      ...(pendingCount
        ? [{
            id: "pending-orders",
            title: `${pendingCount} pesanan menunggu konfirmasi`,
            detail: "Tinjau pesanan baru agar bisa segera diproses.",
            icon: "/images/figma/icons/shopping-bag.svg",
            target: "orders",
            tone: "order",
          }]
        : []),
      ...(lowStockProducts.length
        ? [{
            id: "low-stock",
            title: `${lowStockProducts.length} produk perlu dicek`,
            detail: outOfStockCount
              ? `${outOfStockCount} produk habis, sisanya memiliki stok 5 pasang atau kurang.`
              : "Stok tersisa 5 pasang atau kurang.",
            icon: "/images/figma/icons/triangle-alert.svg",
            target: "products",
            tone: "stock",
          }]
        : []),
    ];
  }, [workspace.orders, workspace.products]);
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
    setOrdersPage((page) => Math.min(page, ordersPageCount));
    setCustomersPage((page) => Math.min(page, customersPageCount));
  }, [customersPageCount, ordersPageCount, pageCount]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    function closeNotifications(event) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      } else if (
        ![desktopNotificationMenuRef.current, mobileNotificationMenuRef.current]
          .some((menu) => menu?.contains(event.target))
      ) {
        setNotificationsOpen(false);
      }
    }
    window.addEventListener("keydown", closeNotifications);
    window.addEventListener("pointerdown", closeNotifications);
    return () => {
      window.removeEventListener("keydown", closeNotifications);
      window.removeEventListener("pointerdown", closeNotifications);
    };
  }, [notificationsOpen]);

  // Changes the active dashboard section and resets product pagination.
  function handleNavigate(page) {
    setNotificationsOpen(false);
    setProductForm(null);
    setActivePage(page);
    setCurrentPage(1);
    setOrdersPage(1);
    setCustomersPage(1);
    setNotice("");
  }

  // Creates or updates a product and refreshes the dashboard after success.
  async function handleSaveProduct(formData) {
    if (productForm?.id) {
      await updateProduct(productForm.id, formData);
    } else {
      await createProduct(formData);
    }
    setProductForm(null);
    setActivePage("products");
    setNotice(productForm?.id ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.");
    await loadWorkspace();
  }

  // Opens the in-app confirmation before removing a product.
  async function handleDeleteProduct(product) {
    setProductToDelete(product);
  }

  // Removes the confirmed product while preserving its order history.
  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    setDeletingProduct(true);
    try {
      await deleteProduct(productToDelete.id);
      setNotice(`${productToDelete.name} berhasil dihapus.`);
      setProductToDelete(null);
      await loadWorkspace();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingProduct(false);
    }
  }

  // Updates a product availability state and refreshes stock totals.
  async function handleToggleStock(product) {
    try {
      await toggleProductStock(product.id);
      setNotice(`Stok ${product.name} berhasil diperbarui.`);
      await loadWorkspace();
    } catch (stockError) {
      setError(stockError.message);
    }
  }

  // Updates one order status without removing the stored customer record.
  async function handleOrderStatusChange(orderId, status) {
    try {
      await updateOrderStatus(orderId, status);
      setNotice("Status pesanan berhasil diperbarui.");
      await loadWorkspace();
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  // Saves the store profile and WhatsApp number from the settings page.
  async function handleSaveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    setError("");
    try {
      const settings = await updateStoreSettings(settingsDraft);
      setSettingsDraft(settings);
      setWorkspace((currentWorkspace) => ({ ...currentWorkspace, settings }));
      setNotice("Pengaturan toko berhasil disimpan.");
    } catch (settingsError) {
      setError(settingsError.message);
    } finally {
      setSavingSettings(false);
    }
  }

  // Updates a store setting field while preserving the other current values.
  function handleSettingsChange(event) {
    const { name, value, checked, type } = event.target;
    setSettingsDraft((currentSettings) => ({
      ...currentSettings,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // Exports the current catalog into a UTF-8 CSV file for store records.
  function handleExportProducts() {
    const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Nama produk", "Merek", "Jenis sepatu", "Ukuran", "Harga", "Stok"],
      ...filteredProducts.map((product) => [
        product.name,
        product.brand,
        product.categoryName,
        product.variants.map((variant) => variant.size).join(", "),
        product.price,
        product.stockCount,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "katalog-sepatu.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Keeps table pagination controls and row ranges consistent across sections.
  function renderTablePagination(total, page, setPage, label) {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const firstItem = total ? (page - 1) * pageSize + 1 : 0;
    const lastItem = Math.min(page * pageSize, total);
    const items = getPageItems(page, lastPage);
    const go = (next) => setPage(Math.max(1, Math.min(lastPage, next)));
    return (
      <footer className="adminTableFooter" aria-label={`Navigasi halaman ${label}`}>
        <span className="adminTableRange">
          Menampilkan {firstItem}–{lastItem} dari {total} {label} · Halaman {page} dari {lastPage}
        </span>
        <div className="paginationControls">
          <button
            type="button"
            className="pagination-btn is-nav"
            onClick={() => go(page - 1)}
            disabled={page === 1}
            aria-label={`Halaman sebelumnya ${label}`}
          >
            <span aria-hidden="true">‹</span>
          </button>
          {items.map((item, i) =>
            item === "…" ? (
              <span key={`e-${i}`} className="pagination-ellipsis" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`pagination-btn ${item === page ? "active" : ""}`}
                onClick={() => go(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Halaman ${item} ${label}`}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className="pagination-btn is-nav"
            onClick={() => go(page + 1)}
            disabled={page >= lastPage}
            aria-label={`Halaman berikutnya ${label}`}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </footer>
    );
  }

  // Resolves the title shown in the workspace breadcrumb.
  function getPageTitle() {
    return navigationItems.find((item) => item.id === activePage)?.label ||
      (activePage === "settings" ? "Pengaturan" : "Ringkasan");
  }

  function renderNotifications(menuRef) {
    return (
      <div className="adminNotificationMenu" ref={menuRef}>
        <button
          type="button"
          className="adminNotificationButton"
          aria-label={`Notifikasi${adminNotifications.length ? `, ${adminNotifications.length} perlu diperiksa` : ""}`}
          aria-expanded={notificationsOpen}
          aria-haspopup="dialog"
          onClick={() => setNotificationsOpen((open) => !open)}
        >
          <img src="/images/figma/icons/notifications.svg" alt="" />
          {adminNotifications.length > 0 && (
            <span className="adminNotificationCount">{adminNotifications.length}</span>
          )}
        </button>
        {notificationsOpen && (
          <section className="adminNotificationPopover" role="dialog" aria-label="Notifikasi admin">
            <header>
              <div>
                <strong>Notifikasi</strong>
                <span>{adminNotifications.length ? `${adminNotifications.length} perlu ditinjau` : "Semua sudah diperiksa"}</span>
              </div>
              <button
                type="button"
                aria-label="Tutup notifikasi"
                onClick={() => setNotificationsOpen(false)}
              >
                ×
              </button>
            </header>
            {adminNotifications.length ? (
              <ul>
                {adminNotifications.map((item) => (
                  <li key={item.id} className={`adminNotificationItem ${item.tone}`}>
                    <span><img src={item.icon} alt="" /></span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <button
                        type="button"
                        onClick={() => handleNavigate(item.target)}
                      >
                        Tinjau sekarang <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adminNotificationEmpty">
                Tidak ada pesanan menunggu atau stok yang perlu diperiksa.
              </p>
            )}
          </section>
        )}
      </div>
    );
  }

  // Renders read-only store and order highlights for the dashboard landing page.
  function renderOverviewPage() {
    const recentOrders = workspace.orders.slice(0, pageSize);
    const topBrands = workspace.summary.topBrands || [];
    const maxPairs = Math.max(1, ...topBrands.map((b) => b.pairsSold || 0));
    const lowStock = workspace.products
      .filter((p) => p.stockCount <= 5)
      .sort((a, b) => a.stockCount - b.stockCount)
      .slice(0, 5);
    return (
      <div className="overviewLayout">
        <section className="duralux-kpi-row" aria-label="Indikator kunci">
          <div className="duralux-kpi">
            <span>Pendapatan selesai</span>
            <strong>{formatPrice(workspace.summary.revenue)}</strong>
            <small>{workspace.summary.completedCount || 0} pesanan selesai</small>
          </div>
          <div className="duralux-kpi">
            <span>Total pesanan</span>
            <strong>{workspace.summary.orderCount || workspace.orders.length}</strong>
            <small>{workspace.summary.pendingCount || 0} menunggu konfirmasi</small>
          </div>
          <div className="duralux-kpi">
            <span>Pelanggan</span>
            <strong>{workspace.summary.customerCount || workspace.customers.length}</strong>
            <small>Dari data pesanan tersimpan</small>
          </div>
          <div className="duralux-kpi">
            <span>Stok pasang</span>
            <strong>{totalPairs}</strong>
            <small>{workspace.products.length} model · {lowStockCount} menipis</small>
          </div>
        </section>

        <section className="adminStatsGrid overviewStatsGrid">
          <article className="adminStatCard featuredStat">
            <span className="statIcon"><img src="/images/figma/icons/package-2.svg" alt="" /></span>
            <span className="statLabel">Koleksi produk</span>
            <strong>{workspace.products.length} <small>model</small></strong>
            <p>{totalPairs} pasang stok tersedia di semua ukuran</p>
          </article>
          <article className="adminStatCard">
            <span className="statIcon warningIcon"><img src="/images/figma/icons/triangle-alert.svg" alt="" /></span>
            <span className="statLabel">Stok menipis</span>
            <strong>{lowStockCount} <small>model</small></strong>
            <p>Produk dengan stok 5 pasang atau kurang</p>
          </article>
          <article className="adminStatCard">
            <span className="statIcon trendIcon"><img src="/images/figma/icons/shopping-bag.svg" alt="" /></span>
            <span className="statLabel">Pesanan menunggu</span>
            <strong>{workspace.summary.pendingCount || 0}</strong>
            <p>Pesanan yang perlu dikonfirmasi</p>
          </article>
        </section>

        <div className="duralux-grid">
          <section className="adminTablePanel">
            <header className="adminPanelHeader">
              <h2>Penjualan merek <span>Top 5</span></h2>
              <button type="button" className="exportButton" onClick={() => handleNavigate("reports")}>Laporan →</button>
            </header>
            <div style={{ padding: "6px 14px 14px" }}>
              {topBrands.length ? (
                <>
                  <div className="duralux-mini-bars" role="img" aria-label={`Diagram batang merek terlaris, tertinggi ${topBrands[0].brand}`}>
                    {topBrands.map((brand) => (
                      <div
                        key={brand.brand}
                        className="bar"
                        title={`${brand.brand}: ${brand.pairsSold} pasang`}
                        style={{ height: `${Math.max(12, Math.round(((brand.pairsSold || 0) / maxPairs) * 100))}%` }}
                      />
                    ))}
                  </div>
                  <div className="brandReportList" style={{ padding: 0 }}>
                    {topBrands.map((brand, index) => (
                      <div className="brandReportRow" key={brand.brand}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{brand.brand}</strong>
                        <small>{brand.pairsSold} pasang terjual</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="emptyTableMessage">Data penjualan akan tersedia setelah pesanan selesai.</p>
              )}
            </div>
          </section>
          <section className="adminTablePanel">
            <header className="adminPanelHeader">
              <h2>Perlu perhatian <span>{lowStock.length}</span></h2>
              <button type="button" className="exportButton" onClick={() => handleNavigate("products")}>Lihat produk →</button>
            </header>
            <div style={{ padding: "4px 14px 12px", display: "grid", gap: 8 }}>
              {lowStock.length ? lowStock.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderBottom: "1px solid var(--line-soft)", padding: "8px 0" }}>
                  <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.brand} — {p.name}</strong><small style={{ color: "var(--muted)", fontSize: 11 }}>{p.categoryName}</small></span>
                  <span className={`stockStatusBadge ${p.stockCount === 0 ? "habis" : "menipis"}`}>{p.stockCount === 0 ? "Habis" : "Menipis"} · {p.stockCount}</span>
                </div>
              )) : (
                <p className="emptyTableMessage">Semua stok aman. 🎉</p>
              )}
            </div>
          </section>
        </div>

        <section className="adminTablePanel overviewRecentOrders">
          <header className="adminPanelHeader">
            <h2>Pesanan terbaru <span>{workspace.orders.length} total</span></h2>
            <button
              type="button"
              className="exportButton"
              onClick={() => handleNavigate("orders")}
            >
              Lihat semua
            </button>
          </header>
          <div className="adminTableScroll adminNonProductTable" tabIndex={0}>
            <table className="adminDataTable">
              <thead>
                <tr>
                  <th>Nomor pesanan</th>
                  <th>Pelanggan</th>
                  <th>Produk</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.id.slice(-8).toUpperCase()}</strong>
                      <small className="stockPairCount">{formatStoreDate(order.createdAt)}</small>
                    </td>
                    <td><strong>{order.buyerName}</strong></td>
                    <td>{order.brand} {order.productName}</td>
                    <td><strong className="tablePrice">{formatPrice(order.totalAmount)}</strong></td>
                    <td>
                      <span className={`orderStatusSummary ${order.status.toLocaleLowerCase("id").replaceAll(" ", "-")}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!recentOrders.length && (
                  <tr>
                    <td colSpan="5" className="emptyTableMessage">
                      Ringkasan pesanan akan muncul setelah pesanan pertama diterima.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // Renders the product catalog, filters, and stock management table.
  function renderProductsPage() {
    return (
      <>
        <section className="adminTablePanel">
          <header className="adminPanelHeader">
            <h2>Daftar produk <span>{filteredProducts.length} produk</span></h2>
            <button type="button" className="exportButton" onClick={handleExportProducts}>
              <img src="/images/figma/icons/download.svg" alt="" />
              Ekspor
            </button>
          </header>
          <div className="productFilters">
            <label className="adminSearchField">
              <span aria-hidden="true">
                <img src="/images/figma/icons/search.svg" alt="" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama produk atau merek..."
                aria-label="Cari produk"
              />
            </label>
            <select
              value={brandFilter}
              onChange={(event) => {
                setBrandFilter(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter merek"
            >
              <option value="all">Semua merek</option>
              {[...new Set(workspace.products.map((product) => product.brand))]
                .filter(Boolean)
                .sort()
                .map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter jenis sepatu"
            >
              <option value="all">Semua jenis</option>
              {workspace.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter status stok"
            >
              <option value="all">Semua status</option>
              <option value="Aman">Aman</option>
              <option value="Menipis">Menipis</option>
              <option value="Habis">Habis</option>
            </select>
          </div>
          <div className="mobileProductList">
            {visibleProducts.map((product) => {
              const stockLabel = getStockLabel(product);
              const availableSizes = getAvailableSizes(product);
              return (
                <article className="mobileProductCard" key={product.id}>
                  <div className="mobileProductIdentity">
                    <div className="mobileProductImage">
                      {product.image && <img src={product.image} alt="" loading="lazy" />}
                    </div>
                    <div>
                      <strong>{product.brand} – {product.name}</strong>
                      <small>{getProductSku(product)} · {getProductColorLabel(product)}</small>
                      <span>{product.categoryName}</span>
                      <b>{formatPrice(product.price)}</b>
                    </div>
                  </div>
                  <div className="mobileProductInventory">
                    <div>
                      <span>Ukuran tersedia (EU)</span>
                      <div className="mobileProductSizes">
                        {availableSizes.length
                          ? availableSizes.slice(0, 4).map((size) => <span key={size}>{size}</span>)
                          : <small>Tidak tersedia</small>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`stockStatusBadge ${stockLabel.toLocaleLowerCase("id")}`}
                      onClick={() => handleToggleStock(product)}
                      title="Klik untuk mengubah status stok"
                    >
                      <span /> {stockLabel}
                    </button>
                  </div>
                  <footer className="mobileProductActions">
                    <span>{product.stockCount} pasang</span>
                    <button
                      type="button"
                      onClick={() => setProductForm(product)}
                      aria-label={`Edit ${product.name}`}
                    >
                      <img src="/images/figma/icons/edit.svg" alt="" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="deleteAction"
                      onClick={() => handleDeleteProduct(product)}
                      aria-label={`Hapus ${product.name}`}
                    >
                      <img src="/images/figma/icons/trash.svg" alt="" />
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
          <div className="adminTableScroll">
            <table className="adminDataTable">
              <thead>
                <tr>
                  <th>Merek & nama model</th>
                  <th>Jenis sepatu</th>
                  <th>Ukuran tersedia</th>
                  <th>Harga</th>
                  <th>Status stok</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const stockLabel = getStockLabel(product);
                  const availableSizes = [
                    ...new Set(
                      product.variants
                        .filter((variant) => variant.stock > 0)
                        .map((variant) => variant.size),
                    ),
                  ];
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="tableProductIdentity">
                          <div className="tableProductImage">
                            {product.image && (
                              <img src={product.image} alt="" loading="lazy" />
                            )}
                          </div>
                          <div>
                            <strong>{product.brand} – {product.name}</strong>
                            <span>{product.brand} · {product.categoryName}</span>
                          </div>
                        </div>
                      </td>
                      <td>{product.categoryName}</td>
                      <td>
                        <div className="tableSizeList">
                          {availableSizes.length
                            ? availableSizes.map((size) => <span key={size}>{size}</span>)
                            : <span className="unavailableText">Tidak tersedia</span>}
                        </div>
                      </td>
                      <td><strong className="tablePrice">{formatPrice(product.price)}</strong></td>
                      <td>
                        <button
                          type="button"
                          className={`stockStatusBadge ${stockLabel.toLocaleLowerCase("id")}`}
                          onClick={() => handleToggleStock(product)}
                          title="Klik untuk mengubah status stok"
                        >
                          <span /> {stockLabel}
                        </button>
                        <small className="stockPairCount">{product.stockCount} pasang</small>
                      </td>
                      <td>
                        <div className="tableActions">
                          <button
                            type="button"
                            onClick={() => setProductForm(product)}
                            aria-label={`Edit ${product.name}`}
                            title="Edit produk"
                          >
                            <img src="/images/figma/icons/edit.svg" alt="" />
                          </button>
                          <button
                            type="button"
                            className="deleteAction"
                            onClick={() => handleDeleteProduct(product)}
                            aria-label={`Hapus ${product.name}`}
                            title="Hapus produk"
                          >
                            <img src="/images/figma/icons/trash.svg" alt="" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!visibleProducts.length && (
                  <tr>
                    <td colSpan="6" className="emptyTableMessage">
                      Tidak ada produk yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderTablePagination(
            filteredProducts.length,
            currentPage,
            setCurrentPage,
            "produk",
          )}
        </section>
      </>
    );
  }

  // Renders all customer orders and their editable fulfillment status.
  function renderOrdersPage() {
    return (
      <section className="adminTablePanel">
        <header className="adminPanelHeader">
          <h2>Pesanan pelanggan <span>{workspace.orders.length} pesanan</span></h2>
        </header>
        <div className="adminTableScroll adminNonProductTable" tabIndex={0}>
          <table className="adminDataTable orderDataTable">
            <thead>
              <tr>
                <th>Nomor pesanan</th>
                <th>Pelanggan & alamat</th>
                <th>Produk</th>
                <th>Ukuran / warna</th>
                <th>Total</th>
                <th>Status pesanan</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id.slice(-8).toUpperCase()}</strong>
                    <small className="stockPairCount">{formatStoreDate(order.createdAt)}</small>
                  </td>
                  <td>
                    <strong>{order.buyerName}</strong>
                    <span className="customerAddress">{order.address}</span>
                  </td>
                  <td>
                    <strong>{order.brand} {order.productName}</strong>
                    {order.note && <span className="customerAddress">{order.note}</span>}
                  </td>
                  <td>{order.size} / {order.color} × {order.quantity}</td>
                  <td><strong>{formatPrice(order.totalAmount)}</strong></td>
                  <td>
                    <select
                      className="orderStatusSelect"
                      value={order.status}
                      onChange={(event) => handleOrderStatusChange(order.id, event.target.value)}
                      aria-label={`Status pesanan ${order.id}`}
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!workspace.orders.length && (
                <tr>
                  <td colSpan="6" className="emptyTableMessage">
                    Belum ada pesanan masuk. Pesanan WhatsApp akan tercatat di sini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {renderTablePagination(
          workspace.orders.length,
          ordersPage,
          setOrdersPage,
          "pesanan",
        )}
      </section>
    );
  }

  // Renders unique customers and their saved shipping details.
  function renderCustomersPage() {
    return (
      <section className="adminTablePanel">
        <header className="adminPanelHeader">
          <h2>Daftar pelanggan <span>{workspace.customers.length} pelanggan</span></h2>
        </header>
        <div className="adminTableScroll adminNonProductTable" tabIndex={0}>
          <table className="adminDataTable">
            <thead>
              <tr>
                <th>Nama pelanggan</th>
                <th>Alamat pengiriman</th>
                <th>Total pesanan</th>
                <th>Pesanan terakhir</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.fullName}</strong></td>
                  <td>{customer.address}</td>
                  <td>{customer.orderCount} pesanan</td>
                  <td>{formatStoreDate(customer.lastOrderAt)}</td>
                </tr>
              ))}
              {!workspace.customers.length && (
                <tr>
                  <td colSpan="4" className="emptyTableMessage">
                    Data pelanggan akan muncul setelah pesanan pertama.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {renderTablePagination(
          workspace.customers.length,
          customersPage,
          setCustomersPage,
          "pelanggan",
        )}
      </section>
    );
  }

  // Renders completed sales, order activity, and best-selling shoe brands.
  function renderReportsPage() {
    return (
      <div className="reportLayout">
        <section className="adminStatsGrid">
          <article className="adminStatCard featuredStat">
            <span className="statLabel">Pendapatan pesanan selesai</span>
            <strong>{formatPrice(workspace.summary.revenue)}</strong>
            <p>Hanya pesanan berstatus selesai</p>
          </article>
          <article className="adminStatCard">
            <span className="statLabel">Pesanan selesai</span>
            <strong>{workspace.summary.completedCount || 0}</strong>
            <p>Total transaksi yang telah dikonfirmasi</p>
          </article>
          <article className="adminStatCard">
            <span className="statLabel">Menunggu konfirmasi</span>
            <strong>{workspace.summary.pendingCount || 0}</strong>
            <p>Pesanan baru dari katalog WhatsApp</p>
          </article>
        </section>
        <section className="adminTablePanel">
          <header className="adminPanelHeader">
            <h2>Merek terlaris</h2>
          </header>
          <div className="brandReportList">
            {(workspace.summary.topBrands || []).map((brand, index) => (
              <div className="brandReportRow" key={brand.brand}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{brand.brand}</strong>
                <small>{brand.pairsSold} pasang terjual</small>
              </div>
            ))}
            {!workspace.summary.topBrands?.length && (
              <p className="emptyTableMessage">
                Data penjualan akan tersedia setelah pesanan selesai.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  // Renders editable store identity and WhatsApp ordering settings.
  function renderSettingsPage() {
    return (
      <section className="adminTablePanel storeSettingsPanel">
        <header className="adminPanelHeader">
          <h2>Pengaturan toko</h2>
        </header>
        <form className="storeSettingsForm" onSubmit={handleSaveSettings}>
          <label>
            Nama toko
            <input name="storeName" value={settingsDraft.storeName || ""} onChange={handleSettingsChange} required />
          </label>
          <label>
            Tagline
            <input name="tagline" value={settingsDraft.tagline || ""} onChange={handleSettingsChange} />
          </label>
          <label>
            Nomor WhatsApp (kode negara)
            <input name="whatsappNumber" value={settingsDraft.whatsappNumber || ""} onChange={handleSettingsChange} placeholder="6281234567890" />
          </label>
          <label>
            Alamat toko
            <textarea name="address" value={settingsDraft.address || ""} onChange={handleSettingsChange} rows="3" />
          </label>
          <label className="whatsappSettingToggle">
            <input
              name="activeWhatsApp"
              type="checkbox"
              checked={Boolean(settingsDraft.activeWhatsApp)}
              onChange={handleSettingsChange}
            />
            Aktifkan pemesanan WhatsApp
          </label>
          <button type="submit" className="primaryButton" disabled={savingSettings}>
            {savingSettings ? "Menyimpan..." : "Simpan pengaturan"}
          </button>
        </form>
      </section>
    );
  }

  // Renders the signed-in administrator workspace and its navigation.
  function renderWorkspace() {
    let pageContent;
    if (activePage === "overview") pageContent = renderOverviewPage();
    else if (activePage === "products") pageContent = renderProductsPage();
    else if (activePage === "orders") pageContent = renderOrdersPage();
    else if (activePage === "customers") pageContent = renderCustomersPage();
    else if (activePage === "reports") pageContent = renderReportsPage();
    else if (activePage === "settings") pageContent = renderSettingsPage();

    return (
      <div className={`adminWorkspace${productForm ? " isEditingProduct" : ""}`}>
        <aside className="adminSidebar">
          <a className="adminBrand" href="/">
            <span><img src="/images/figma/icons/brand-mark.svg" alt="" /></span>
            SEPATU SUPER
          </a>
          <p className="adminNavCaption">WORKSPACE</p>
          <nav className="adminNavigation" aria-label="Menu admin">
            {navigationItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={activePage === item.id ? "active" : ""}
                aria-current={activePage === item.id ? "page" : undefined}
                onClick={() => handleNavigate(item.id)}
              >
                <span><img src={item.icon} alt="" /></span>
                {item.label}
              </button>
            ))}
          </nav>
          <a className="storeOnlineCard" href="/" target="_blank" rel="noreferrer">
            <span><img src="/images/figma/icons/status-green.svg" alt="" /> Toko online aktif</span>
            <strong>{workspace.settings.storeName || "SepatuSuper"}</strong>
            <small>Lihat toko <img src="/images/figma/icons/arrow-up-right.svg" alt="" /></small>
          </a>
          <div className="adminSidebarBottom">
            <a href="mailto:admin@sepatusuper.id">
              <img src="/images/figma/icons/circle-help.svg" alt="" /> Pusat bantuan
            </a>
            <div className="adminProfile">
              <span>{admin?.name?.slice(0, 1) || "A"}</span>
              <div><strong>{admin?.name || "Administrator"}</strong><small>Administrator</small></div>
              <button type="button" onClick={onLogout} aria-label="Keluar" title="Keluar">
                <img src="/images/figma/icons/log-out.svg" alt="" />
              </button>
            </div>
          </div>
        </aside>
        <main className="adminMain">
          {!productForm && (
            <>
              <header className="adminMobileHeader">
                <a className="adminMobileBrand" href="/">
                  <span><img src="/images/figma/icons/brand-mark.svg" alt="" /></span>
                  SEPATU SUPER
                </a>
                <div>
                  {!productForm && renderNotifications(mobileNotificationMenuRef)}
                  <span>{admin?.name?.slice(0, 2).toLocaleUpperCase("id") || "AP"}</span>
                  <button
                    type="button"
                    className="adminMobileLogout"
                    onClick={onLogout}
                    aria-label="Keluar dari admin"
                    title="Keluar"
                  >
                    <img src="/images/figma/icons/log-out.svg" alt="" />
                  </button>
                </div>
              </header>
              <a className="adminMobileStoreBanner" href="/" target="_blank" rel="noreferrer">
                <span><img src="/images/figma/icons/status-green.svg" alt="" /></span>
                <strong>{workspace.settings.storeName || "sepatusuper.id"}</strong>
                <span>Toko online aktif</span>
                <b>Lihat toko ↗</b>
              </a>
              <nav className="adminMobileNavigation" aria-label="Menu admin">
                {navigationItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={activePage === item.id ? "active" : ""}
                    aria-current={activePage === item.id ? "page" : undefined}
                    onClick={() => handleNavigate(item.id)}
                  >
                    <img src={item.icon} alt="" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </>
          )}
          <header className={`adminTopBar${productForm ? " productEditorTopBar" : ""}`}>
            <div>
              <a href="/">Workspace</a>
              <img src="/images/figma/icons/chevron-right.svg" alt="" />
              <strong>{productForm ? "Kelola Produk" : getPageTitle()}</strong>
              {productForm && (
                <>
                  <img src="/images/figma/icons/chevron-right.svg" alt="" />
                  <strong>{productForm.id ? "Edit produk" : "Tambah produk baru"}</strong>
                </>
              )}
            </div>
            <div className="adminTopBarActions">
              <time dateTime={new Date().toISOString()}>
                {formatStoreDate(new Date().toISOString())}
              </time>
              {!productForm && renderNotifications(desktopNotificationMenuRef)}
            </div>
          </header>
          {productForm ? (
            <section className="adminContent productEditorContent">
              <ProductFormModal
                product={productForm.id ? productForm : null}
                categories={workspace.categories}
                isPage
                onClose={() => setProductForm(null)}
                onSave={handleSaveProduct}
              />
            </section>
          ) : (
            <>
              <section className="adminContent">
                <header className="adminPageHeading">
                  <div>
                    <h1>{activePage === "products" ? "Kelola Produk" : getPageTitle()}</h1>
                    <p>
                      {activePage === "products"
                        ? "Atur koleksi, ukuran, harga, dan ketersediaan stok."
                        : activePage === "overview"
                          ? "Ringkasan stok dan aktivitas terbaru toko Anda."
                        : `Kelola ${getPageTitle().toLocaleLowerCase("id")} Sepatu Super.`}
                    </p>
                  </div>
                  <div className="adminHeadingActions">
                    {activePage === "products" && (
                      <button
                        type="button"
                        className="primaryButton"
                        onClick={() => setProductForm({})}
                      >
                        <img src="/images/figma/icons/plus.svg" alt="" />
                        Tambah Produk
                      </button>
                    )}
                  </div>
                </header>
                {notice && (
                  <div className="adminFeedback successFeedback" role="status">
                    <img src="/images/figma/icons/check.svg" alt="" />
                    <span>{notice}</span>
                    <button type="button" aria-label="Tutup notifikasi" onClick={() => setNotice("")}>×</button>
                  </div>
                )}
                {error && (
                  <div className="adminFeedback errorFeedback" role="alert">
                    <img src="/images/figma/icons/triangle-alert.svg" alt="" />
                    <span>{error}</span>
                    <button type="button" aria-label="Tutup pesan kesalahan" onClick={() => setError("")}>×</button>
                  </div>
                )}
                {pageContent}
              </section>
              <footer className="adminFooter">
                <span>© {new Date().getFullYear()} Sepatu Super</span>
                <span>Stok dan pesanan diperbarui secara langsung</span>
              </footer>
            </>
          )}
        </main>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        {productToDelete && (
          <AdminConfirmDialog
            title="Hapus produk ini?"
            message={`${productToDelete.name} akan dihapus dari katalog. Riwayat pesanan yang sudah tercatat tetap tersimpan.`}
            confirmLabel="Hapus produk"
            destructive
            busy={deletingProduct}
            onCancel={() => setProductToDelete(null)}
            onConfirm={confirmDeleteProduct}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return <main className="adminLoading"><span /> Memuat dashboard...</main>;
  }
  if (error && !admin) {
    return (
      <main className="adminLoading adminLoadError" role="alert">
        <p>{error}</p>
        <button type="button" className="primaryButton" onClick={loadWorkspace}>Coba lagi</button>
      </main>
    );
  }
  return renderWorkspace();
}

export default AdminDashboard;
