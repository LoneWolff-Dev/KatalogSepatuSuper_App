import * as React from "react";
import { formatPrice } from "../services/api.js";

/*
 * SneakerHero — inspired by 21st.dev @kedhareswer/components/sneaker-product-hero
 * (floating shoe + reflection, hold-to-zoom loupe, colour/size/stock picker,
 * animated price, like burst). Adapted for SepatuSuper: "add to cart" opens
 * the existing WhatsApp order modal via onSelect(product).
 */

function useAnimatedNumber(value, duration = 450) {
  const [display, setDisplay] = React.useState(value);
  const prev = React.useRef(value);

  React.useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(to);
      return undefined;
    }
    let rafId = null;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [value, duration]);

  return display;
}

export default function SneakerHero({ product, onSelect }) {
  const [colorIdx, setColorIdx] = React.useState(0);
  const [size, setSize] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [zoom, setZoom] = React.useState(null); // {x,y} percentages
  const stageRef = React.useRef(null);
  const holdTimer = React.useRef(null);

  const colors = product?.colors?.length ? product.colors : [{ name: "Original", hex: "#e8e8e8" }];
  const variants = product?.variants || [];
  const activeColor = colors[Math.min(colorIdx, colors.length - 1)];
  const colorVariants = variants.filter(
    (v) => v.color.toLocaleLowerCase("id") === activeColor.name.toLocaleLowerCase("id"),
  );
  const sizes = (colorVariants.length ? colorVariants : variants).map((v) => v.size);

  React.useEffect(() => {
    setColorIdx(0);
    setSize("");
    setQuantity(1);
  }, [product?.id]);

  const chosenSize = size && sizes.includes(size) ? size : sizes[0] || "";
  const chosenVariant = variants.find(
    (v) =>
      v.size === chosenSize &&
      v.color.toLocaleLowerCase("id") === activeColor.name.toLocaleLowerCase("id"),
  );
  const stock = chosenVariant ? chosenVariant.stock : 0;
  const clampedQty = Math.min(quantity, Math.max(1, stock));
  const total = useAnimatedNumber((product?.price || 0) * clampedQty);
  const soldOut = !product || stock <= 0;

  if (!product) return null;

  const onHoldStart = (event) => {
    const update = (e) => {
      const box = stageRef.current?.getBoundingClientRect();
      if (!box) return;
      setZoom({
        x: ((e.clientX - box.left) / box.width) * 100,
        y: ((e.clientY - box.top) / box.height) * 100,
      });
    };
    update(event);
    holdTimer.current = setTimeout(() => {}, 220);
  };
  const onHoldMove = (event) => {
    if (zoom == null) return;
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    setZoom({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  };
  const onHoldEnd = () => {
    clearTimeout(holdTimer.current);
    setZoom(null);
  };

  return (
    <section className="sneaker-hero" aria-label={`Unggulan: ${product.name}`}>
      <div className="sneaker-stage">
        <div
          ref={stageRef}
          className={`sneaker-photo ${zoom ? "is-zooming" : ""}`}
          onPointerDown={onHoldStart}
          onPointerMove={onHoldMove}
          onPointerUp={onHoldEnd}
          onPointerLeave={onHoldEnd}
          role="img"
          aria-label={`${product.brand} ${product.name} — tahan untuk memperbesar`}
        >
          {product.image ? <img src={product.image} alt={`${product.brand} ${product.name}`} draggable={false} /> : <span className="image-placeholder"><span>SS</span></span>}
          <span className="sneaker-glow" aria-hidden="true" />
          <span className="sneaker-reflection" aria-hidden="true"><img src={product.image} alt="" draggable={false} /></span>
          {zoom && (
            <span
              className="sneaker-loupe"
              style={{ left: `${zoom.x}%`, top: `${zoom.y}%` }}
              aria-hidden="true"
            >
              <span
                className="sneaker-loupe-img"
                style={{
                  backgroundImage: `url(${product.image})`,
                  backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                }}
              />
            </span>
          )}
          <span className="sneaker-hint" aria-hidden="true">Tahan untuk zoom</span>
        </div>
      </div>

      <div className="sneaker-info">
        <p className="morrow-kicker">Unggulan minggu ini · {product.categoryName || "Sepatu"}</p>
        <h2>
          {product.brand} <em>{product.name}</em>
        </h2>
        {product.description && <p className="sneaker-desc">{product.description}</p>}
        <p className="sneaker-price">
          <strong>{formatPrice(total)}</strong>
          <span>{clampedQty > 1 ? ` × ${clampedQty} pasang` : " / pasang"}</span>
        </p>

        <div className="sneaker-picker">
          <span className="sneaker-picker-label">Warna · <strong>{activeColor.name}</strong></span>
          <div className="sneaker-colors">
            {colors.map((color, i) => (
              <button
                key={color.name}
                type="button"
                className={i === colorIdx ? "active" : ""}
                style={{ backgroundColor: color.hex }}
                title={color.name}
                aria-label={`Warna ${color.name}`}
                aria-pressed={i === colorIdx}
                onClick={() => {
                  setColorIdx(i);
                  setSize("");
                }}
              />
            ))}
          </div>
        </div>

        <div className="sneaker-picker">
          <span className="sneaker-picker-label">Ukuran EU {chosenSize && <>· <strong>{chosenSize}</strong></>}</span>
          <div className="sneaker-sizes">
            {sizes.length ? sizes.map((s) => {
              const v = variants.find(
                (item) => item.size === s && item.color.toLocaleLowerCase("id") === activeColor.name.toLocaleLowerCase("id"),
              );
              const out = !v || v.stock <= 0;
              return (
                <button
                  key={s}
                  type="button"
                  className={s === chosenSize ? "active" : ""}
                  disabled={out}
                  aria-pressed={s === chosenSize}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              );
            }) : <span className="no-sizes">Ukuran belum tersedia</span>}
          </div>
          <span className={`sneaker-stock ${soldOut ? "out" : stock <= 5 ? "low" : "ok"}`}>
            {soldOut ? "Stok habis untuk warna/ukuran ini" : stock <= 5 ? `Stok menipis — ${stock} pasang` : "Stok tersedia"}
          </span>
        </div>

        <div className="sneaker-actions">
          <div className="sneaker-qty" aria-label="Jumlah">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Kurangi jumlah">−</button>
            <strong>{clampedQty}</strong>
            <button type="button" onClick={() => setQuantity((q) => Math.min(Math.max(1, stock), q + 1))} aria-label="Tambah jumlah">+</button>
          </div>
          <button
            type="button"
            className="morrow-btn sneaker-cta"
            disabled={soldOut}
            onClick={() => onSelect(product)}
          >
            <img src="/images/figma/icons/whatsapp.svg" alt="" />
            Pesan via WhatsApp ↗
          </button>
        </div>
        <p className="sneaker-note">Stok dicek saat pesanan dibuat, admin mengonfirmasi ongkir lewat chat.</p>
      </div>
    </section>
  );
}
