import { useEffect, useRef } from "react";

function AdminConfirmDialog({
  title,
  message,
  confirmLabel = "Ya, lanjutkan",
  destructive = false,
  busy = false,
  closeOnEscape = true,
  onCancel,
  onConfirm,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    function handleKeyDown(event) {
      if (closeOnEscape && event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, closeOnEscape, onCancel]);

  return (
    <div
      className="adminConfirmBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        className="adminConfirmDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminConfirmTitle"
        aria-describedby="adminConfirmMessage"
      >
        <span className={`adminConfirmIcon${destructive ? " isDestructive" : ""}`}>
          <img
            src={`/images/figma/icons/${destructive ? "triangle-alert" : "circle-help"}.svg`}
            alt=""
          />
        </span>
        <h2 id="adminConfirmTitle">{title}</h2>
        <p id="adminConfirmMessage">{message}</p>
        <footer>
          <button
            ref={cancelButtonRef}
            type="button"
            className="secondaryButton"
            onClick={onCancel}
            disabled={busy}
          >
            Batal
          </button>
          <button
            type="button"
            className={`primaryButton${destructive ? " destructiveButton" : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Memproses..." : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default AdminConfirmDialog;
