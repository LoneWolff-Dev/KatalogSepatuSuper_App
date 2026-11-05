// Renders compact catalog filter pills for shoe brands.
function CategoryPills({ categories, selectedType, onSelect, allLabel = "Semua merek" }) {
  return (
    <div className="category-pills" aria-label="Filter merek sepatu">
      <button
        type="button"
        className={selectedType === "all" ? "category-pill active" : "category-pill"}
        onClick={() => onSelect("all")}
        aria-pressed={selectedType === "all"}
      >
        {allLabel}
      </button>
      {categories.map((category) => (
        <button
          type="button"
          className={
            selectedType === category.id ? "category-pill active" : "category-pill"
          }
          key={category.id}
          onClick={() => onSelect(category.id)}
          aria-pressed={selectedType === category.id}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}

export default CategoryPills;