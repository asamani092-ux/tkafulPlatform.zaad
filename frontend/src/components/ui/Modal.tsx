import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  wide?: boolean;
  children: ReactNode;
}

/** نافذة منبثقة موحّدة (‎.modal-overlay/.modal-panel) — عقد Dialog. */
export default function Modal({ open, onClose, title, wide, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className={`modal-panel${wide ? " wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "zad-modal-title" : undefined}
      >
        <div className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            {title && (
              <h3 id="zad-modal-title" className="m-0 font-bold text-primary">
                {title}
              </h3>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="zad-nav-link"
              style={{ width: "auto", minWidth: "var(--touch-min)", justifyContent: "center" }}
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
