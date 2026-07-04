import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "section";
  children: ReactNode;
}

/** بطاقة موحّدة (‎.card / .card-section). */
export default function Card({ variant = "default", className = "", children, ...rest }: CardProps) {
  const base = variant === "section" ? "card-section" : "card";
  return (
    <div className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
