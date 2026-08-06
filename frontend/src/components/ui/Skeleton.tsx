interface SkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

/** هيكل تحميل — عقد Spinner/Skeleton. */
export default function Skeleton({ lines = 1, height = "var(--space-4)", className = "" }: SkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-label="جارٍ التحميل" className={`space-y-2 ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="zad-skeleton" style={{ height, width: "100%" }} />
      ))}
      <span className="sr-only">جارٍ التحميل</span>
    </div>
  );
}
