import type { ReactNode } from "react";

interface HeroBandProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

/**
 * رأس صفحة وفق نموذج نظام الزاد:
 * خلفية فاتحة (surface) + عنوان بنص العلامة (text-brand) — لا خلفية مارون ممتلئة.
 */
export default function HeroBand({ title, subtitle, children }: HeroBandProps) {
  return (
    <header
      className="border-b border-surface-border bg-surface px-4 py-10 text-center"
      style={{ borderBlockEndWidth: "var(--border-hairline)" }}
    >
      <div className="mx-auto max-w-page">
        <h1 className="text-3xl font-extrabold text-primary md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 text-base text-brand-gray md:text-lg">{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}
