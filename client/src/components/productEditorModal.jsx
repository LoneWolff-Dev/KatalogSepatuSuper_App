import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminConfirmDialog from "./adminConfirmDialog.jsx";

const defaultSizes = ["39", "40", "41", "42", "43", "44"];
const colorPresets = [
  { name: "Hitam", hex: "#252525" },
  { name: "Putih", hex: "#f4f3ee" },
  { name: "Abu-abu", hex: "#9b9b99" },
  { name: "Navy", hex: "#243b60" },
  { name: "Biru", hex: "#3976b8" },
  { name: "Merah", hex: "#bd4938" },
  { name: "Cokelat", hex: "#80583e" },
  { name: "Krem", hex: "#d8c6a5" },
  { name: "Hijau", hex: "#58765b" },
  { name: "Pink", hex: "#d99aaa" },
];

// Creates editable color rows from an existing product or an empty shoe form.
function createColorDrafts(product) {
  if (!product?.colors?.length) {
    return [
      {
        name: "Putih",
        hex: "#f4f3ee",
        sizes: defaultSizes.map((size) => ({ size, stock: 0 })),
      },
    ];
  }
  return product.colors.map((color) => ({
    name: color.name,
    hex: color.hex,
    sizes: product.variants
      .filter((variant) => variant.color === color.name)
      .map((variant) => ({ size: variant.size, stock: variant.stock })),
  }));
}

// Provides a validated product editor with image, shoe types, colors, and stock.
function ProductFormModal({ product, categories, isPage = false, onClose, onSave }) {
  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [description, setDescription] = useState(product?.description || "");
  const [imageUrl, setImageUrl] = useState(product?.image || "");
  const [imageFile, setImageFile] = useState(null);
  const [colors, setColors] = useState(() => createColorDrafts(product));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const formRef = useRef(null);
  const imageInputRef = useRef(null);

  const imagePreview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : imageUrl),
    [imageFile, imageUrl],
  );
  const initialSnapshot = useMemo(
    () => JSON.stringify({
      name: product?.name || "",
      brand: product?.brand || "",
      categoryId: product?.categoryId || "",
      price: product?.price ?? "",
      description: product?.description || "",
      imageUrl: product?.image || "",
      imageFile: "",
      colors: createColorDrafts(product),
    }),
    [product],
  );
  const currentSnapshot = JSON.stringify({
    name,
    brand,
    categoryId,
    price,
    description,
    imageUrl,
    imageFile: imageFile ? `${imageFile.name}:${imageFile.size}:${imageFile.lastModified}` : "",
    colors,
  });
  const isDirty = currentSnapshot !== initialSnapshot;

  // Releases a temporary image preview after the selected file changes.
  useEffect(() => {
    if (!imageFile) return undefined;
    const previewUrl = imagePreview;
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile, imagePreview]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose, saving]);

  // Returns focus to the first field that needs attention after validation.
  useEffect(() => {
    if (Object.keys(errors).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
    }
  }, [errors]);

  // Keeps Escape behavior consistent with the close controls and discard dialog.
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (confirmDiscard) {
        setConfirmDiscard(false);
      } else {
        requestClose();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmDiscard, requestClose]);

  // Adds an editable color and gives it the initial shoe-size rows.
  function handleAddColor() {
    setErrors({});
    setColors((currentColors) => [
      ...currentColors,
      {
        name: "",
        hex: "#d8d8d3",
        sizes: defaultSizes.map((size) => ({ size, stock: 0 })),
      },
    ]);
  }

  // Removes a color only when another color remains in the product form.
  function handleRemoveColor(colorIndex) {
    setErrors({});
    setColors((currentColors) =>
      currentColors.length > 1
        ? currentColors.filter((color, index) => index !== colorIndex)
        : currentColors,
    );
  }

  // Updates the name or display color of one shoe color option.
  function handleColorChange(colorIndex, field, value) {
    setErrors({});
    setColors((currentColors) =>
      currentColors.map((color, index) =>
        index === colorIndex ? { ...color, [field]: value } : color,
      ),
    );
  }

  function handleColorPreset(colorIndex, preset) {
    setErrors({});
    setColors((currentColors) =>
      currentColors.map((color, index) =>
        index === colorIndex
          ? { ...color, name: preset.name, hex: preset.hex }
          : color,
      ),
    );
  }

  function handleCustomColorChange(colorIndex, hex) {
    setErrors({});
    setColors((currentColors) =>
      currentColors.map((color, index) => {
        if (index !== colorIndex) return color;
        const selectedPreset = colorPresets.find(
          (preset) => preset.hex.toLowerCase() === color.hex.toLowerCase(),
        );
        const name = !color.name.trim() || color.name === selectedPreset?.name
          ? "Kustom"
          : color.name;
        return { ...color, name, hex };
      }),
    );
  }

  // Adds a new size row to the selected shoe color.
  function handleAddSize(colorIndex) {
    setErrors({});
    setColors((currentColors) =>
      currentColors.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              sizes: [...color.sizes, { size: "", stock: 0 }],
            }
          : color,
      ),
    );
  }

  // Updates one size or stock field in the selected color group.
  function handleSizeChange(colorIndex, sizeIndex, field, value) {
    setErrors({});
    setColors((currentColors) =>
      currentColors.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              sizes: color.sizes.map((size, rowIndex) =>
                rowIndex === sizeIndex ? { ...size, [field]: value } : size,
              ),
            }
          : color,
      ),
    );
  }

  // Removes a size row while keeping at least one size in the color group.
  function handleRemoveSize(colorIndex, sizeIndex) {
    setErrors({});
    setColors((currentColors) =>
      currentColors.map((color, index) =>
        index === colorIndex && color.sizes.length > 1
          ? {
              ...color,
              sizes: color.sizes.filter((size, rowIndex) => rowIndex !== sizeIndex),
            }
          : color,
      ),
    );
  }

  // Saves the product and inventory as multipart form data.
  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    const nextErrors = {};
    const addError = (key, message) => {
      nextErrors[key] = message;
    };

    if (!name.trim()) addError("name", "Nama produk wajib diisi.");
    if (!brand.trim()) addError("brand", "Merek wajib diisi.");
    if (!categoryId) addError("categoryId", "Pilih jenis sepatu.");
    if (String(price).trim() === "" || !Number.isFinite(Number(price)) || Number(price) < 0) {
      addError("price", "Masukkan harga berupa angka nol atau lebih.");
    }
    if (!imageFile && !imageUrl.trim() && !product) {
      addError("image", "Unggah foto produk sebelum menyimpan koleksi.");
    } else if (imageFile) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
        addError("image", "Pilih gambar JPG, PNG, atau WEBP.");
      } else if (imageFile.size > 5 * 1024 * 1024) {
        addError("image", "Ukuran foto maksimal 5 MB.");
      }
    }
    if (product && imageUrl.trim() && !imageUrl.startsWith("/uploads/")) {
      try {
        const parsedImageUrl = new URL(imageUrl, window.location.origin);
        if (!["http:", "https:"].includes(parsedImageUrl.protocol)) {
          addError("imageUrl", "Gunakan URL gambar yang diawali http:// atau https://.");
        }
      } catch {
        addError("imageUrl", "Masukkan URL gambar yang valid.");
      }
    }

    const seenColors = new Set();
    const seenVariants = new Set();
    if (!colors.length) addError("colors", "Tambahkan setidaknya satu warna.");
    colors.forEach((color, colorIndex) => {
      const normalizedColor = color.name.trim().toLocaleLowerCase("id");
      if (!normalizedColor) {
        addError(`color-${colorIndex}`, `Nama warna ${colorIndex + 1} wajib diisi.`);
      } else if (seenColors.has(normalizedColor)) {
        addError(`color-${colorIndex}`, `Nama warna "${color.name.trim()}" digunakan lebih dari sekali.`);
      }
      seenColors.add(normalizedColor);
      if (!/^#[\da-f]{6}$/i.test(color.hex)) {
        addError(`color-${colorIndex}`, `Pilih kode warna yang valid untuk ${color.name || `warna ${colorIndex + 1}`}.`);
      }
      if (!color.sizes.length) {
        addError(`color-${colorIndex}`, `Tambahkan setidaknya satu ukuran untuk ${color.name || `warna ${colorIndex + 1}`}.`);
      }
      color.sizes.forEach((size, sizeIndex) => {
        const normalizedSize = size.size.trim().toLocaleLowerCase("id");
        const fieldKey = `size-${colorIndex}-${sizeIndex}`;
        if (!normalizedSize) {
          addError(fieldKey, `Ukuran pada warna ${color.name || colorIndex + 1} wajib diisi.`);
        } else {
          const variantKey = `${normalizedColor}:${normalizedSize}`;
          if (seenVariants.has(variantKey)) {
            addError(fieldKey, `Ukuran ${size.size} untuk warna ${color.name} tercatat lebih dari sekali.`);
          }
          seenVariants.add(variantKey);
        }
        const stock = Number(size.stock);
        if (String(size.stock).trim() === "" || !Number.isInteger(stock) || stock < 0) {
          addError(`stock-${colorIndex}-${sizeIndex}`, "Stok harus berupa bilangan bulat nol atau lebih.");
        }
      });
    });

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const variants = colors.flatMap((color) =>
      color.sizes.map((size) => ({
        color: color.name,
        colorHex: color.hex,
        size: size.size,
        stock: Number(size.stock),
      })),
    );

    const formData = new FormData();
    formData.set("name", name);
    formData.set("brand", brand);
    formData.set("categoryId", categoryId);
    formData.set("price", String(price));
    formData.set("description", description);
    formData.set("variants", JSON.stringify(variants));
    if (imageFile) {
      formData.set("image", imageFile);
    } else if (imageUrl) {
      formData.set("imageUrl", imageUrl);
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (saveError) {
      setErrors({ submit: saveError.message || "Produk belum berhasil disimpan. Coba lagi." });
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    setErrors({});
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageFile(null);
      setErrors({ image: "Pilih gambar JPG, PNG, atau WEBP." });
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      setErrors({ image: "Ukuran foto maksimal 5 MB." });
      event.target.value = "";
      return;
    }
    setImageFile(file);
  }

  function clearFormErrors() {
    setErrors({});
  }

  return (
    <div className={`productEditorPage${isPage ? " isPage" : ""}`}>
      <header className="productEditorMobileHeader">
        <button type="button" onClick={requestClose}>
          <img src="/images/figma/icons/chevron-left.svg" alt="" />
          Kelola Produk
        </button>
        <button type="button" onClick={requestClose} aria-label="Tutup formulir">
          ×
        </button>
      </header>
      <section
        className="productEditorModal"
        aria-labelledby="productEditorTitle"
      >
        <header className="productEditorHeader">
          <div>
            <h2 id="productEditorTitle">
              {product ? "Edit produk" : "Tambah koleksi baru"}
            </h2>
            <p>
              Lengkapi detail produk, foto, dan stok setiap ukuran agar siap dipantau
              di katalog admin.
            </p>
          </div>
          <button type="button" className="adminIconButton" onClick={requestClose} aria-label="Tutup formulir">
            ×
          </button>
        </header>
        <form className="productEditorForm" ref={formRef} onSubmit={handleSubmit} noValidate>
          {Object.keys(errors).length > 0 && (
            <div className="productFormErrorSummary" role="alert" aria-live="assertive">
              <span className="productFormErrorIcon">!</span>
              <div>
                <strong>
                  {errors.submit ? "Produk belum berhasil disimpan" : "Periksa kembali formulir"}
                </strong>
                <ul>
                  {Object.values(errors).map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="productFormMain">
            <div className="productImageEditor">
              <span className="formFieldLabel">
                Foto produk{" "}
                <span className={product ? "optionalFieldBadge" : "requiredFieldBadge"}>
                  {product ? "Opsional" : "Wajib"}
                </span>
              </span>
              <div className="productImagePreview">
                {imagePreview ? (
                  <img src={imagePreview} alt="Pratinjau produk sepatu" />
                ) : (
                  <div className="productImageEmpty">
                    <img src="/images/figma/icons/package-2.svg" alt="" />
                    <strong>Belum ada foto</strong>
                    <span>Pratinjau akan tampil di sini</span>
                  </div>
                )}
                {imagePreview && <span className="primaryPhotoBadge">Foto utama</span>}
              </div>
              <label className={`imageUploadButton${errors.image ? " hasError" : ""}`}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-invalid={Boolean(errors.image)}
                  aria-describedby={errors.image ? "productImageError" : "productImageHint"}
                  onChange={handleImageChange}
                />
                <img src="/images/figma/icons/upload.svg" alt="" />
                {imageFile ? "Ganti foto" : imagePreview ? "Pilih foto lain" : "Pilih foto produk"}
              </label>
              {imageFile && (
                <div className="selectedImageFile">
                  <span>{imageFile.name} · {(imageFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      if (imageInputRef.current) imageInputRef.current.value = "";
                      clearFormErrors();
                    }}
                  >
                    Batalkan
                  </button>
                </div>
              )}
              <small id="productImageHint">
                JPG, PNG, atau WEBP · Maks. 5 MB. Foto persegi membantu sepatu tampil utuh.
              </small>
              {errors.image && <span className="fieldErrorMessage" id="productImageError">{errors.image}</span>}
              {product && (
                <label className="imageUrlField">
                  Atau gunakan URL gambar
                  <input
                    value={imageUrl.startsWith("/uploads/") ? "" : imageUrl}
                    onChange={(event) => {
                      setImageFile(null);
                      setImageUrl(event.target.value);
                      clearFormErrors();
                    }}
                    placeholder="https://..."
                    type="url"
                    aria-invalid={Boolean(errors.imageUrl)}
                  />
                  {errors.imageUrl && <span className="fieldErrorMessage">{errors.imageUrl}</span>}
                </label>
              )}
            </div>
            <div className="productDetailsEditor">
              <label className={errors.name ? "hasError" : ""}>
                Nama produk <span className="requiredFieldBadge">Wajib</span>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearFormErrors();
                  }}
                  placeholder="Contoh: Air Force 1 '07"
                  maxLength={120}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <span className="fieldErrorMessage">{errors.name}</span>}
              </label>
              <div className="productFormSplit">
                <label className={errors.brand ? "hasError" : ""}>
                  Merek <span className="requiredFieldBadge">Wajib</span>
                  <input
                    value={brand}
                    onChange={(event) => {
                      setBrand(event.target.value);
                      clearFormErrors();
                    }}
                    placeholder="Nike"
                    maxLength={60}
                    aria-invalid={Boolean(errors.brand)}
                  />
                  {errors.brand && <span className="fieldErrorMessage">{errors.brand}</span>}
                </label>
                <label className={errors.categoryId ? "hasError" : ""}>
                  Jenis sepatu <span className="requiredFieldBadge">Wajib</span>
                  <select
                    value={categoryId}
                    onChange={(event) => {
                      setCategoryId(event.target.value);
                      clearFormErrors();
                    }}
                    aria-invalid={Boolean(errors.categoryId)}
                  >
                    <option value="" disabled>Pilih jenis sepatu</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  {!categories.length && <option value="" disabled>Jenis sepatu belum tersedia</option>}
                </select>
                {errors.categoryId && <span className="fieldErrorMessage">{errors.categoryId}</span>}
                </label>
              </div>
              <label className={errors.price ? "hasError" : ""}>
                Harga <span className="requiredFieldBadge">Wajib</span>
                <input
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                  clearFormErrors();
                }}
                type="number"
                min="0"
                step="1000"
                placeholder="1549000"
                aria-invalid={Boolean(errors.price)}
                />
                {errors.price && <span className="fieldErrorMessage">{errors.price}</span>}
                <small className="formFieldHint">Masukkan nominal dalam rupiah, tanpa titik atau simbol.</small>
              </label>
              <label>
                Deskripsi produk
                <textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearFormErrors();
                }}
                placeholder="Ceritakan kenyamanan, bahan, dan karakter sepatu ini."
                rows={3}
                maxLength={500}
                />
                <small className="formFieldHint">{description.length}/500 karakter</small>
              </label>
            </div>
          </div>

          <section className="inventoryEditor">
            <div className="inventoryEditorHeading">
              <div>
                <h3>Varian warna, ukuran & stok</h3>
                <p>Tambahkan tiap warna dan ukuran yang benar-benar tersedia di toko.</p>
              </div>
              <strong>
                Total: {colors.reduce(
                  (total, color) =>
                    total +
                    color.sizes.reduce(
                      (sizeTotal, size) => sizeTotal + (Number(size.stock) || 0),
                      0,
                    ),
                  0,
                )}{" "}
                pasang
              </strong>
            </div>
            {colors.map((color, colorIndex) => (
              <section className="inventoryColorGroup" key={`color-${colorIndex}`}>
                <header className="inventoryColorHeading">
                  <div className="colorVariantControls">
                    <label className="colorNameField">
                      Nama warna
                      <input
                        value={color.name}
                        onChange={(event) =>
                          handleColorChange(colorIndex, "name", event.target.value)
                        }
                        placeholder="Contoh: Putih / Navy"
                        aria-label={`Nama warna ${colorIndex + 1}`}
                        aria-invalid={Boolean(errors[`color-${colorIndex}`])}
                      />
                    </label>
                    <div className="colorPickerField">
                      <span className="colorPickerLabel">Pilih warna</span>
                      <div className="colorPresetList" role="group" aria-label={`Warna siap pilih untuk varian ${colorIndex + 1}`}>
                        {colorPresets.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            className="colorPresetButton"
                            style={{ "--preset-color": preset.hex }}
                            aria-label={`Pilih warna ${preset.name}`}
                            aria-pressed={color.hex.toLowerCase() === preset.hex.toLowerCase()}
                            title={preset.name}
                            onClick={() => handleColorPreset(colorIndex, preset)}
                          >
                            <span />
                            <span>{preset.name}</span>
                          </button>
                        ))}
                        <label className="customColorPicker">
                          <input
                            type="color"
                            value={color.hex}
                            onChange={(event) =>
                              handleCustomColorChange(colorIndex, event.target.value)
                            }
                            aria-label={`Pilih warna lain untuk varian ${colorIndex + 1}`}
                          />
                          <span className="customColorSwatch" style={{ backgroundColor: color.hex }} />
                          <span>Warna lain</span>
                        </label>
                      </div>
                      <small className="colorPickerHint">
                        Pilih warna cepat atau gunakan pemilih warna.
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="tableActionButton deleteAction"
                    onClick={() => handleRemoveColor(colorIndex)}
                    disabled={colors.length <= 1}
                    aria-label={`Hapus warna ${color.name || colorIndex + 1}`}
                  >
                    ×
                  </button>
                </header>
                {errors[`color-${colorIndex}`] && (
                  <span className="fieldErrorMessage">{errors[`color-${colorIndex}`]}</span>
                )}
                <div className="inventoryGridHeader">
                  <span>Ukuran (EU)</span>
                  <span>Stok tersedia</span>
                  <span aria-label="Aksi" />
                </div>
                {color.sizes.map((size, sizeIndex) => (
                  <div
                    className="inventorySizeRow"
                    key={`size-${colorIndex}-${sizeIndex}`}
                  >
                    <input
                      value={size.size}
                      onChange={(event) =>
                        handleSizeChange(colorIndex, sizeIndex, "size", event.target.value)
                      }
                      placeholder="40"
                      aria-label={`Ukuran ${sizeIndex + 1} warna ${color.name}`}
                      aria-invalid={Boolean(errors[`size-${colorIndex}-${sizeIndex}`])}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={size.stock}
                      onChange={(event) =>
                        handleSizeChange(colorIndex, sizeIndex, "stock", event.target.value)
                      }
                      aria-label={`Stok ukuran ${size.size} warna ${color.name}`}
                      aria-invalid={Boolean(errors[`stock-${colorIndex}-${sizeIndex}`])}
                    />
                    <button
                      type="button"
                      className="tableActionButton deleteAction"
                      onClick={() => handleRemoveSize(colorIndex, sizeIndex)}
                      disabled={color.sizes.length <= 1}
                      aria-label={`Hapus ukuran ${size.size}`}
                    >
                      ×
                    </button>
                    {(errors[`size-${colorIndex}-${sizeIndex}`] || errors[`stock-${colorIndex}-${sizeIndex}`]) && (
                      <span className="fieldErrorMessage inventoryRowError">
                        {errors[`size-${colorIndex}-${sizeIndex}`] || errors[`stock-${colorIndex}-${sizeIndex}`]}
                      </span>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="addInventoryRow"
                  onClick={() => handleAddSize(colorIndex)}
                >
                  + Tambah ukuran
                </button>
              </section>
            ))}
            <button type="button" className="addColorButton" onClick={handleAddColor}>
              + Tambah warna sepatu
            </button>
          </section>
          {errors.submit && <p className="productFormErrorSummary" role="alert">{errors.submit}</p>}
          <footer className="productEditorFooter">
            <span><b>*</b> Wajib diisi</span>
            <div>
              <button type="button" className="secondaryButton" onClick={requestClose} disabled={saving}>
                Batal
              </button>
              <button type="submit" className="primaryButton" disabled={saving}>
                {saving ? "Menyimpan..." : product ? "Simpan perubahan" : "Simpan produk"}
              </button>
            </div>
          </footer>
        </form>
      </section>
      {confirmDiscard && (
        <AdminConfirmDialog
          title="Tutup tanpa menyimpan?"
          message="Perubahan yang sudah Anda isi akan dibuang dan tidak bisa dipulihkan."
          confirmLabel="Buang perubahan"
          destructive
          closeOnEscape={false}
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </div>
  );
}

export default ProductFormModal;
