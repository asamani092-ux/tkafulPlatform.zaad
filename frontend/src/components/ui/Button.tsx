import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "recommend" | "register";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  recommend: "btn-recommend",
  register: "btn-register",
};

/** زر موحّد يعتمد فئات design-system (components.css) دون أنماط مكتوبة يدوياً. */
export default function Button({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  return (
    <button className={`${CLASS[variant]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
