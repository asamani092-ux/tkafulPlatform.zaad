import { useId, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** تسمية عربية مرئية — إلزامية (عقد TextField) */
  label: string;
  error?: string;
  hint?: string;
}

/** حقل نص متعدد الأسطر موحّد مع تسمية مرتبطة (‎.label-field/.input-field). */
export default function Textarea({ label, error, hint, id, className = "", rows = 4, ...rest }: TextareaProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  return (
    <div>
      <label className="label-field" htmlFor={fieldId}>{label}</label>
      <textarea
        id={fieldId}
        rows={rows}
        className={`input-field ${className}`.trim()}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {hint && !error && <p id={hintId} style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{hint}</p>}
      {error && <p id={errId} style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{error}</p>}
    </div>
  );
}
