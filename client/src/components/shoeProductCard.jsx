import { useState } from "react";
import { formatPrice } from "../services/api.js";
import { getAvailableSizes } from "../services/catalogMeta.js";

// Renders a shoe card with its brand, type, price, and available inventory.
function ProductCard({ product, badge, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const availableSizes = getAvailableSizes(product);
  const image = product.image && !imageFailed;

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <button
          className="product-image-button"
          type="button"
          onClick={() => onSelect(product)}
          aria-label={`Lihat detail ${product.name}`}
        >
          {image ? (
            <img
              src={product.image}
              alt={`${product.brand ? `${product.brand} ` : ""}${product.name}`}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="image-placeholder" aria-hidden="true">
              <span>SS</span>
            </span>
          )}
        </button>
        {badge && <span className="stock-badge">{badge}</span>}
        <button
          type="button"
          className={`favoriteButton${favorite ? " isFavorite" : ""}`}
          onClick={() => setFavorite((current) => !current)}
          aria-label={favorite ? `Hapus ${product.name} dari favorit` : `Simpan ${product.name} ke favorit`}
          aria-pressed={favorite}
        >
          <img src="/images/figma/icons/heart.svg" alt="" />
        </button>
      </div>
      <div className="product-copy">
        <div className="product-eyebrow">
          <span>{product.brand || "Sepatu"}</span>
        </div>
        <button className="product-title" type="button" onClick={() => onSelect(product)}>
          {product.name}
        </button>
        <div className="product-card-bottom">
          <strong>{formatPrice(product.price)}</strong>
          <div className="product-card-actions">
            <div className="productSwatches" aria-label={`${(product.colors || []).length} pilihan warna`}>
              {(product.colors || []).slice(0, 4).map((color) => (
                <span key={color.name} title={color.name} style={{ backgroundColor: color.hex }} />
              ))}
            </div>
            <button type="button" onClick={() => onSelect(product)} disabled={!availableSizes.length}>
              <img src="/images/figma/icons/message-circle.svg" alt="" />
              Pesan via WA
            </button>
          </div>
        </div>
        <span className="productAvailability">
          {availableSizes.length ? `${availableSizes.length} ukuran tersedia` : "Stok habis"}
        </span>
      </div>
    </article>
  );
}

export default ProductCard;