import * as React from "react";
import { normalizeWhatsAppNumber } from "../services/api.js";

/*
 * LiquidGlassNav — inspired by 21st.dev @gughigug/components/liquid-glass-navbar
 * (Apple-style liquid glass, gooey droplet indicator, zero dependencies).
 * Adapted for SepatuSuper (Ember Orange). Panel admin tidak diekspos di sini.
 */

const LINKS = [
  { label: "Beranda", href: "#beranda" },
  { label: "Koleksi", href: "#koleksi" },
  { label: "Galeri", href: "#galeri" },
  { label: "Cara pesan", href: "#cara-pesan" },
  { label: "FAQ", href: "#faq" },
];

export default function LiquidGlassNav({ storeName, whatsappNumber, searchValue, onSearchChange }) {
  const normalizedNumber = normalizeWhatsAppNumber(whatsappNumber);
  const navRef = React.useRef(null);
  const [drop, setDrop] = React.useState({ left: 0, width: 0 });
  const [scrolled, setScrolled] = React.useState(false);
  const reduce = React.useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const measure = React.useCallback((el) => {
    if (!el || !navRef.current) return;
    const navBox = navRef.current.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setDrop({ left: box.left - navBox.left, width: box.width });
  }, []);

  React.useEffect(() => {
    const active = navRef.current?.querySelector(".liquid-link.selected") || navRef.current?.firstElementChild;
    if (active) measure(active);
  }, [measure]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onNavMove = (event) => {
    const link = event.target.closest(".liquid-link");
    if (link) measure(link);
  };

  return (
    <header className={`liquid-nav ${scrolled ? "is-scrolled" : ""}`}>
      <svg className="goo-defs" aria-hidden="true">
        <defs>
          <filter id="liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <a className="brand-lockup" href="#beranda" aria-label={`${storeName}, beranda`}>
        <span className="brand-mark" aria-hidden="true">
          <img src="/images/figma/icons/brand-mark.svg" alt="" />
        </span>
        <span>{storeName}</span>
      </a>

      <nav
        className="liquid-pill"
        ref={navRef}
        aria-label="Navigasi utama"
        onMouseEnter={() => {
          const active = navRef.current?.querySelector(".liquid-link.selected");
          if (active) measure(active);
        }}
        onMouseMove={onNavMove}
        onMouseLeave={() => {
          const active = navRef.current?.querySelector(".liquid-link.selected");
          if (active) measure(active);
        }}
      >
        <span
          className="liquid-drop"
          style={{
            left: drop.left,
            width: drop.width,
            transition: reduce ? "none" : "left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          aria-hidden="true"
        >
          <span className="liquid-drop-core" />
          <span className="liquid-drop-ripple" />
        </span>
        {LINKS.map((link, i) => (
          <a
            key={link.label}
            className={`liquid-link ${i === 0 ? "selected" : ""}`}
            href={link.href}
            onClick={(event) => {
              event.preventDefault();
              const links = Array.from(navRef.current?.querySelectorAll(".liquid-link") || []);
              links.forEach((l) => l.classList.remove("selected"));
              event.currentTarget.classList.add("selected");
              measure(event.currentTarget);
              const target = document.querySelector(link.href);
              if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="nav-actions">
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

        <span className="nav-ornament" aria-hidden="true">
          <svg className="nav-ornament-ring" viewBox="0 0 100 100"><defs><path id="circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs><text><textPath href="#circ">SEPATU SUPER • PILIH • CHAT • MELANGKAH • </textPath></text></svg>
          <span className="nav-ornament-core">✦</span>
          <span className="nav-ornament-dot d1" />
          <span className="nav-ornament-dot d2" />
          <span className="nav-ornament-dot d3" />
        </span>

        {normalizedNumber ? (
          <a className="header-cta" href={`https://wa.me/${normalizedNumber}`} target="_blank" rel="noreferrer">
            <span className="cta-icon" aria-hidden="true"><img src="/images/figma/icons/whatsapp.svg" alt="" /></span>
            <span className="cta-text"><strong>Tanya admin</strong></span>
          </a>
        ) : (
          <a className="header-cta" href="#koleksi">
            <span className="cta-icon" aria-hidden="true"><img src="/images/figma/icons/whatsapp.svg" alt="" /></span>
            <span className="cta-text"><strong>Tanya admin</strong></span>
          </a>
        )}
      </div>
    </header>
  );
}
