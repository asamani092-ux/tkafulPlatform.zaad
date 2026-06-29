import type { SelectHTMLAttributes, ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

/** قائمة منسدلة موحّدة تعتمد نمط ‎.input-field من design-system. */
export default function Select({ label, error, id, className = "", children, ...rest }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="label-field" htmlFor={id}>
          {label}
        </label>
      )}
      <select id={id} className={`input-field ${className}`.trim()} {...rest}>
        {children}
      </select>
      {error && (
        <p style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{error}</p>
      )}
    </div>
  );
}
