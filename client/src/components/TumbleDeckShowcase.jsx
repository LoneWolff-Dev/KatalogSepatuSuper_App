import * as React from "react";

/*
 * TumbleDeckShowcase — adapted from 21st.dev/@kedhareswer/components/tumble-deck-showcase
 * (MIT, kedhareswer). A stack of cards standing on edge; scrolling / dragging /
 * arrow keys tip the front card forward onto the floor. Re-implemented without
 * gsap/Tailwind: same CSS-3D hinge pose math, driven by requestAnimationFrame.
 */

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const wrap = (k, n) => (n ? ((k % n) + n) % n : 0);

export function fallAngle(t) {
  const u = clamp01(t);
  const land = 0.78;
  if (u <= land) {
    const k = u / land;
    return -90 * k * k * k;
  }
  const k = (u - land) / (1 - land);
  return -90 + 6 * Math.sin(Math.PI * k) * (1 - k);
}

export function deckAdvance(pos) {
  const i = Math.floor(pos);
  const f = pos - i;
  const k = clamp01((f - 0.28) / 0.6);
  return i + k * k * (3 - 2 * k);
}

export function cardPose(k, pos, depth) {
  const t = pos - k;
  const lift = (k - Math.floor(pos) + 3) * 0.6;
  if (t >= 1) {
    return { angle: -90, z: 0, lift, opacity: t < 3 ? 1 : 0, flat: true };
  }
  if (t > 0) return { angle: fallAngle(t), z: 0, lift, opacity: 1, flat: false };
  const rel = k - deckAdvance(pos);
  const opacity = clamp01(depth + 1 - rel);
  return { angle: 0, z: -Math.max(rel, 0), lift: 0, opacity, flat: false };
}

export default function TumbleDeckShowcase({
  cards,
  height = "62svh",
  aspect = 2.06,
  scrollPerCard = 240,
  depth = 5,
  background = "linear-gradient(180deg, #fffbeb 0%, #d1fae5 100%)",
  className,
  style,
  ariaLabel = "Galeri koleksi sepatu",
}) {
  const rootRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const cardRefs = React.useRef([]);
  const imgRefs = React.useRef([]);
  const slotK = React.useRef([]);
  const state = React.useRef({ pos: 0 });
  const geo = React.useRef({ h: 200, gap: 44 });
  const n = cards?.length || 0;
  const pool = n ? depth + 5 : 0;

  const paint = React.useCallback(() => {
    const { pos } = state.current;
    const { gap } = geo.current;
    const base = Math.floor(pos) - 2;
    cardRefs.current.forEach((el, j) => {
      const img = imgRefs.current[j];
      if (!el || !img || j >= pool) return;
      const k = base + wrap(j - base, pool);
      if (slotK.current[j] !== k) {
        slotK.current[j] = k;
        const c = cards[wrap(k, n)];
        img.src = c.src;
        img.alt = c.alt || "";
      }
      const p = cardPose(k, pos, depth);
      el.style.transform = `translate3d(0, ${-p.lift}px, ${p.z * gap}px) rotateX(${p.angle}deg)`;
      el.style.opacity = String(p.opacity);
      el.style.visibility = p.opacity > 0 ? "visible" : "hidden";
      const shade = p.flat ? 0.06 : (-p.angle / 90) * 0.06;
      el.style.setProperty("--td-shade", String(shade));
    });
  }, [depth, pool, cards, n]);

  React.useLayoutEffect(() => {
    slotK.current = [];
  }, [cards]);

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    const scene = sceneRef.current;
    if (!root || !scene) return;
    const fit = () => {
      const W0 = root.clientWidth;
      const H0 = root.clientHeight;
      const wFrac = W0 < 420 ? 0.76 : 0.655;
      const h = Math.max(60, Math.min((W0 * wFrac) / aspect, H0 * 0.42, 620));
      const w = h * aspect;
      const top = H0 / 2 - 0.62 * h;
      geo.current = { h, gap: 0.24 * h };
      scene.style.perspective = `${6 * h}px`;
      scene.style.perspectiveOrigin = `50% ${top - 1.66 * h}px`;
      root.style.setProperty("--td-w", `${w}px`);
      root.style.setProperty("--td-h", `${h}px`);
      root.style.setProperty("--td-top", `${top}px`);
      paint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, [aspect, paint]);

  const api = React.useRef({ step: () => {} });
  const dragged = React.useRef(false);
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || n === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = state.current;
    let target = s.pos;
    let rafId = null;
    let idle;
    let acc = 0;

    const follow = () => {
      s.pos += (target - s.pos) * (1 - Math.exp(-(1 / 60) * 9));
      if (Math.abs(target - s.pos) < 2e-3) {
        s.pos = target;
        paint();
        rafId = null;
        return;
      }
      paint();
      rafId = requestAnimationFrame(follow);
    };
    const push = (to) => {
      target = Math.max(Math.round(s.pos) - 3, Math.min(Math.round(s.pos) + 3, to));
      if (reduce) {
        s.pos = target;
        paint();
      } else if (rafId == null) {
        rafId = requestAnimationFrame(follow);
      }
    };
    const settle = (bias = 0) =>
      push(bias > 0 ? Math.floor(target + 0.7) : bias < 0 ? Math.ceil(target - 0.7) : Math.round(target));
    api.current.step = (dir) => push(Math.round(target) + dir);

    const onWheel = (e) => {
      e.preventDefault();
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? root.clientHeight : 1;
      const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * scale;
      if (reduce) {
        acc += d;
        while (Math.abs(acc) >= scrollPerCard) {
          const dir = Math.sign(acc);
          acc -= dir * scrollPerCard;
          push(target + dir);
        }
        return;
      }
      push(target + d / scrollPerCard);
      clearTimeout(idle);
      idle = setTimeout(() => settle(Math.sign(d)), 140);
    };

    let drag = null;
    const onDown = (e) => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, y: e.clientY, travel: 0, last: 0 };
      dragged.current = false;
      clearTimeout(idle);
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = drag.y - e.clientY;
      drag.y = e.clientY;
      drag.travel += Math.abs(dy);
      if (dy) drag.last = Math.sign(dy);
      if (drag.travel > 6 && !dragged.current) {
        dragged.current = true;
        root.setPointerCapture(e.pointerId);
      }
      if (dragged.current && !reduce) push(target + dy / (geo.current.h * 1.1));
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (dragged.current) {
        if (reduce) push(Math.round(target) + (drag.last || 0));
        else settle(drag.last);
      }
      drag = null;
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    paint();
    return () => {
      clearTimeout(idle);
      if (rafId != null) cancelAnimationFrame(rafId);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, [n, scrollPerCard, paint]);

  const onKey = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      api.current.step(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      api.current.step(-1);
    }
  };

  if (!n) return null;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKey}
      onClick={() => {
        if (!dragged.current) api.current.step(1);
      }}
      className={["td-root", className].filter(Boolean).join(" ")}
      style={{ height, background, ...style }}
    >
      <style>{`
        .td-root {
          position: relative; width: 100%; overflow: hidden;
          outline: none; user-select: none; touch-action: none;
          border-radius: 0 0 28px 28px;
        }
        .td-root:focus-visible { box-shadow: inset 0 0 0 2px #6ee7b7; }
        .td-scene { position: absolute; inset: 0; transform-style: preserve-3d; }
        .td-card {
          position: absolute; left: 50%; top: var(--td-top);
          width: var(--td-w); height: var(--td-h); margin-left: calc(var(--td-w) / -2);
          transform-origin: 50% 100%; transform-style: preserve-3d;
          backface-visibility: visible; will-change: transform;
          border-radius: 14px; overflow: hidden; cursor: pointer;
          background: #d1fae5;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 24px 60px rgba(51,65,46,0.18);
        }
        .td-card img {
          display: block; width: 100%; height: 100%; max-width: none;
          object-fit: cover; object-position: 50% 0%; pointer-events: none;
        }
        .td-card::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: #000; opacity: var(--td-shade, 0);
        }
      `}</style>
      <div ref={sceneRef} className="td-scene">
        {Array.from({ length: pool }, (_, j) => (
          <div
            key={j}
            ref={(el) => {
              cardRefs.current[j] = el;
            }}
            className="td-card"
          >
            <img
              ref={(el) => {
                imgRefs.current[j] = el;
              }}
              alt=""
              width={720}
              height={Math.round(720 / aspect)}
              draggable={false}
              decoding="async"
            />
          </div>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {n} foto. Scroll, drag, klik, atau tekan panah untuk membalik galeri.
      </span>
    </div>
  );
}
