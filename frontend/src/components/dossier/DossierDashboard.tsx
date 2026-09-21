type BudgetLine = {
  id: number;
  title: string;
  proposed: string;
  allocated: string;
  spent: string;
  remaining: string;
};

type Dash = {
  progress_pct: number;
  activities_total: number;
  activities_done: number;
  activities_delayed: number;
  days_to_close: number | null;
  budget_total: string;
  budget_association: string;
  budget_donation: string;
  budget_lines?: BudgetLine[];
  current_stage: string;
  status: string;
  approval_hint?: string;
};

const STAGE_AR: Record<string, string> = {
  define: "التعريف",
  prepare: "التجهيز",
  plan: "التخطيط",
  execute: "التنفيذ",
  close: "الإغلاق",
};

type Props = {
  data: Dash | null;
  canAllocate?: boolean;
  canSpend?: boolean;
  onAllocate?: (lineId: number, amount: string) => Promise<void>;
  onSpend?: (lineId: number, amount: string) => Promise<void>;
};

export default function DossierDashboard({ data, canAllocate, canSpend, onAllocate, onSpend }: Props) {
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
    <div className="space-y-4" dir="rtl">
      {data.approval_hint && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{data.approval_hint}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-surface-border bg-surface p-4 text-center">
            <div className="text-2xl font-extrabold text-primary">{c.value}</div>
            <div className="mt-1 text-xs text-brand-gray">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-surface-border bg-surface p-4">
        <div className="text-sm font-bold text-primary">الجدول المالي</div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-brand-gray">
          <span>مخصص الجمعية: {data.budget_association}</span>
          <span>التبرعات: {data.budget_donation}</span>
          <span>الإجمالي: {data.budget_total}</span>
        </div>
        {(data.budget_lines || []).length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-right text-primary">
                  <th className="py-1">البند</th>
                  <th>مقترح</th>
                  <th>مخصص</th>
                  <th>مصروف</th>
                  <th>متبقي</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data.budget_lines || []).map((bl) => (
                  <tr key={bl.id} className="border-b border-surface-border">
                    <td className="py-2">{bl.title}</td>
                    <td>{bl.proposed}</td>
                    <td>{bl.allocated}</td>
                    <td>{bl.spent}</td>
                    <td>{bl.remaining}</td>
                    <td className="space-x-1 space-x-reverse">
                      {canAllocate && onAllocate && (
                        <button
                          type="button"
                          className="text-xs font-bold text-primary"
                          onClick={() => {
                            const v = window.prompt("المخصص للبند", bl.allocated || bl.proposed);
                            if (v != null) void onAllocate(bl.id, v);
                          }}
                        >
                          مخصص
                        </button>
                      )}
                      {canSpend && onSpend && (
                        <button
                          type="button"
                          className="text-xs font-bold text-primary"
                          onClick={() => {
                            const v = window.prompt("مبلغ الصرف");
                            if (v != null) void onSpend(bl.id, v);
                          }}
                        >
                          خصم
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
