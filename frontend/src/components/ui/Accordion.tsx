import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  title: string;
  body: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
}

/** أكورديون — عقد Panel collapsible. */
export default function Accordion({ items, defaultOpenId }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  return (
    <div className="zad-accordion">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="zad-accordion__item">
            <button
              type="button"
              className="zad-accordion__trigger"
              aria-expanded={open}
              aria-controls={`acc-panel-${item.id}`}
              id={`acc-trigger-${item.id}`}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span>{item.title}</span>
              <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform var(--duration-fast)" }} aria-hidden />
            </button>
            {open && (
              <div
                id={`acc-panel-${item.id}`}
                role="region"
                aria-labelledby={`acc-trigger-${item.id}`}
                className="zad-accordion__panel"
              >
                {item.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
