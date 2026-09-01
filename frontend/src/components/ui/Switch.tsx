import { useId } from "react";

interface SwitchProps {
  /** تسمية عربية مرئية — إلزامية */
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  id?: string;
  /** وصف مساعد تحت التسمية */
  hint?: string;
}

/** تبديل تشغيل/إيقاف موحّد (عقد Switch: role=switch, aria-checked, لمس ≥ 44px). */
export default function Switch({ label, checked, onChange, disabled, id, hint }: SwitchProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-surface-border p-3">
      <div className="min-w-0">
        <label htmlFor={fieldId} className="block cursor-pointer font-bold text-primary">{label}</label>
        {hint && <p id={hintId} className="mt-0.5 text-xs text-brand-gray">{hint}</p>}
      </div>
      <button
        id={fieldId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hintId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: "relative",
          width: 48,
          height: 28,
          minWidth: 48,
          borderRadius: "var(--radius-full)",
          border: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          background: checked ? "var(--action-primary-surface)" : "var(--border-default)",
          transition: "background var(--duration-fast) var(--ease-standard)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 3,
            insetInlineStart: checked ? 23 : 3,
            width: 22,
            height: 22,
            borderRadius: "var(--radius-full)",
            background: "#fff",
            transition: "inset-inline-start var(--duration-fast) var(--ease-standard)",
          }}
        />
      </button>
    </div>
  );
}
