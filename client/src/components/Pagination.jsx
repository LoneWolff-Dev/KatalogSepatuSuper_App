import * as React from "react";

// Numbered pagination with ellipsis, prev/next and status text.
// Shared by storefront & admin for a consistent professional look.
export function getPageItems(current, total) {
  const window = [];
  const add = (v) => window.push(v);
  if (total <= 7) {
    for (let i = 1; i <= total; i++) add(i);
    return window;
  }
  add(1);
  if (current > 3) add("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) add(i);
  if (current < total - 2) add("…");
  add(total);
  return window;
}

export default function Pagination({ page, pageCount, onChange, label = "Halaman", className = "" }) {
  if (pageCount <= 1) return null;
  const items = getPageItems(page, pageCount);

  const go = (next) => {
    const clamped = Math.max(1, Math.min(pageCount, next));
    onChange(clamped);
    document.getElementById("koleksi")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className={`pagination ${className}`} aria-label={label}>
      <span className="pagination-track" aria-hidden="true"><span style={{ width: `${(page / pageCount) * 100}%` }} /></span>
      <span className="pagination-status" aria-live="polite">
        Halaman {page} dari {pageCount}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn is-nav"
          onClick={() => go(page - 1)}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
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
              aria-label={`Halaman ${item}`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className="pagination-btn is-nav"
          onClick={() => go(page + 1)}
          disabled={page === pageCount}
          aria-label="Halaman berikutnya"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </nav>
  );
}
