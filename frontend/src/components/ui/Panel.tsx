import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

interface PanelProps {
  title: ReactNode;
  children: ReactNode;
  /** إجراءات في رأس اللوح (لا تتأثر بالطي) */
  actions?: ReactNode;
  /** قابل للطي — افتراضياً true */
  collapsible?: boolean;
  /** يبدأ مطويّاً — افتراضياً true (لوحات مضغوطة كما يتطلب العقد) */
  defaultCollapsed?: boolean;
  /** وسم بجانب العنوان (حالة/عدد) */
  badge?: ReactNode;
}

/**
 * لوح قابل للطي (عقد Panel §2.3) — مضغوط افتراضياً.
 * O(1) للطي/الفتح.
 */
export default function Panel({
  title,
  children,
  actions,
  collapsible = true,
  defaultCollapsed = true,
  badge,
}: PanelProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const panelId = useId();
  const expanded = collapsible ? open : true;
  return (
    <div className="zad-accordion__item">
      <div className="flex items-center justify-between gap-3 px-4" style={{ minHeight: "var(--touch-min)" }}>
        {collapsible ? (
          <button
            type="button"
            className="flex flex-1 items-center gap-2 border-0 bg-transparent py-3 text-start text-base font-bold text-primary"
            style={{ cursor: "pointer" }}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
            <span>{title}</span>
            {badge}
          </button>
        ) : (
          <h3 className="flex flex-1 items-center gap-2 py-3 text-base font-bold text-primary">
            <span>{title}</span>
            {badge}
          </h3>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {expanded && (
        <div id={panelId} className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
