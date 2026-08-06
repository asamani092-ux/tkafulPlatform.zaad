import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Donut from "../ui/Donut";
import DataTable from "../ui/DataTable";
import type { Column } from "../ui/DataTable";
import ProgressBar from "../ui/ProgressBar";
import KpiCard from "../ui/KpiCard";
import Breadcrumb from "../ui/Breadcrumb";
import { LoadingState, ErrorState, EmptyState } from "../feedback/PageStates";

type Section = {
  id: number; title: string; unit: string; total: number; actual: string; expected: string;
  closed: number; in_progress: number; near: number; late: number; review: number; not_started: number;
};
type Employee = { id: number; name: string; role: string; completed_tasks: number; progress: number };
type StaffTask = { id: number; title: string; employee_name: string | null; initiative: string; completed_date: string | null };
type Kpi = { id: number; title: string; value: string; subtitle: string };
type DashboardData = { sections: Section[]; employees: Employee[]; tasks: StaffTask[]; kpis: Kpi[] };

const STATUS = [
  { key: "closed", label: "مغلق", color: "var(--tmkeen-success)" },
  { key: "in_progress", label: "قيد التنفيذ", color: "var(--tmkeen-primary)" },
  { key: "near", label: "قريب", color: "var(--tmkeen-secondary)" },
  { key: "late", label: "متأخر", color: "var(--tmkeen-danger)" },
  { key: "review", label: "تحت المراجعة", color: "var(--tmkeen-warning)" },
  { key: "not_started", label: "لم يحن", color: "var(--tmkeen-surface-border)" },
] as const;

const empCols: Column<Employee>[] = [
  { key: "name", header: "الموظف" },
  { key: "role", header: "المسمى" },
  { key: "completed_tasks", header: "المهام" },
  { key: "progress", header: "التقدم", render: (r) => <span><span className="me-2">{r.progress}%</span><ProgressBar value={r.progress} /></span> },
];
const taskCols: Column<StaffTask>[] = [
  { key: "title", header: "المهمة" },
  { key: "employee_name", header: "المسؤول", render: (r) => r.employee_name || "—" },
  { key: "initiative", header: "المبادرة" },
  { key: "completed_date", header: "التاريخ", render: (r) => r.completed_date || "—" },
];

export default function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/dashboard/executive/`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: DashboardData) => setData(d))
      .catch(() => setError("تعذّر تحميل بيانات اللوحة"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-shell p-10"><LoadingState title="جارٍ تحميل اللوحة…" /></div>;
  if (error) return <div className="page-shell p-10"><ErrorState title="خطأ" message={error} /></div>;
  if (!data) return <div className="page-shell p-10"><EmptyState title="لا توجد بيانات" /></div>;

  return (
    <div className="page-shell zad-root" data-theme="light">
      <header className="border-b border-surface-border bg-surface px-6 py-8">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-primary">إدارة التكافل المجتمعي</h1>
            <p className="mt-2 text-brand-gray">اللوحة التنفيذية الموحّدة — منصة التكافل والمبادرات</p>
          </div>
          <Link to="/Admin/executive/manage" className="btn-secondary inline-flex items-center" style={{ minHeight: "var(--touch-min)" }}>
            تغذية اللوحة
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-page space-y-6 px-4 py-8">
        <Breadcrumb items={[{ label: "الإدارة", href: "/Admin" }, { label: "اللوحة التنفيذية" }]} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.sections.map((s) => (
            <Card key={s.id}>
              <Donut percent={Number(s.actual)}>
                <div className="text-3xl font-extrabold text-primary">{s.total}</div>
                <div className="text-xs text-brand-gray">{s.unit}</div>
              </Donut>
              <div className="mt-3 text-center text-xs text-brand-gray">واقع {s.actual}% · مفترض {s.expected}%</div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {STATUS.map((st) => (
                  <div key={st.key} className="text-center text-[11px] text-brand-gray">
                    <div
                      className="mx-auto mb-1 flex items-center justify-center rounded-full font-bold"
                      style={{
                        width: "var(--touch-min)",
                        height: "var(--touch-min)",
                        background: st.color,
                        color: st.key === "not_started" || st.key === "near" ? "var(--text-secondary)" : "var(--text-inverse)",
                      }}
                    >
                      {s[st.key as keyof Section] as number}
                    </div>
                    {st.label}
                  </div>
                ))}
              </div>
              <hr className="my-4" style={{ borderColor: "var(--border-subtle)" }} />
              <h3 className="text-center text-lg font-bold text-primary">{s.title}</h3>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-xl font-bold text-primary">الموظفون</h2>
            <DataTable columns={empCols} rows={data.employees} />
          </Card>
          <Card>
            <h2 className="mb-4 text-xl font-bold text-primary">المهام المنجزة حديثًا</h2>
            <DataTable columns={taskCols} rows={data.tasks} />
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {data.kpis.map((k) => (
            <KpiCard key={k.id} label={`${k.title}${k.subtitle ? ` — ${k.subtitle}` : ""}`} value={k.value} />
          ))}
        </div>
      </main>
    </div>
  );
}
