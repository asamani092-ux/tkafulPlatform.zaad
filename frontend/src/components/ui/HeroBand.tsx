import type { ReactNode } from "react";

interface HeroBandProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

/** شريط رأس متدرّج (maroon→gold) موحّد على ألوان design-system. */
export default function HeroBand({ title, subtitle, children }: HeroBandProps) {
  return (
    <header
      className="px-4 py-12 text-center text-white"
      style={{ background: "linear-gradient(to left, var(--tmkeen-primary), var(--tmkeen-secondary))" }}
    >
      <div className="mx-auto max-w-page">
        <h1 className="text-3xl md:text-4xl" style={{ fontWeight: 800 }}>
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
