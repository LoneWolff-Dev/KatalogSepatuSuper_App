import * as React from "react";

/*
 * DisplayCards — adapted from 21st.dev/@Codehagen/components/display-cards
 * (MIT, Prism UI / Codehagen). Stacked skewed cards with grayscale hover reveal.
 * Re-implemented without Tailwind/lucide-react using plain CSS classes so it
 * matches this repo's vanilla-CSS setup.
 */

function DisplayCard({
  className,
  icon,
  label,
  title,
  description,
  date,
  iconClassName,
  titleClassName,
}) {
  return (
    <div className={`dc-card ${className || ""}`}>
      <div className="dc-card-top">
        <span className={`dc-icon-pill ${iconClassName || ""}`}>{icon}</span>
        <p className={`dc-title ${titleClassName || ""}`}>{title}</p>
        <span className="dc-label">{label}</span>
      </div>
      <p className="dc-desc">{description}</p>
      <p className="dc-date">{date}</p>
    </div>
  );
}

export default function DisplayCards({ cards }) {
  const defaultCards = [
    {
      className: "dc-layer dc-layer-1",
      icon: <img src="/images/figma/icons/check.svg" alt="" />,
      title: "Unggulan",
      description: "Model pilihan minggu ini",
      date: "Lihat koleksi →",
    },
    {
      className: "dc-layer dc-layer-2",
      icon: <img src="/images/figma/icons/trending-up.svg" alt="" />,
      title: "Terlaris",
      description: "Paling sering dipesan",
      date: "Lihat koleksi →",
    },
    {
      className: "dc-layer dc-layer-3",
      icon: <img src="/images/figma/icons/arrow-up-right.svg" alt="" />,
      title: "Baru datang",
      description: "Stok ukuran lengkap",
      date: "Lihat koleksi →",
    },
  ];
  const displayCards = cards && cards.length ? cards : defaultCards;

  return (
    <div className="dc-grid" role="list">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
