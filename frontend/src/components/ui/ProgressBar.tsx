/** شريط تقدّم موحّد يعتمد رموز design-system. */
export default function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span
      style={{
        display: "inline-block",
        width: "100%",
        height: "8px",
        background: "var(--tmkeen-surface-muted)",
        borderRadius: "9999px",
        overflow: "hidden",
        verticalAlign: "middle",
      }}
    >
      <span style={{ display: "block", height: "100%", width: `${v}%`, background: "var(--tmkeen-success)" }} />
    </span>
  );
}
