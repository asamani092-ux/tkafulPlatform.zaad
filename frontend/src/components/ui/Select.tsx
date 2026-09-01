import { useId, type SelectHTMLAttributes, type ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

/** قائمة منسدلة موحّدة تعتمد نمط ‎.input-field من design-system. */
export default function Select({ label, error, id, className = "", children, ...rest }: SelectProps) {
  const autoId = useId();
  const fieldId = id || autoId;
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
        aria-describedby={errId}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={errId} style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{error}</p>
      )}
    </div>
  );
}
