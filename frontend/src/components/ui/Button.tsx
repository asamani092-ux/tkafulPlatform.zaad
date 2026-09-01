import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "recommend" | "register" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** زر أيقونة فقط — يتطلب aria-label */
  iconOnly?: boolean;
  loading?: boolean;
  children: ReactNode;
}

const CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  recommend: "btn-recommend",
  register: "btn-register",
  ghost: "btn-ghost",
  danger: "btn-danger",
  accent: "btn-accent",
};

const SIZE: Record<Size, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

/** زر موحّد يعتمد فئات design-system (components.css) دون أنماط مكتوبة يدوياً. */
export default function Button({
  variant = "primary",
  size = "md",
  iconOnly = false,
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const cls = [CLASS[variant], SIZE[size], iconOnly ? "btn-icon-only" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {children}
    </button>
  );
}
