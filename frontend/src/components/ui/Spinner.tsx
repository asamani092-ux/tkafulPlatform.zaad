interface SpinnerProps {
  label?: string;
}

/** مؤشّر تحميل موحّد (عقد Spinner §1.12) — role=status + aria-live. */
export default function Spinner({ label = "جارٍ التحميل…" }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <span className="state-spinner" aria-hidden="true" style={{ width: "1.25rem", height: "1.25rem" }} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
