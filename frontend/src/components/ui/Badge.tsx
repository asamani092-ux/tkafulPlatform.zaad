import type { ReactNode } from "react";

type BadgeVariant = "primary" | "warning" | "danger" | "success";

const CLASS: Record<BadgeVariant, string> = {
  primary: "badge-primary",
  warning: "badge-warning",
  danger: "badge-danger",
  success: "badge-success",
};

/** شارة حالة موحّدة (‎.badge-*). */
export default function Badge({ variant = "primary", children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={CLASS[variant]}>{children}</span>;
}
