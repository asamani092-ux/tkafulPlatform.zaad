import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  container?: "default" | "narrow" | "none";
}

/** غلاف الصفحة الموحّد (‎.page-shell + .page-container/.page-container-narrow). */
export default function PageShell({ children, container = "default" }: PageShellProps) {
  const cls = container === "narrow" ? "page-container-narrow" : container === "none" ? "" : "page-container";
  return <div className="page-shell">{cls ? <div className={cls}>{children}</div> : children}</div>;
}
