import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Donut from "../ui/Donut";
import DataTable from "../ui/DataTable";
import type { Column } from "../ui/DataTable";
import ProgressBar from "../ui/ProgressBar";

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

  if (loading) return <div className="page-shell p-10 text-center text-brand-gray">جارٍ تحميل اللوحة…</div>;
  if (error || !data)
    return (
      <div className="page-shell p-10 text-center">
        <div className="mx-auto max-w-md rounded-xl px-4 py-3" style={{ background: "var(--tmkeen-danger-bg)", color: "var(--tmkeen-danger)" }}>{error || "لا توجد بيانات"}</div>
      </div>
    );

  return (
    <div className="page-shell">
      <header className="px-6 py-8 text-white" style={{ background: "linear-gradient(to left, var(--tmkeen-primary), var(--tmkeen-secondary))" }}>
        <div className="mx-auto flex max-w-page items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">إدارة التكافل المجتمعي</h1>
            <p className="mt-2" style={{ opacity: 0.9 }}>اللوحة التنفيذية الموحّدة — منصة التكافل والمبادرات</p>
          </div>
          <Link to="/executive/manage" className="rounded-lg px-4 py-2 font-bold text-white" style={{ background: "rgba(255,255,255,.15)" }}>تغذية اللوحة</Link>
        </div>
      </header>

      <main className="mx-auto max-w-page space-y-6 px-4 py-8">
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
                    <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full font-bold"
                      style={{ background: st.color, color: st.key === "not_started" || st.key === "near" ? "var(--tmkeen-brand-gray)" : "#fff" }}>
                      {s[st.key as keyof Section] as number}
                    </div>
                    {st.label}
                  </div>
                ))}
              </div>
              <hr className="my-4" style={{ borderColor: "var(--tmkeen-surface-border)" }} />
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
            <Card key={k.id}>
              <div className="text-center">
                <div className="text-2xl font-extrabold text-primary">{k.value}</div>
                <div className="mt-1 font-bold">{k.title}</div>
                <div className="text-xs text-brand-gray">{k.subtitle}</div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
