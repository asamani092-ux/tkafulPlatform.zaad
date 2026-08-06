import type { ReactNode } from "react";

interface HeroBandProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

/** شريط رأس موحّد على توكنات نظام الزاد. */
export default function HeroBand({ title, subtitle, children }: HeroBandProps) {
  return (
    <header
      className="px-4 py-12 text-center"
      style={{ background: "var(--action-primary-surface)", color: "var(--text-inverse)" }}
    >
      <div className="mx-auto max-w-page">
        <h1 className="text-3xl md:text-4xl" style={{ fontWeight: "var(--weight-black)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3" style={{ opacity: 0.9 }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}
