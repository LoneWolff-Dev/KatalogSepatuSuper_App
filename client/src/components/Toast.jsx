import * as React from "react";

// Toast stack: beautiful auto-dismiss notifications for the whole app.
const TYPE_ICON = {
  success: "/images/figma/icons/check.svg",
  error: "/images/figma/icons/triangle-alert.svg",
  info: "/images/figma/icons/circle-help.svg",
  warning: "/images/figma/icons/triangle-alert.svg",
};

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-label="Notifikasi">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
          <span className="toast-icon" aria-hidden="true">
            <img src={TYPE_ICON[toast.type] || TYPE_ICON.info} alt="" />
          </span>
          <span className="toast-body">
            <strong>{toast.title}</strong>
            {toast.message && <small>{toast.message}</small>}
          </span>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Tutup notifikasi">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((type, title, message = "") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-3), { id, type, title, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4500);
  }, []);
  const dismiss = React.useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);
  return { toasts, push, dismiss };
}
