type Dash = {
  progress_pct: number;
  activities_total: number;
  activities_done: number;
  activities_delayed: number;
  days_to_close: number | null;
  budget_total: string;
  budget_association: string;
  budget_donation: string;
  current_stage: string;
  status: string;
};

const STAGE_AR: Record<string, string> = {
  define: "التعريف",
  prepare: "التجهيز",
  plan: "التخطيط",
  execute: "التنفيذ",
  close: "الإغلاق",
};

export default function DossierDashboard({ data }: { data: Dash | null }) {
  if (!data) return <p className="text-sm text-brand-gray">لا بيانات لوحة بعد.</p>;
  const cards = [
    { label: "نسبة الإنجاز", value: `${data.progress_pct}%` },
    { label: "مهام منجزة", value: `${data.activities_done}/${data.activities_total}` },
    { label: "مهام متأخرة", value: String(data.activities_delayed) },
    {
      label: "أيام للإغلاق",
      value: data.days_to_close === null ? "—" : String(data.days_to_close),
    },
    { label: "الميزانية", value: data.budget_total },
    { label: "المرحلة الحالية", value: STAGE_AR[data.current_stage] || data.current_stage },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" dir="rtl">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-surface-border bg-surface p-4 text-center">
          <div className="text-2xl font-extrabold text-primary">{c.value}</div>
          <div className="mt-1 text-xs text-brand-gray">{c.label}</div>
        </div>
      ))}
      <div className="col-span-2 rounded-xl border border-surface-border bg-surface p-4 sm:col-span-3">
        <div className="text-sm font-bold text-primary">الجدول المالي المبدئي</div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-brand-gray">
          <span>مخصص الجمعية: {data.budget_association}</span>
          <span>التبرعات: {data.budget_donation}</span>
          <span>الإجمالي: {data.budget_total}</span>
        </div>
      </div>
    </div>
  );
}
