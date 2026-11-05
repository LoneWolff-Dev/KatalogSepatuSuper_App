// Derives a stable, human-readable SKU from catalog data because the store
// database does not persist a SKU column yet.
const preferredBrandCodes = {
  Nike: "NK",
  Adidas: "AD",
  "New Balance": "NB",
  Converse: "CV",
  Vans: "VN",
  Puma: "PM",
  Asics: "AS",
  Timberland: "TB",
};

// Builds a two-letter brand code such as NK for Nike or NB for New Balance.
function getBrandCode(brand) {
  const value = String(brand || "").trim();
  if (preferredBrandCodes[value]) return preferredBrandCodes[value];
  const words = value.toLocaleUpperCase("id").split(/\s+/).filter(Boolean);
  if (!words.length) return "SS";
  if (words.length > 1) {
    return words.map((word) => word[0]).join("").slice(0, 2).padEnd(2, "S");
  }
  return words[0].slice(0, 2).padEnd(2, "S");
}

// Builds a compact model code such as AME for Air Max Everyday.
function getModelCode(name) {
  const words = String(name || "")
    .toLocaleUpperCase("id")
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "MDL";
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .padEnd(3, "X");
}

// Produces a stable three-digit sequence from the product identifier.
function getSequence(productId) {
  const groups = String(productId || "").match(/\d+/g);
  if (groups?.length) {
    const numeric = Number(groups[groups.length - 1]);
    if (Number.isFinite(numeric)) return String(numeric).padStart(3, "0").slice(-3);
  }
  let hash = 0;
  for (const character of String(productId || "0")) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1000;
  }
  return String(hash).padStart(3, "0");
}

// Returns the display SKU shown in the admin table and order dialog.
export function getProductSku(product) {
  return `${getBrandCode(product?.brand)}-${getModelCode(product?.name)}-${getSequence(product?.id)}`;
}

// Returns the first saved color name for compact table and order metadata.
export function getProductColorLabel(product) {
  return product?.colors?.[0]?.name || "Original";
}

// Assigns a small editorial badge without storing extra catalog fields.
export function getProductBadge(product, index = 0) {
  if (!product?.stockCount) return "Habis";
  if (product.stockCount <= 5) return "Stok terbatas";
  if (index === 0) return "Terlaris";
  if (index === 1) return "Favorit minggu ini";
  if (index === 2) return "Baru datang";
  return "";
}

// Lists the sizes that still have at least one pair available.
export function getAvailableSizes(product) {
  return [
    ...new Set(
      (product?.variants || [])
        .filter((variant) => variant.stock > 0)
        .map((variant) => variant.size),
    ),
  ];
}

// Approximate EU to foot-length guide used by the order dialog.
const footLengthBySize = {
  36: "22,5",
  37: "23",
  38: "24",
  39: "24,5",
  40: "25",
  41: "26",
  42: "26,5",
  43: "27,5",
  44: "28",
  45: "29",
  46: "29,5",
};

// Returns the approximate foot length for the selected EU size.
export function getFootLength(size) {
  return footLengthBySize[String(size)] || "";
}
