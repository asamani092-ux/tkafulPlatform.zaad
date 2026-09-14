interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; direction: "up" | "down" | "flat" };
}

/** بطاقة مؤشر بحدود رمادية من التوكن. */
export default function KpiCard({ label, value, delta }: KpiCardProps) {
  return (
    <div className="zad-kpi">
      <div className="zad-kpi__value">{value}</div>
      <div className="zad-kpi__label">{label}</div>
      {delta && (
        <div className="zad-kpi__delta" data-dir={delta.direction}>
          {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"} {delta.value}
        </div>
      )}
    </div>
  );
}
