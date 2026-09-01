import { useId, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** تسمية عربية مرئية — إلزامية */
  label: string;
}

/** مربع اختيار موحّد بتسمية قابلة للنقر (عقد Checkbox). هدف اللمس ≥ 44px عبر الحاوية. */
export default function Checkbox({ label, id, className = "", ...rest }: CheckboxProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <label
      htmlFor={fieldId}
      className={`flex cursor-pointer items-center gap-2 text-sm ${className}`.trim()}
      style={{ minHeight: "44px" }}
    >
      <input
        id={fieldId}
        type="checkbox"
        className="h-5 w-5 accent-[var(--tmkeen-primary)]"
        {...rest}
      />
      <span className="font-medium text-primary">{label}</span>
    </label>
  );
}
