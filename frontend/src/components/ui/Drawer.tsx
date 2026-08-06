import type { ReactNode } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** درج جانبي / Profile SlideOver — يفتح من inline-start (يمين في RTL). */
export default function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  if (!open) return null;
  return (
    <>
      <div className="zad-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="zad-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zad-drawer-title"
      >
        <div className="zad-drawer__header">
          <h2 id="zad-drawer-title" className="zad-drawer__title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="zad-nav-link"
            style={{ width: "auto", minWidth: "var(--touch-min)" }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="mt-auto pt-2">{footer}</div>}
      </aside>
    </>
  );
}
