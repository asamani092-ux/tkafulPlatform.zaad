import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/** حقل إدخال موحّد. لكلمة المرور: أيقونة عين داخل الحقل يمين. */
export default function Input({
  label,
  error,
  hint,
  id,
  className = "",
  type,
  ...rest
}: InputProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  const [visible, setVisible] = useState(false);
  const showToggle = type === "password";
  const inputType = showToggle ? (visible ? "text" : "password") : type;

  return (
    <div>
      {label && (
        <label className="label-field" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <div className={showToggle ? "relative" : undefined}>
        <input
          id={fieldId}
          type={inputType}
          className={`input-field ${showToggle ? "!pr-10" : ""} ${className}`.trim()}
          aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {showToggle && (
          <button
            type="button"
            tabIndex={-1}
            className="absolute top-1/2 z-10 -translate-y-1/2 rounded p-1 text-brand-gray hover:text-primary"
            style={{ right: "0.5rem" }}
            aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
