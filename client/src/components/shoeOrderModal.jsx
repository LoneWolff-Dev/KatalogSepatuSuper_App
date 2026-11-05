import { useEffect, useState } from "react";
import {
  buildOrderWhatsAppLink,
  createOrder,
  formatPrice,
  normalizeWhatsAppNumber,
} from "../services/api.js";
import { getFootLength } from "../services/catalogMeta.js";

// Collects the selected shoe and buyer details before opening WhatsApp.
function OrderModal({ product, settings, onClose }) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name || "");
  const [selectedSize, setSelectedSize] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const isNikeAirForce =
    product.brand?.toLocaleLowerCase("id") === "nike" &&
    product.name.toLocaleLowerCase("id").includes("air force 1");
  const galleryImages = isNikeAirForce
    ? [
        product.image || "/images/figma/order-nike-air-force-main.png",
        "/images/figma/order-nike-air-force-angle.png",
        "/images/figma/order-nike-air-force-side.png",
        "/images/figma/order-nike-air-force-detail.png",
      ]
    : product.image
      ? [product.image]
      : [];

  const selectedVariant = product.variants.find(
    (variant) =>
      variant.color === selectedColor &&
      variant.size === selectedSize &&
      variant.stock >= quantity,
  );
  const whatsappReady =
    settings.activeWhatsApp && Boolean(normalizeWhatsAppNumber(settings.whatsappNumber));

  // Closes the order dialog when the customer presses Escape.
  useEffect(() => {
    // Closes the dialog in response to the Escape key.
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  // Formats a preview of the message that will be sent after an order is saved.
  function getMessagePreview() {
    const shoeDescription = [
      product.brand,
      product.name,
      selectedColor ? `Warna: ${selectedColor}` : "Warna: [belum dipilih]",
      selectedSize ? `Ukuran: ${selectedSize}` : "Ukuran: [belum dipilih]",
      `Jumlah: ${quantity} pasang`,
    ]
      .filter(Boolean)
      .join(" · ");
    return [
      `Halo ${settings.storeName}, saya mau pesan:`,
      shoeDescription,
      `Harga: ${formatPrice(product.price)}${quantity > 1 ? ` · Total: ${formatPrice(product.price * quantity)}` : ""}`,
      buyerName ? `Nama: ${buyerName}` : "Nama: [belum diisi]",
      address ? `Alamat: ${address}` : "Alamat: [belum diisi]",
      note ? `Catatan: ${note}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // Saves the order before handing the prepared WhatsApp conversation to the buyer.
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!selectedVariant) {
      setError("Pilih warna dan ukuran yang stoknya masih tersedia.");
      return;
    }
    if (!whatsappReady) {
      setError("Nomor WhatsApp toko belum aktif. Silakan hubungi admin.");
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;
    setSubmitting(true);
    try {
      const order = await createOrder({
        productId: product.id,
        color: selectedColor,
        size: selectedSize,
        quantity,
        buyerName,
        address,
        note,
      });
      const whatsappUrl = buildOrderWhatsAppLink(
        settings.whatsappNumber,
        order,
        settings.storeName,
      );
      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.assign(whatsappUrl);
      }
    } catch (submitError) {
      whatsappWindow?.close();
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Closes the dialog when the customer clicks outside the order panel.
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  // Changes shoe color and clears a size selection that belongs to the old color.
  function handleColorChange(colorName) {
    setSelectedColor(colorName);
    setSelectedSize("");
    setQuantity(1);
  }

  return (
    <div className="modal-backdrop orderBackdrop" onMouseDown={handleBackdropClick}>
      <section
        className={`orderExperience${selectedVariant ? " isReady" : " isSelecting"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="orderTitle"
      >
        <header className="orderExperienceHeader">
          <div>
            <p>
              {selectedVariant
                ? "SEPATU SUPER / PESAN VIA WHATSAPP"
                : "SEPATU SUPER / LENGKAPI VARIAN"}
            </p>
            <h2 id="orderTitle">
              {selectedVariant
                ? "Pasanganmu tinggal satu langkah lagi."
                : "Pilih ukuran. Temukan pasnya."}
            </h2>
          </div>
          <button
            className="orderCloseButton"
            type="button"
            onClick={onClose}
            aria-label="Tutup detail pesanan"
          >
            <img src="/images/figma/icons/close.svg" alt="" />
          </button>
        </header>
        <form className="orderExperienceBody" onSubmit={handleSubmit}>
          <div className="orderShoeDetails">
            <div className="orderShoeGallery">
              <div className="orderShoePhoto">
                {galleryImages.length > 0 && !imageFailed ? (
                  <img
                    src={galleryImages[galleryIndex]}
                    alt={`${product.brand} ${product.name}`}
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <span className="image-placeholder" aria-hidden="true">SS</span>
                )}
                {product.stockCount > 0 && (
                  <span className="orderPhotoBadge">Terlaris</span>
                )}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      className="galleryArrow galleryPrevious"
                      type="button"
                      onClick={() => {
                        setImageFailed(false);
                        setGalleryIndex((index) => (index - 1 + galleryImages.length) % galleryImages.length);
                      }}
                      aria-label="Foto sebelumnya"
                    >
                      <img src="/images/figma/icons/chevron-left.svg" alt="" />
                    </button>
                    <button
                      className="galleryArrow galleryNext"
                      type="button"
                      onClick={() => {
                        setImageFailed(false);
                        setGalleryIndex((index) => (index + 1) % galleryImages.length);
                      }}
                      aria-label="Foto selanjutnya"
                    >
                      <img src="/images/figma/icons/chevron-right.svg" alt="" />
                    </button>
                    <img
                      className="galleryIndicator"
                      src="/images/figma/icons/gallery-indicator.svg"
                      alt=""
                    />
                  </>
                )}
              </div>
              {galleryImages.length > 1 && (
                <div className="orderGalleryFooter">
                  <div className="orderGalleryThumbnails">
                    {galleryImages.slice(1).map((image, index) => {
                      const photoIndex = index + 1;
                      return (
                        <button
                          key={image}
                          type="button"
                          className={galleryIndex === photoIndex ? "active" : ""}
                          onClick={() => {
                            setImageFailed(false);
                            setGalleryIndex(photoIndex);
                          }}
                          aria-label={`Tampilkan foto ${photoIndex + 1}`}
                        >
                          <img src={image} alt="" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="galleryCaption">
                    <strong>{String(galleryIndex + 1).padStart(2, "0")} / 03</strong>
                    <span>Geser untuk lihat detail</span>
                  </div>
                </div>
              )}
            </div>
            <div className="orderShoeCopy">
              <p className="eyebrow">
                {product.brand} / {product.categoryName}
              </p>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <strong>{formatPrice(product.price)}</strong>
              <div className="orderShippingNote">
                <img src="/images/figma/icons/package-check.svg" alt="" />
                <span>
                  <strong>Ready stock • Siap menemani langkahmu</strong>
                  <small>
                    Harga belum termasuk ongkir. Stok dan total akhir akan
                    dikonfirmasi admin lewat WhatsApp.
                  </small>
                </span>
              </div>
            </div>
          </div>

          <div className="orderFields">
            <section className="orderChoiceSection">
              <div className="orderFieldHeading">
                <label htmlFor="sizeOptions">Pilih ukuran (EU) *</label>
                <button type="button" onClick={() => setGuideOpen(!guideOpen)}>
                  Panduan ukuran
                </button>
              </div>
              <div className="orderSizeOptions" id="sizeOptions">
                {[...product.variants]
                  .filter((variant) => variant.color === selectedColor)
                  .sort((first, second) => Number(first.size) - Number(second.size))
                  .map((variant) => (
                    <button
                      type="button"
                      key={variant.id || `${variant.color}-${variant.size}`}
                      className={
                        selectedSize === variant.size
                          ? "orderSizeOption selected"
                          : "orderSizeOption"
                      }
                      onClick={() => {
                        setSelectedSize(variant.size);
                        setQuantity(1);
                      }}
                      disabled={variant.stock <= 0}
                      aria-pressed={selectedSize === variant.size}
                    >
                      {variant.size}
                    </button>
                  ))}
              </div>
              {guideOpen && (
                <div className="sizeGuide">
                  <strong>Panduan ukuran EU</strong>
                  <span>39: 24,5 cm · 40: 25 cm · 41: 26 cm</span>
                  <span>42: 26,5 cm · 43: 27,5 cm · 44: 28 cm</span>
                </div>
              )}
              {selectedVariant && (
                <p className="variantAvailability">
                  <img src="/images/figma/icons/check-lime.svg" alt="" />
                  Ukuran {selectedVariant.size} dipilih
                  {getFootLength(selectedVariant.size) &&
                    ` · Panjang kaki ±${getFootLength(selectedVariant.size)} cm`}
                </p>
              )}
              {!selectedSize && (
                <p className="orderValidationHint">
                  <span aria-hidden="true">!</span>
                  Pilih ukuran agar admin bisa menyiapkan pesanan.
                </p>
              )}
            </section>

            <section className="orderChoiceSection colorChoiceSection">
              <div className="orderFieldHeading">
                <span>Pilih warna *</span>
              </div>
              <div className="orderColorOptions" aria-label="Pilih warna sepatu">
                {product.colors.map((color) => (
                  <button
                    type="button"
                    key={color.name}
                    className={
                      selectedColor === color.name
                        ? "orderColorOption selected"
                        : "orderColorOption"
                    }
                    onClick={() => handleColorChange(color.name)}
                    aria-label={color.name}
                    aria-pressed={selectedColor === color.name}
                  >
                    <span className="orderColorSwatch" style={{ backgroundColor: color.hex }} />
                    <span className="orderColorName">{color.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="buyerFields">
              <h3>Data pembeli</h3>
              <label htmlFor="buyerName">Nama lengkap *</label>
              <input
                id="buyerName"
                name="buyerName"
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                maxLength={120}
                autoComplete="name"
                placeholder="Masukkan nama lengkap"
                required
              />
              <label htmlFor="buyerAddress">Alamat lengkap / catatan pengiriman *</label>
              <textarea
                id="buyerAddress"
                name="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                maxLength={1000}
                autoComplete="street-address"
                placeholder="Jalan, nomor rumah, kelurahan, kecamatan, kota, dan kode pos"
                rows={3}
                required
              />
              <label htmlFor="buyerNote">Catatan tambahan</label>
              <input
                id="buyerNote"
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder="Opsional"
              />
              {selectedVariant && selectedVariant.stock > 1 && (
                <>
                  <label htmlFor="orderQuantity">Jumlah pasang</label>
                  <input
                    id="orderQuantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max={selectedVariant.stock}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        Math.max(1, Math.min(Number(event.target.value) || 1, selectedVariant.stock)),
                      )
                    }
                  />
                </>
              )}
            </section>

            <div className="whatsappPreview">
              <p>◉ Preview pesan WhatsApp <span>OTOMATIS</span></p>
              <pre>{getMessagePreview()}</pre>
            </div>
            {error && <p className="orderSubmitError" role="alert">{error}</p>}
            {!whatsappReady && (
              <p className="orderSubmitError">
                WhatsApp toko belum dikonfigurasi. Hubungi admin melalui kontak toko.
              </p>
            )}
            <button
              className="orderSubmitButton"
              type="submit"
              disabled={!selectedVariant || !whatsappReady || submitting}
            >
              <img src="/images/figma/icons/whatsapp.svg" alt="" />
              {submitting ? "Menyimpan pesanan..." : "Kirim Pesanan ke WhatsApp"}
              {!submitting && <span aria-hidden="true">↗</span>}
            </button>
            <p className="orderSubmitFootnote">
              Pesanan disimpan untuk konfirmasi admin. Pembayaran dilakukan setelah
              admin menghubungi melalui WhatsApp.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}

export default OrderModal;
