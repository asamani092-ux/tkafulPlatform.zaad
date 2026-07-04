import { useEffect, useState } from "react";
import { X, Check, AlertCircle, Info } from "lucide-react";

export interface ToastProps {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const STYLES: Record<ToastProps["type"], { bg: string; fg: string }> = {
  success: { bg: "var(--tmkeen-success-bg)", fg: "var(--tmkeen-success)" },
  error: { bg: "var(--tmkeen-danger-bg)", fg: "var(--tmkeen-danger)" },
  info: { bg: "var(--tmkeen-warning-bg)", fg: "var(--tmkeen-warning)" },
};

/** إشعار Toast موحّد بألوان design-system الدلالية. */
export default function Toast({ id, type, title, description, duration = 4500, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const t = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(t);
    }
  }, [duration, id, onClose]);

  const s = STYLES[type];
  const icon = type === "success" ? <Check size={20} /> : type === "error" ? <AlertCircle size={20} /> : <Info size={20} />;

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: "24rem",
        transition: "all .2s ease",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="card" style={{ background: s.bg, color: s.fg, padding: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <span style={{ color: s.fg, flexShrink: 0 }}>{icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>{title}</h4>
            {description && <p style={{ fontSize: "0.875rem", marginTop: "0.25rem", opacity: 0.9 }}>{description}</p>}
          </div>
          <button
            onClick={() => onClose(id)}
            aria-label="إغلاق"
            style={{ background: "transparent", border: 0, cursor: "pointer", color: s.fg, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
