import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** بطاقة قابلة للطي بانزلاق بسيط لترتيب الأقسام. */
export default function CollapsibleCard({ title, subtitle, defaultOpen = false, badge, actions, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="card overflow-hidden" dir="rtl" data-collapsed={open ? "false" : "true"}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-surface-muted/40 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-primary sm:text-lg">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-brand-gray">{subtitle}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {actions ? (
            <span
              className="flex flex-wrap items-center gap-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {actions}
            </span>
          ) : null}
          <span className="text-primary" aria-hidden>
            {open ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
          </span>
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={open ? "border-t border-surface-border px-4 pb-4 pt-3 sm:px-5" : undefined}
      >
        {open ? children : null}
      </div>
    </div>
  );
}
