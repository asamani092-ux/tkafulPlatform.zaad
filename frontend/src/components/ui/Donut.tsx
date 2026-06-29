import type { ReactNode } from "react";

interface DonutProps {
  percent: number;
  children?: ReactNode;
}

/** رسم دائري (Donut) موحّد بلون primary من design-system. */
export default function Donut({ percent, children }: DonutProps) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div
      style={{
        width: "160px",
        height: "160px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        background: `conic-gradient(var(--tmkeen-primary) 0 ${p}%, var(--tmkeen-surface-muted) ${p}% 100%)`,
      }}
    >
      <div
        style={{
          width: "112px",
          height: "112px",
          borderRadius: "50%",
          background: "var(--tmkeen-surface)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
