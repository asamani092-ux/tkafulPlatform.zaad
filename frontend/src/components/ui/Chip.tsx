import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

/** وسم/شريحة اختيار — عقد Badge/Tag + FilterBar chips. */
export default function Chip({ active, className = "", children, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      className={`zad-chip ${active ? "zad-chip--active" : ""} ${className}`.trim()}
      data-active={active ? "true" : "false"}
      aria-pressed={active}
      {...rest}
    >
      {children}
    </button>
  );
}
