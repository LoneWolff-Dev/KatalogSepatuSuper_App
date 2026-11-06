import * as React from "react";

/* Reveal-on-scroll wrapper: adds .is-visible when intersecting (once). */
export default function Reveal({ children, className = "", delay = 0 }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
