import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

/**
 * اللوحة التنفيذية الموحّدة — دمج المشروع الثاني (GAS) في المنصة.
 * التصميم معتمد بالكامل على design-system (ألوان/خط Tajawal) — لا تصميم قديم.
 * يستهلك GET /api/dashboard/executive/ (يطابق getDashboardData في GAS).
 */

type Section = {
  id: number;
  title: string;
  unit: string;
  total: number;
  actual: string;
  expected: string;
  closed: number;
  in_progress: number;
  near: number;
  late: number;
  review: number;
  not_started: number;
};

type Employee = {
  id: number;
  name: string;
  role: string;
  completed_tasks: number;
  progress: number;
};

type StaffTask = {
  id: number;
  title: string;
  employee_name: string | null;
  initiative: string;
  completed_date: string | null;
  progress: number;
};

type Kpi = {
  id: number;
  title: string;
  value: string;
  subtitle: string;
};

type DashboardData = {
  sections: Section[];
  employees: Employee[];
  tasks: StaffTask[];
  kpis: Kpi[];
};

// ألوان الحالات من design-system (tokens.json) — المصدر الوحيد
const STATUS = [
  { key: "closed", label: "مغلق", color: "#15803D" },
  { key: "in_progress", label: "قيد التنفيذ", color: "#8B1538" },
  { key: "near", label: "قريب", color: "#F2B824" },
  { key: "late", label: "متأخر", color: "#991B1B" },
  { key: "review", label: "تحت المراجعة", color: "#854D0E" },
  { key: "not_started", label: "لم يحن", color: "#E8E8E8" },
] as const;

const FONT = "Tajawal, Tahoma, Arial, sans-serif";

function Donut({ percent, total, unit }: { percent: number; total: number; unit: string }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="mx-auto flex h-40 w-40 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(#8B1538 0 ${p}%, #F5F5F5 ${p}% 100%)` }}
    >
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
        <div className="text-3xl font-extrabold text-primary">{total}</div>
        <div className="text-xs text-brand-gray">{unit}</div>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/dashboard/executive/`)
      .then((res) => {
        if (!res.ok) throw new Error("تعذّر تحميل بيانات اللوحة");
        return res.json();
      })
      .then((d: DashboardData) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-surface-muted p-10 text-center text-brand-gray" style={{ fontFamily: FONT }}>
        جارٍ تحميل اللوحة التنفيذية…
      </div>
    );

  if (error || !data)
    return (
      <div className="min-h-screen bg-surface-muted p-10 text-center" style={{ fontFamily: FONT }}>
        <div className="mx-auto max-w-md rounded-xl border-2 border-[#FEE2E2] bg-[#FEE2E2] p-4 text-[#991B1B]">
          {error || "لا توجد بيانات"}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-surface-muted" style={{ fontFamily: FONT }} dir="rtl">
      {/* رأس اللوحة */}
      <header className="bg-gradient-to-l from-primary to-secondary px-6 py-8 text-white">
        <div className="mx-auto max-w-page">
          <h1 className="text-3xl font-extrabold">إدارة التكافل المجتمعي</h1>
          <p className="mt-2 text-white/90">اللوحة التنفيذية الموحّدة — منصة التكافل والمبادرات</p>
        </div>
      </header>

      <main className="mx-auto max-w-page space-y-6 px-4 py-8">
        {/* بطاقات الأقسام */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.sections.map((s) => (
            <div key={s.id} className="rounded-xl border-2 border-surface-border bg-surface p-6 shadow-sm">
              <Donut percent={Number(s.actual)} total={s.total} unit={s.unit} />
              <div className="mt-3 text-center text-xs text-brand-gray">
                واقع {s.actual}% · مفترض {s.expected}%
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {STATUS.map((st) => (
                  <div key={st.key} className="text-center text-[11px] text-brand-gray">
                    <div
                      className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full font-bold"
                      style={{
                        background: st.color,
                        color: st.key === "not_started" || st.key === "near" ? "#706F6F" : "#fff",
                      }}
                    >
                      {s[st.key as keyof Section] as number}
                    </div>
                    {st.label}
                  </div>
                ))}
              </div>
              <hr className="my-4 border-surface-border" />
              <h3 className="text-center text-lg font-bold text-primary">{s.title}</h3>
            </div>
          ))}
        </div>

        {/* الموظفون + المهام */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border-2 border-surface-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-primary">الموظفون</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-primary">
                  <th className="border-b border-surface-border p-3 text-start">الموظف</th>
                  <th className="border-b border-surface-border p-3 text-start">المسمى</th>
                  <th className="border-b border-surface-border p-3 text-start">المهام</th>
                  <th className="border-b border-surface-border p-3 text-start">التقدم</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((e) => (
                  <tr key={e.id}>
                    <td className="border-b border-surface-border p-3">{e.name}</td>
                    <td className="border-b border-surface-border p-3 text-brand-gray">{e.role}</td>
                    <td className="border-b border-surface-border p-3">{e.completed_tasks}</td>
                    <td className="border-b border-surface-border p-3">
                      <span className="me-2">{e.progress}%</span>
                      <span className="inline-block h-2 w-24 overflow-hidden rounded-full bg-surface-muted align-middle">
                        <span className="block h-full bg-[#15803D]" style={{ width: `${e.progress}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border-2 border-surface-border bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-primary">المهام المنجزة حديثًا</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-primary">
                  <th className="border-b border-surface-border p-3 text-start">المهمة</th>
                  <th className="border-b border-surface-border p-3 text-start">المسؤول</th>
                  <th className="border-b border-surface-border p-3 text-start">المبادرة</th>
                  <th className="border-b border-surface-border p-3 text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="border-b border-surface-border p-3">{t.title}</td>
                    <td className="border-b border-surface-border p-3 text-brand-gray">{t.employee_name || "—"}</td>
                    <td className="border-b border-surface-border p-3 text-brand-gray">{t.initiative}</td>
                    <td className="border-b border-surface-border p-3 text-brand-gray">{t.completed_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* مؤشرات الأداء */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {data.kpis.map((k) => (
            <div key={k.id} className="rounded-xl border-2 border-surface-border bg-surface p-5 text-center shadow-sm">
              <div className="text-2xl font-extrabold text-primary">{k.value}</div>
              <div className="mt-1 font-bold text-gray-800">{k.title}</div>
              <div className="text-xs text-brand-gray">{k.subtitle}</div>
            </div>
          ))}
        </div>

        <footer className="flex justify-between pt-4 text-sm text-brand-gray">
          <span>جمعية الزاد — إدارة التكافل المجتمعي</span>
          <span>جميع الحقوق محفوظة © 2026</span>
        </footer>
      </main>
    </div>
  );
}
