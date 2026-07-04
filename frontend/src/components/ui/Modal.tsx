import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  wide?: boolean;
  children: ReactNode;
}

/** نافذة منبثقة موحّدة (‎.modal-overlay/.modal-panel). */
export default function Modal({ open, onClose, title, wide, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-panel${wide ? " wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            {title && <h3 style={{ color: "var(--tmkeen-primary)", fontWeight: 700, margin: 0 }}>{title}</h3>}
            <button onClick={onClose} aria-label="إغلاق" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--tmkeen-brand-gray)" }}>
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
