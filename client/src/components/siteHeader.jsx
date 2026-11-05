import { normalizeWhatsAppNumber } from "../services/api.js";

// Renders the storefront identity, catalog links, and admin entry point.
function Header({ storeName, whatsappNumber, searchValue, onSearchChange }) {
  const normalizedNumber = normalizeWhatsAppNumber(whatsappNumber);

  return (
    <header className="site-header">
      <a className="brand-lockup" href="#beranda" aria-label={`${storeName}, beranda`}>
        <span className="brand-mark" aria-hidden="true">
          <img src="/images/figma/icons/brand-mark.svg" alt="" />
        </span>
        <span>{storeName}</span>
      </a>
      <nav className="header-nav" aria-label="Navigasi utama">
        <a className="selected" href="#koleksi">Koleksi</a>
        <a href="#cara-pesan">Cara pesan</a>
        <a href="#tentang">Tentang</a>
      </nav>
      <label className="headerSearch" aria-label="Cari koleksi">
        <img src="/images/figma/icons/search.svg" alt="" />
        <input
          type="search"
          value={searchValue}
          placeholder="Cari model atau merek favoritmu"
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Cari model atau merek"
        />
      </label>
      {normalizedNumber ? (
        <a className="header-cta" href={`https://wa.me/${normalizedNumber}`} target="_blank" rel="noreferrer">
          Tanya admin <img src="/images/figma/icons/whatsapp.svg" alt="" />
        </a>
      ) : (
        <a className="header-cta" href="#koleksi">
          Tanya admin <img src="/images/figma/icons/whatsapp.svg" alt="" />
        </a>
      )}
      <a className="headerAdminLink" href="/admin/login">Admin</a>
    </header>
  );
}

export default Header;