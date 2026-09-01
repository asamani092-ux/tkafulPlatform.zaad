import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

type Tone = "success" | "warning" | "danger" | "info";

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
}

const ICON: Record<Tone, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

const TONE_VAR: Record<Tone, { bg: string; text: string; border: string }> = {
  success: { bg: "var(--success-surface)", text: "var(--success-text)", border: "var(--success-solid)" },
  warning: { bg: "var(--warning-surface)", text: "var(--warning-text)", border: "var(--warning-solid)" },
  danger: { bg: "var(--danger-surface)", text: "var(--danger-text)", border: "var(--danger-solid)" },
  info: { bg: "var(--info-surface)", text: "var(--info-text)", border: "var(--info-solid)" },
};

/** تنبيه موحّد (عقد Alert §1.9) — لون + أيقونة + نص معاً؛ role حسب الخطورة. */
export default function Alert({ tone = "info", title, children }: AlertProps) {
  const Icon = ICON[tone];
  const c = TONE_VAR[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="flex items-start gap-3 rounded-lg p-3 text-sm"
      style={{ background: c.bg, color: c.text, borderInlineStart: `4px solid ${c.border}` }}
    >
      <Icon size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="m-0 font-bold">{title}</p>}
        {children && <div className={title ? "mt-1" : ""}>{children}</div>}
      </div>
    </div>
  );
}
