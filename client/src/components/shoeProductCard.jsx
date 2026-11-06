import * as React from "react";
import { formatPrice } from "../services/api.js";
import { getAvailableSizes, getProductSku } from "../services/catalogMeta.js";

// Renders a tidy shoe card: media, brand, name, category, sizes, colours,
// stock pill, and a single call-to-action — all information vertical and aligned.
function ProductCard({ product, badge, onSelect }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const availableSizes = getAvailableSizes(product);
  const image = product.image && !imageFailed;
  const colorCount = product.colors?.length || 0;
  const soldOut = !availableSizes.length;

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
        <span className="product-sku">{getProductSku(product)}</span>
      </div>

      <div className="product-copy">
        <div className="product-meta-top">
          <span className="product-brand">{product.brand || "Sepatu"}</span>
          <span className="product-category">{product.categoryName || "Sepatu"}</span>
        </div>

        <button className="product-title" type="button" onClick={() => onSelect(product)}>
          {product.name}
        </button>

        <div className="product-price-row">
          <strong>{formatPrice(product.price)}</strong>
          <span className="product-price-note">/ pasang</span>
        </div>

        <div className="product-sizes" aria-label={`${availableSizes.length} ukuran tersedia`}>
          <span className="product-sizes-label">Ukuran EU</span>
          <span className="product-sizes-chips">
            {availableSizes.length
              ? availableSizes.slice(0, 5).map((size) => <span key={size}>{size}</span>)
              : <span className="is-empty">—</span>}
            {availableSizes.length > 5 && <span className="more">+{availableSizes.length - 5}</span>}
          </span>
        </div>

        <div className="product-meta-row">
          <span className="product-swatches" aria-label={`${colorCount} pilihan warna`}>
            {(product.colors || []).slice(0, 4).map((color) => (
              <span key={color.name} title={color.name} style={{ backgroundColor: color.hex }} />
            ))}
            {colorCount > 0 && <small>{colorCount} warna</small>}
          </span>
          <span className={`product-stock ${soldOut ? "out" : product.stockCount <= 5 ? "low" : "ok"}`}>
            {soldOut ? "Stok habis" : `${product.stockCount} pasang tersedia`}
          </span>
        </div>

        <button
          type="button"
          className="product-cta"
          onClick={() => onSelect(product)}
          disabled={soldOut}
        >
          <img src="/images/figma/icons/message-circle.svg" alt="" />
          {soldOut ? "Stok habis" : "Pesan via WhatsApp"}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
