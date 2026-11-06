import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDashboard from "./components/adminWorkspace.jsx";
import AdminLogin from "./components/adminLogin.jsx";
import CategoryPills from "./components/productTypeFilter.jsx";
import OrderModal from "./components/shoeOrderModal.jsx";
import ProductCard from "./components/shoeProductCard.jsx";
import SiteHeader from "./components/siteHeader.jsx";
import TumbleDeckShowcase from "./components/TumbleDeckShowcase.jsx";
import DisplayCards from "./components/DisplayCards.jsx";
import SneakerHero from "./components/SneakerHero.jsx";
import ShadowBackground from "./components/ShadowBackground.jsx";
import DoodleFooter from "./components/DoodleFooter.jsx";
import Reveal from "./components/Reveal.jsx";
import CountUp from "./components/CountUp.jsx";
import Pagination from "./components/Pagination.jsx";
import ToastStack, { useToasts } from "./components/Toast.jsx";
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
import "./showcase.css";
import "./admin-theme.css";
import "./motion.css";
import "./polish.css";
import "./creative.css";
import "./toast.css";

const defaultSettings = {
  storeName: "SepatuSuper",
  tagline: "Temukan sepatu yang pas untuk setiap langkah.",
  activeWhatsApp: true,
  whatsappNumber: "",
};

// Keeps the browser route in sync with public and administrator navigation.
function useCurrentPath() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    function syncPath() {
      setCurrentPath(window.location.pathname);
    }
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  const navigate = useCallback((path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  }, []);

  return [currentPath, navigate];
}

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
  const { toasts, push: notify, dismiss: dismissToast } = useToasts();

  const handleLogout = useCallback(() => {
    setAdminToken("");
    navigate("/admin/login");
  }, [navigate]);

  const handleAdminLogin = useCallback(() => {
    navigate("/admin");
  }, [navigate]);

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
      notify("error", "Gagal memuat katalog", loadError.message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!currentPath.startsWith("/admin")) loadCatalog();
  }, [currentPath, loadCatalog]);

  const brands = useMemo(
    () => [...new Set(products.map((product) => product.brand).filter(Boolean))].sort(),
    [products],
  );

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

  const showcaseCards = useMemo(() => {
    const withImage = products.filter((product) => product.image);
    const ordered = [...withImage].sort((a, b) => b.stockCount - a.stockCount).slice(0, 8);
    if (ordered.length >= 3) {
      return ordered.map((product) => ({
        src: product.image,
        alt: `${product.brand} ${product.name}`,
      }));
    }
    const fallback = [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=900&q=80",
    ];
    return withImage.map((p) => ({ src: p.image, alt: `${p.brand} ${p.name}` })).concat(
      fallback.map((src, i) => ({ src, alt: `Koleksi sepatu ${i + 1}` })),
    );
  }, [products]);

  const categoryCards = useMemo(() => {
    const named = categories.filter((c) => c.name).slice(0, 3);
    const list = named.length ? named : [
      { id: "a", name: "Sneakers" },
      { id: "b", name: "Sepatu Kasual" },
      { id: "c", name: "Sepatu Lari" },
    ];
    const counts = {};
    products.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    const icons = [
      <img key="c1" src="/images/figma/icons/check.svg" alt="" />,
      <img key="c2" src="/images/figma/icons/trending-up.svg" alt="" />,
      <img key="c3" src="/images/figma/icons/arrow-up-right.svg" alt="" />,
    ];
    const titles = ["Paling dicari", "Favorit harian", "Baru masuk"];
    return list.map((c, i) => ({
      className: `dc-layer dc-layer-${i + 1}`,
      icon: icons[i % icons.length],
      title: titles[i % titles.length],
      description: c.name,
      date: `${counts[c.id] || 0} model tersedia`,
      label: c.name,
    }));
  }, [categories, products]);

  const totalPairs = useMemo(
    () => products.reduce((total, product) => total + (product.stockCount || 0), 0),
    [products],
  );
  const featuredProduct = useMemo(() => {
    const withStock = products.filter((p) => p.image && (p.stockCount || 0) > 0);
    if (!withStock.length) return products.find((p) => p.image) || products[0] || null;
    return [...withStock].sort((a, b) => b.stockCount - a.stockCount)[0];
  }, [products]);
  const totalSizes = useMemo(() => {
    const sizes = new Set();
    products.forEach((p) => (p.variants || []).forEach((v) => v.stock > 0 && sizes.add(v.size)));
    return sizes.size;
  }, [products]);

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
        {/* Morrow-style hero + ShadowBackground */}
        <div className="hero-shell">
          <ShadowBackground />
          <section className="morrow-hero" id="beranda">
          <p className="morrow-hero-eyebrow">Sneakers · Kasual · Boots · Lari — sejak {new Date().getFullYear()}</p>
          <h1>
            Sepatu pilihan.<br />
            <em>Langkah tetap kamu.</em>
          </h1>
          <div className="morrow-hero-sub">
            <p>{settings.tagline || "Temukan pasangan yang pas untuk setiap langkah. Jelajahi koleksi sneakers, sepatu kasual, boots, dan sepatu lari, lalu pesan langsung lewat WhatsApp."}</p>
            <div className="morrow-hero-actions">
              <a className="morrow-btn" href="#koleksi">Jelajahi koleksi ↗</a>
              <a className="morrow-btn morrow-btn-ghost" href="#cara-pesan">Cara pesan</a>
            </div>
          </div>
          </section>
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((half) => (
              <span key={half} style={{ display: "contents" }}>
                {["Sneakers", "Sepatu Kasual", "Boots", "Sepatu Lari", "Pesan via WhatsApp", "Kirim seluruh Indonesia"].map((item) => (
                  <span className="marquee-item" key={`${half}-${item}`}>{item}</span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <Reveal>
          <SneakerHero product={featuredProduct} onSelect={setSelectedProduct} />
        </Reveal>

        {/* TumbleDeckShowcase — galeri koleksi */}
        <section className="morrow-section" id="galeri" aria-label="Galeri koleksi">
          <div className="morrow-section-head">
            <div>
              <p className="morrow-kicker">Galeri koleksi · 2024 — 2026</p>
              <h2>Sorotan <em>pilihan</em> minggu ini</h2>
            </div>
            <p>Foto model terbaru dari katalog. Scroll, drag, atau klik untuk membalik tumpukan kartu.</p>
          </div>
          <Reveal>
            <div className="showcase-frame">
              <div className="showcase-hint">
                <span><strong>Geser ke atas / bawah</strong> untuk membalik kartu</span>
                <span>{showcaseCards.length} model</span>
              </div>
              <TumbleDeckShowcase cards={showcaseCards} height="62svh" />
            </div>
          </Reveal>
        </section>

        {/* Katalog */}
        <div className="brand-filter-strip" aria-label="Filter merek">
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
        </div>

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
              <Pagination
                page={catalogPage}
                pageCount={pageCount}
                onChange={setCatalogPage}
                label="Halaman produk"
                className="catalogPagination"
              />
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

        {/* DisplayCards — kategori */}
        <section className="morrow-section" id="kategori" aria-label="Jelajahi kategori">
          <div className="morrow-section-head">
            <div>
              <p className="morrow-kicker">Jelajahi koleksi</p>
              <h2>Mulai dari <em>jenis sepatu</em> favoritmu</h2>
            </div>
            <p>Arahkan kursor ke tumpukan kartu untuk mengintip kategori. Selebihnya kamu bisa menyaring merek dan jenis langsung di katalog.</p>
          </div>
          <Reveal>
            <DisplayCards cards={categoryCards} />
          </Reveal>
        </section>

        {/* Cara pesan — Morrow services */}
        <section className="morrow-section" id="cara-pesan" aria-label="Cara pesan">
          <div className="morrow-section-head">
            <div>
              <p className="morrow-kicker">Cara pesan · WhatsApp</p>
              <h2>Tiga langkah, <em>langsung melangkah</em></h2>
            </div>
            <p>Tanpa akun dan tanpa ribet. Pesananmu tercatat rapi, lalu admin membantumu lewat WhatsApp.</p>
          </div>
          <Reveal>
            <div className="morrow-services">
              <article className="morrow-service-card">
                <span className="num">01</span>
                <h3>Pilih warna & ukuran</h3>
                <p>Buka model favorit, pilih warna dan ukuran EU yang masih tersedia, lalu isi nama, alamat, dan catatan.</p>
              </article>
              <article className="morrow-service-card">
                <span className="num">02</span>
                <h3>Konfirmasi via WhatsApp</h3>
                <p>Pesanan tersimpan sebagai Menunggu konfirmasi, lalu tautan WhatsApp terbuka berisi ringkasan pesananmu.</p>
              </article>
              <article className="morrow-service-card">
                <span className="num">03</span>
                <h3>Admin cek & kirim</h3>
                <p>Admin mengonfirmasi stok dan ongkir lewat chat, lalu pesanan diproses hingga selesai. Dikirim ke seluruh Indonesia.</p>
              </article>
            </div>
          </Reveal>
        </section>

        {/* Angka */}
        <section className="morrow-section" aria-label="Angka toko">
          <Reveal>
            <div className="morrow-numbers">
              <article className="morrow-number-card">
                <CountUp value={products.length} suffix="+" />
                <span>Model tersedia di katalog</span>
              </article>
              <article className="morrow-number-card">
                <CountUp value={totalPairs} />
                <span>Pasang siap dikirim</span>
              </article>
              <article className="morrow-number-card">
                <CountUp value={totalSizes} />
                <span>Ukuran EU tersedia (36–46)</span>
              </article>
              <article className="morrow-number-card">
                <CountUp value={categories.length || 4} />
                <span>Jenis sepatu: sneakers, kasual, boots, lari</span>
              </article>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="morrow-section" id="faq" aria-label="Pertanyaan umum">
          <div className="morrow-section-head">
            <div>
              <p className="morrow-kicker">FAQ</p>
              <h2>Sering <em>ditanyakan</em></h2>
            </div>
            <p>Jawaban singkat untuk keputusan belanja yang lebih tenang.</p>
          </div>
          <Reveal>
            <div className="morrow-faq">
            <details>
              <summary>Apakah stok otomatis berkurang saat memesan?</summary>
              <p>Tidak. Stok dicek saat pesanan dibuat, tetapi tidak dicadangkan otomatis. Admin mengonfirmasi ketersediaan dan ongkir lewat WhatsApp sebelum pesanan diproses.</p>
            </details>
            <details>
              <summary>Bagaimana memilih ukuran yang pas?</summary>
              <p>Gunakan panduan EU di form pemesanan untuk perkiraan panjang kaki, atau chat admin untuk bantuan memilih ukuran.</p>
            </details>
            <details>
              <summary>Apakah bisa pesan tanpa WhatsApp?</summary>
              <p>Pemesanan tetap diteruskan ke WhatsApp agar admin bisa mengonfirmasi ukuran, stok, dan ongkir dengan cepat.</p>
            </details>
          </div>
          </Reveal>
        </section>

        <Reveal>
          <div className="morrow-cta" id="tentang">
          <h2>Butuh bantuan memilih ukuran? Obrolkan dulu dengan admin.</h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.6, maxWidth: 460 }}>
            Bantu kami cek ukuran dan stok lewat WhatsApp — gratis dan tanpa komitmen.
          </p>
          {normalizedWhatsAppNumber ? (
            <a className="morrow-btn" href={`https://wa.me/${normalizedWhatsAppNumber}`} target="_blank" rel="noreferrer">Chat WhatsApp ↗</a>
          ) : (
            <a className="morrow-btn" href="#koleksi">Lihat koleksi ↗</a>
          )}
          </div>
        </Reveal>

        <section className="service-strip" aria-label="Layanan">
          <article className="service-card">
            <span className="serviceIcon"><img src="/images/figma/icons/message-circle.svg" alt="" /></span>
            <div className="service-copy">
              <span className="service-step">Langkah 01</span>
              <strong>Pesan tanpa ribet</strong>
              <small>Pilih sepatu, lanjutkan di WhatsApp.</small>
            </div>
            <a className="service-arrow" href="#koleksi" aria-label="Lihat koleksi">→</a>
          </article>
          <article className="service-card">
            <span className="serviceIcon"><img src="/images/figma/icons/package-check.svg" alt="" /></span>
            <div className="service-copy">
              <span className="service-step">Langkah 02</span>
              <strong>Dicek sebelum dikirim</strong>
              <small>Setiap pasang siap menemani langkahmu.</small>
            </div>
            <a className="service-arrow" href="#cara-pesan" aria-label="Cara pesan">→</a>
          </article>
          <article className="service-card">
            <span className="serviceIcon"><img src="/images/figma/icons/truck.svg" alt="" /></span>
            <div className="service-copy">
              <span className="service-step">Langkah 03</span>
              <strong>Kirim ke seluruh Indonesia</strong>
              <small>Ongkir dikonfirmasi langsung oleh admin.</small>
            </div>
            <a className="service-arrow" href="#faq" aria-label="FAQ">→</a>
          </article>
        </section>
      </main>
      <DoodleFooter storeName={settings.storeName} whatsappNumber={settings.whatsappNumber} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {selectedProduct && (
        <OrderModal
          key={selectedProduct.id}
          product={selectedProduct}
          settings={settings}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => {
            setSelectedProduct(null);
            notify("success", "Pesanan tersimpan", "Membuka WhatsApp dengan ringkasan pesananmu.");
          }}
        />
      )}
    </>
  );
}

export default App;
