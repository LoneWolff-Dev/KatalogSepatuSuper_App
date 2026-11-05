import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDashboard from "./components/adminWorkspace.jsx";
import AdminLogin from "./components/adminLogin.jsx";
import CategoryPills from "./components/productTypeFilter.jsx";
import OrderModal from "./components/shoeOrderModal.jsx";
import ProductCard from "./components/shoeProductCard.jsx";
import SiteHeader from "./components/siteHeader.jsx";
import {
  getAdminToken,
  getCategories,
  getProducts,
  getStoreSettings,
  normalizeWhatsAppNumber,
  setAdminToken,
} from "./services/api.js";
import { getProductBadge } from "./services/catalogMeta.js";
import "./storefront.css";
import "./admin.css";
import "./figma.css";

const defaultSettings = {
  storeName: "SepatuSuper",
  tagline: "Temukan sepatu yang pas untuk setiap langkah.",
  activeWhatsApp: true,
  whatsappNumber: "",
};

// Keeps the browser route in sync with public and administrator navigation.
function useCurrentPath() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Updates the active page when the visitor navigates with browser controls.
  useEffect(() => {
    function syncPath() {
      setCurrentPath(window.location.pathname);
    }
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  // Changes the application route without triggering a full page reload.
  const navigate = useCallback((path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  }, []);

  return [currentPath, navigate];
}

// Renders the public catalog or the protected SepatuSuper administration.
function App() {
  const [currentPath, navigate] = useCurrentPath();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortOrder, setSortOrder] = useState("popular");
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Clears the administrator session and returns to the login page.
  const handleLogout = useCallback(() => {
    setAdminToken("");
    navigate("/admin/login");
  }, [navigate]);

  // Opens the appropriate admin page while keeping the storefront unchanged.
  const handleAdminLogin = useCallback(() => {
    navigate("/admin");
  }, [navigate]);

  // Loads public catalog data and reports API failures to the visitor.
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productData, categoryData, storeData] = await Promise.all([
        getProducts(),
        getCategories(),
        getStoreSettings(),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setSettings({ ...defaultSettings, ...storeData });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentPath.startsWith("/admin")) loadCatalog();
  }, [currentPath, loadCatalog]);

  const brands = useMemo(
    () => [...new Set(products.map((product) => product.brand).filter(Boolean))].sort(),
    [products],
  );

  // Filters and sorts shoes by the visitor's selected catalog controls.
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    const filtered = products.filter((product) => {
      const matchesType =
        selectedType === "all" || product.categoryId === selectedType;
      const matchesBrand =
        selectedBrand === "all" || product.brand === selectedBrand;
      const searchableText = [
        product.name,
        product.brand,
        product.categoryName,
        product.description,
      ]
        .join(" ")
        .toLocaleLowerCase("id");
      return matchesType && matchesBrand && (!query || searchableText.includes(query));
    });
    return filtered.sort((first, second) => {
      if (sortOrder === "price-low") return first.price - second.price;
      if (sortOrder === "price-high") return second.price - first.price;
      if (sortOrder === "name") return first.name.localeCompare(second.name, "id");
      return second.stockCount - first.stockCount;
    });
  }, [products, search, selectedBrand, selectedType, sortOrder]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const normalizedWhatsAppNumber = normalizeWhatsAppNumber(settings.whatsappNumber);
  const displayedProducts = visibleProducts.slice(
    (catalogPage - 1) * pageSize,
    catalogPage * pageSize,
  );

  useEffect(() => {
    setCatalogPage(1);
  }, [search, selectedBrand, selectedType, sortOrder]);

  if (currentPath.startsWith("/admin")) {
    if (getAdminToken()) {
      return <AdminDashboard onLogout={handleLogout} />;
    }
    return <AdminLogin onAuthenticated={handleAdminLogin} />;
  }

  return (
    <>
      <div className="announcement-bar">
        PILIH SEPATUNYA. LANJUTKAN CERITAMU. <span>Pesan langsung via WhatsApp ↗</span>
      </div>
      <SiteHeader
        storeName={settings.storeName}
        whatsappNumber={settings.whatsappNumber}
        searchValue={search}
        onSearchChange={setSearch}
      />
      <main>
        <section className="hero-section" id="beranda">
          <div className="hero-copy">
            <p className="hero-kicker">
              <span /> BUKAN SEKADAR SEPATU / SEPATU SUPER
            </p>
            <h1>
              Gaya boleh beda.
              <br />
              <span>Langkah tetap kamu.</span>
            </h1>
            <p className="hero-description">
              Dari rutinitas kota hingga agenda akhir pekan. Temukan pasangan yang pas.
            </p>
          </div>
          <div className="hero-feature">
            <div className="hero-feature-copy">
              <p>THE EVERYDAY EDIT</p>
              <h2>Klasik yang selalu<br />punya tempat.</h2>
              <span>
                Nike, Adidas, New Balance, dan pilihan lainnya.<br />
                Pilih modelmu, kami bantu cek ukuran dan stoknya.
              </span>
              <a href="#koleksi">Temukan pasanganmu <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>

        <section className="brand-filter-strip" aria-label="Filter merek">
          <span>MEREK</span>
          <CategoryPills
            categories={brands.map((brand) => ({ id: brand, name: brand }))}
            selectedType={selectedBrand}
            onSelect={setSelectedBrand}
            allLabel="Semua merek"
          />
          <label className="catalogTypeSelect">
            <span className="visuallyHidden">Filter jenis sepatu</span>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
            >
              <option value="all">Semua jenis</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="catalog-section" id="koleksi">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DIKURASI UNTUK LANGKAHMU</p>
              <h2>Koleksi pilihan. Gaya tanpa batas.</h2>
            </div>
            <div className="catalogSort">
              <span>{visibleProducts.length} produk</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                aria-label="Urutkan produk"
              >
                <option value="popular">Paling populer</option>
                <option value="price-low">Harga terendah</option>
                <option value="price-high">Harga tertinggi</option>
                <option value="name">Nama produk</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="catalog-message" role="status">
              <span className="loading-dot" /> Memuat koleksi sepatu...
            </div>
          ) : error ? (
            <div className="catalog-message error-message" role="alert">
              <p>Koleksi belum dapat dimuat. {error}</p>
              <button type="button" onClick={loadCatalog}>Coba lagi</button>
            </div>
          ) : visibleProducts.length ? (
            <>
              <div className="catalog-count">
                Menampilkan <strong>{(catalogPage - 1) * pageSize + 1}–{Math.min(catalogPage * pageSize, visibleProducts.length)}</strong> dari {visibleProducts.length} produk
              </div>
              <div className="product-grid">
                {displayedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    badge={getProductBadge(product, products.indexOf(product))}
                    onSelect={setSelectedProduct}
                  />
                ))}
              </div>
              {pageCount > 1 && (
                <nav className="catalogPagination" aria-label="Halaman produk">
                  <button
                    type="button"
                    onClick={() => setCatalogPage((page) => Math.max(1, page - 1))}
                    disabled={catalogPage === 1}
                    aria-label="Halaman sebelumnya"
                  >
                    ‹
                  </button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={catalogPage === page ? "active" : ""}
                      onClick={() => setCatalogPage(page)}
                      aria-current={catalogPage === page ? "page" : undefined}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCatalogPage((page) => Math.min(pageCount, page + 1))}
                    disabled={catalogPage === pageCount}
                    aria-label="Halaman berikutnya"
                  >
                    ›
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="catalog-message empty-message">
              <span className="empty-mark" aria-hidden="true">⌕</span>
              <h3>Belum menemukan yang cocok?</h3>
              <p>Coba kata kunci atau kategori lainnya.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedType("all");
                }}
              >
                Hapus filter
              </button>
            </div>
          )}
        </section>

        <section className="service-strip" id="cara-pesan">
          <div>
            <span className="serviceIcon"><img src="/images/figma/icons/message-circle.svg" alt="" /></span>
            <span><strong>Pesan tanpa ribet</strong><small>Pilih sepatu, lanjutkan di WhatsApp.</small></span>
          </div>
          <div>
            <span className="serviceIcon"><img src="/images/figma/icons/package-check.svg" alt="" /></span>
            <span><strong>Dicek sebelum dikirim</strong><small>Setiap pasang siap menemani langkahmu.</small></span>
          </div>
          <div>
            <span className="serviceIcon"><img src="/images/figma/icons/truck.svg" alt="" /></span>
            <span><strong>Kirim ke seluruh Indonesia</strong><small>Ongkir dikonfirmasi langsung oleh admin.</small></span>
          </div>
        </section>
      </main>
      <footer className="site-footer" id="tentang">
        <div className="footerMain">
          <div>
            <a className="brand-lockup" href="#beranda">
              <span className="brand-mark" aria-hidden="true">
                <img src="/images/figma/icons/brand-mark.svg" alt="" />
              </span>
              <span>{settings.storeName}</span>
            </a>
            <h2>Sepatu pilihan. Cerita milikmu.</h2>
            <p>Butuh bantuan memilih ukuran? Obrolkan dulu dengan admin sebelum melangkah.</p>
          </div>
          <nav aria-label="Jelajahi"><strong>JELAJAHI</strong><a href="#koleksi">Koleksi sepatu</a><a href="#koleksi">Pilihan merek</a><a href="#tentang">Tentang kami</a></nav>
          <nav aria-label="Bantuan">
            <strong>BUTUH BANTUAN?</strong>
            <a href="#cara-pesan">Cara pesan</a>
            <a href="#koleksi">Panduan ukuran</a>
            {normalizedWhatsAppNumber ? (
              <a href={`https://wa.me/${normalizedWhatsAppNumber}`} target="_blank" rel="noreferrer">WhatsApp admin ↗</a>
            ) : (
              <a href="#koleksi">Tanya admin toko</a>
            )}
          </nav>
        </div>
        <div className="footerLegal">
          <span>© {new Date().getFullYear()} {settings.storeName}. Setiap langkah punya cerita.</span>
          <a href="#koleksi">Pilih → Chat → Melangkah</a>
        </div>
      </footer>
      {selectedProduct && (
        <OrderModal
          key={selectedProduct.id}
          product={selectedProduct}
          settings={settings}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}

export default App;
