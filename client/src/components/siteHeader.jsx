import LiquidGlassNav from "./LiquidGlassNav.jsx";

// Renders the liquid-glass storefront navigation (adapted for SepatuSuper).
function Header({ storeName, whatsappNumber, searchValue, onSearchChange }) {
  return (
    <LiquidGlassNav
      storeName={storeName}
      whatsappNumber={whatsappNumber}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
    />
  );
}

export default Header;
