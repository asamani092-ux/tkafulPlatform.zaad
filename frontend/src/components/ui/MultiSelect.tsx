import { useId, useMemo, useRef, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface MultiSelectProps {
  /** تسمية عربية مرئية — إلزامية */
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** حد أقصى للاختيارات */
  max?: number;
  disabled?: boolean;
  emptyText?: string;
  hint?: string;
}

/**
 * اختيار متعدد قابل للبحث (عقد MultiSelect/Combobox §1.4).
 * البحث O(n) على الخيارات لكل ضغطة مفتاح؛ n صغير (قائمة محمّلة).
 */
export default function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "ابحث واختر…",
  max,
  disabled,
  emptyText = "لا نتائج",
  hint,
}: MultiSelectProps) {
  const fieldId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) => !selectedSet.has(o.value) && (q === "" || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)),
    );
  }, [options, query, selectedSet]);

  const atMax = max != null && value.length >= max;

  const add = (v: string) => {
    if (atMax) return;
    onChange([...value, v]);
    setQuery("");
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  return (
    <div>
      <label className="label-field" htmlFor={fieldId}>{label}</label>
      <div ref={boxRef} style={{ position: "relative" }}>
        {value.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {value.map((v) => (
              <span key={v} className="zad-chip">
                {byValue.get(v)?.label || v}
                <button
                  type="button"
                  className="zad-chip__remove"
                  aria-label={`إزالة ${byValue.get(v)?.label || v}`}
                  onClick={() => remove(v)}
                  disabled={disabled}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          id={fieldId}
          type="search"
          className="input-field"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={atMax ? `بلغت الحد الأقصى (${max})` : placeholder}
          value={query}
          disabled={disabled || atMax}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
        />
        {open && !atMax && (
          <ul
            role="listbox"
            className="custom-scrollbar"
            style={{
              position: "absolute",
              zIndex: "var(--z-dropdown)",
              insetInlineStart: 0,
              insetInlineEnd: 0,
              marginTop: 4,
              maxHeight: "14rem",
              overflowY: "auto",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              listStyle: "none",
              padding: 4,
            }}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-brand-gray">{emptyText}</li>
            ) : (
              filtered.slice(0, 50).map((o) => (
                <li key={o.value} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-start text-sm hover:bg-surface-muted"
                    onMouseDown={(e) => { e.preventDefault(); add(o.value); }}
                  >
                    <span className="font-semibold text-primary">{o.label}</span>
                    {o.hint && <span className="text-xs text-brand-gray" dir="ltr">{o.hint}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {hint && <p id={`${fieldId}-hint`} className="mt-1 text-xs text-brand-gray">{hint}</p>}
    </div>
  );
}
