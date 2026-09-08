import { useId, type SelectHTMLAttributes, type ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** قائمة منسدلة موحّدة تعتمد نمط ‎.input-field من design-system. */
export default function Select({ label, error, hint, id, className = "", children, ...rest }: SelectProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  return (
    <div>
      {label && (
        <label className="label-field" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <select
        id={fieldId}
        className={`input-field ${className}`.trim()}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
      {hint && !error && (
        <p id={hintId} style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{hint}</p>
      )}
      {error && (
        <p id={errId} style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{error}</p>
      )}
    </div>
  );
}
