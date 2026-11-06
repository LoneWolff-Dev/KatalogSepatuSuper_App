import { normalizeWhatsAppNumber } from "../services/api.js";

/*
 * DoodleFooter — inspired by 21st.dev @kedhareswer/components/doodle-crew-footer
 * (hand-drawn sketchbook: giant brand wordmark, doodle characters, link columns,
 * two pill buttons, bottom bar. Pure SVG, zero dependencies).
 * Adapted for SepatuSuper with sneaker doodle crew.
 */

function ShoeDoodle({ className = "", style }) {
  return (
    <svg className={`doodle-shoe ${className}`} viewBox="0 0 120 60" aria-hidden="true" style={style}>
      <path
        d="M8 44 Q10 30 24 28 L52 24 Q62 22 70 14 Q76 8 86 12 Q96 16 104 20 L112 24 L112 40 Q112 44 104 44 L14 44 Q8 44 8 44 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 48 H112" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 32 l8 6 M44 30 l8 6 M58 28 l8 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="34" cy="18" r="3" fill="currentColor" />
      <circle cx="44" cy="18" r="3" fill="currentColor" />
    </svg>
  );
}

export default function DoodleFooter({ storeName, whatsappNumber }) {
  const normalizedNumber = normalizeWhatsAppNumber(whatsappNumber);

  return (
    <footer className="doodle-footer">
      <div className="doodle-top">
        <div className="doodle-brand">
          <span className="doodle-sticker">EST. {new Date().getFullYear()}</span>
          <p className="doodle-tagline">{storeName} — sneakers, kasual, boots & lari. Pilih → Chat → Melangkah.</p>
          <div className="doodle-actions">
            {normalizedNumber ? (
              <a className="doodle-btn primary" href={`https://wa.me/${normalizedNumber}`} target="_blank" rel="noreferrer">Chat WhatsApp ↗</a>
            ) : (
              <a className="doodle-btn primary" href="#koleksi">Lihat koleksi ↗</a>
            )}
            <a className="doodle-btn ghost" href="#cara-pesan">Cara pesan</a>
          </div>
        </div>

        <nav className="doodle-links" aria-label="Jelajahi">
          <strong>JELAJAHI</strong>
          <a href="#koleksi">Koleksi sepatu</a>
          <a href="#galeri">Galeri</a>
          <a href="#kategori">Kategori</a>
          <a href="#faq">FAQ</a>
        </nav>
        <nav className="doodle-links" aria-label="Bantuan">
          <strong>BUTUH BANTUAN?</strong>
          <a href="#cara-pesan">Cara pesan</a>
          <a href="#koleksi">Panduan ukuran</a>
          {normalizedNumber ? (
            <a href={`https://wa.me/${normalizedNumber}`} target="_blank" rel="noreferrer">WhatsApp admin ↗</a>
          ) : (
            <a href="#koleksi">Tanya admin toko</a>
          )}
        </nav>
        <div className="doodle-links">
          <strong>INFO TOKO</strong>
          <span className="doodle-info">
            <img src="/images/figma/icons/message-circle.svg" alt="" />
            Buka setiap hari · balas cepat lewat WhatsApp
          </span>
          <span className="doodle-info">
            <img src="/images/figma/icons/truck.svg" alt="" />
            Kirim ke seluruh Indonesia
          </span>
          <span className="doodle-info">
            <img src="/images/figma/icons/shield-check.svg" alt="" />
            Ongkir dikonfirmasi admin sebelum kirim
          </span>
          <span className="doodle-social">
            <a href="#koleksi"><img src="/images/figma/icons/arrow-up-right.svg" alt="" /> Instagram</a>
            <a href="#koleksi"><img src="/images/figma/icons/trending-up.svg" alt="" /> TikTok</a>
            {normalizedNumber && <a href={`https://wa.me/${normalizedNumber}`} target="_blank" rel="noreferrer"><img src="/images/figma/icons/whatsapp.svg" alt="" /> WhatsApp</a>}
          </span>
        </div>
      </div>

      <div className="doodle-badges" aria-label="Layanan">
        <span>✓ Cek stok sebelum kirim</span>
        <span>✓ Ukuran EU 36–46</span>
        <span>✓ Pesanan tercatat rapi</span>
      </div>

      <div className="doodle-wordmark" aria-hidden="true">
        <ShoeDoodle className="doodle-crew c1" />
        <ShoeDoodle className="doodle-crew c2" />
        <span className="doodle-word">SEPATU SUPER</span>
        <span className="doodle-sparkle" aria-hidden="true">✦</span>
        <span className="doodle-sparkle s2" aria-hidden="true">✧</span>
      </div>

      <div className="doodle-bottom">
        <span>© {new Date().getFullYear()} {storeName}. Setiap langkah punya cerita.</span>
        <span>Pilih → Chat → Melangkah</span>
      </div>
    </footer>
  );
}
