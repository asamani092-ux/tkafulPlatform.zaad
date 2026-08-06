import type { ReactNode } from "react";

interface StateProps {
  title?: string;
  message?: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function LoadingState({ title = "جاري التحميل…", message }: StateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <div className="state-spinner" aria-hidden="true" />
      <p className="state-title">{title}</p>
      {message && <p className="state-message">{message}</p>}
    </div>
  );
}

/** حالة فراغ — عقد EmptyState (title/body/action). */
export function EmptyState({ title = "لا توجد بيانات", message, children, action }: StateProps) {
  return (
    <div className="state-panel" role="status">
      <p className="state-title">{title}</p>
      {message && <p className="state-message">{message}</p>}
      {action || children}
    </div>
  );
}

export function ErrorState({ title = "حدث خطأ", message, children }: StateProps) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <p className="state-title">{title}</p>
      {message && <p className="state-message">{message}</p>}
      {children}
    </div>
  );
}
