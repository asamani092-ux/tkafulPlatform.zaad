import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** حقل إدخال موحّد (‎.input-field/.label-field). الحقول LTR (بريد/جوال/رابط) تُعالَج تلقائياً في components.css. */
export default function Input({ label, error, id, className = "", ...rest }: InputProps) {
  return (
    <div>
      {label && (
        <label className="label-field" htmlFor={id}>
          {label}
        </label>
      )}
      <input id={id} className={`input-field ${className}`.trim()} {...rest} />
      {error && (
        <p style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{error}</p>
      )}
    </div>
  );
}
