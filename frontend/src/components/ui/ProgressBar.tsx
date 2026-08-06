/** شريط تقدّم موحّد — عقد Progress. يحافظ على prop `value`. */
export default function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span
      className="zad-progress"
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`التقدّم ${v}%`}
    >
      <span className="zad-progress__bar" style={{ width: `${v}%` }} />
    </span>
  );
}
