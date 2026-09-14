import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/** حقل إدخال موحّد (‎.input-field/.label-field). الحقول LTR (بريد/جوال/رابط) تُعالَج تلقائياً في components.css. */
export default function Input({ label, error, hint, id, className = "", ...rest }: InputProps) {
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
      <input
        id={fieldId}
        className={`input-field ${className}`.trim()}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {hint && !error && <p id={hintId} style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{hint}</p>}
      {error && (
        <p id={errId} style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{error}</p>
      )}
    </div>
  );
}
