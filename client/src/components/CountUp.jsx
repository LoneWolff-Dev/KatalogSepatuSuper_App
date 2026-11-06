import * as React from "react";

/* Animated number count-up when scrolled into view (ease-out, once). */
export default function CountUp({ value, suffix = "", className = "" }) {
  const ref = React.useRef(null);
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    const target = Number(value) || 0;
    if (!el) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      return undefined;
    }

    let rafId = null;
    const animate = () => {
      const duration = 1000;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(eased * target));
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate();
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      io.disconnect();
    };
  }, [value]);

  return (
    <strong ref={ref} className={className}>
      {Number(display).toLocaleString("id-ID")}
      {suffix}
    </strong>
  );
}
