import { useId, type InputHTMLAttributes } from "react";

interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** تسمية عربية مرئية — إلزامية */
  label: string;
  hint?: string;
}

/** حقل رفع ملف موحّد بتسمية مرتبطة (عقد Dropzone/FileRow §7). */
export default function FileInput({ label, hint, id, className = "", ...rest }: FileInputProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div>
      <label className="label-field" htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        type="file"
        className={`input-field ${className}`.trim()}
        aria-describedby={hintId}
        {...rest}
      />
      {hint && <p id={hintId} style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{hint}</p>}
    </div>
  );
}
