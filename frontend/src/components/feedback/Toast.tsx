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

const TONE: Record<ToastProps["type"], { bg: string; fg: string; role: "status" | "alert" }> = {
  success: { bg: "var(--success-surface)", fg: "var(--success-text)", role: "status" },
  error: { bg: "var(--danger-surface)", fg: "var(--danger-text)", role: "alert" },
  info: { bg: "var(--info-surface)", fg: "var(--info-text)", role: "status" },
};

/** إشعار Toast — عقد Alert/Toast بألوان التوكنات. */
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

  const s = TONE[type];
  const icon = type === "success" ? <Check size={20} /> : type === "error" ? <AlertCircle size={20} /> : <Info size={20} />;

  return (
    <div
      dir="rtl"
      role={s.role}
      style={{
        maxWidth: "24rem",
        transition: `transform var(--duration-base) var(--ease-standard), opacity var(--duration-base) var(--ease-standard)`,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="card" style={{ background: s.bg, color: s.fg, padding: "var(--space-4)" }}>
        <div className="flex items-start gap-3">
          <span style={{ color: s.fg, flexShrink: 0 }} aria-hidden>{icon}</span>
          <div className="min-w-0 flex-1">
            <h4 className="m-0 text-sm font-semibold">{title}</h4>
            {description && <p className="mt-1 text-sm" style={{ opacity: 0.9 }}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={() => onClose(id)}
            aria-label="إغلاق"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: s.fg,
              flexShrink: 0,
              minWidth: "var(--touch-min)",
              minHeight: "var(--touch-min)",
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
