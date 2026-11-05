// Provides a labeled search field for the shoe catalog.
function SearchBar({ value, onChange }) {
  return (
    <label className="search-field">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.2 4.2" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cari merek, jenis, atau nama sepatu..."
        aria-label="Cari produk sepatu"
      />
    </label>
  );
}

export default SearchBar;