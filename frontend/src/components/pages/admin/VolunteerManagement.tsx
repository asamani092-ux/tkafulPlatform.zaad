import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import DataTable from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";
import KpiCard from "../../ui/KpiCard";
import Breadcrumb from "../../ui/Breadcrumb";
import Pagination from "../../ui/Pagination";
import AvatarGroup from "../../ui/AvatarGroup";
import Skeleton from "../../ui/Skeleton";

interface VStats { total_volunteers: number; active_volunteers: number; total_hours: number; completed_tasks: number }
interface Volunteer { id: number; name: string; email: string; location: string; status: string; volunteer_hours: number; completed_tasks: number; current_tasks: number }

const PAGE_SIZE = 10;

const cols: Column<Volunteer>[] = [
  { key: "name", header: "المتطوّع" },
  { key: "location", header: "المدينة" },
  { key: "status", header: "الحالة", render: (r) => <Badge variant={r.status === "نشط" ? "success" : r.status === "مشغول" ? "warning" : "primary"}>{r.status}</Badge> },
  { key: "volunteer_hours", header: "الساعات" },
  { key: "completed_tasks", header: "منجزة" },
  { key: "current_tasks", header: "حالية" },
];

export default function VolunteerManagement() {
  const { access } = useAuth();
  const [stats, setStats] = useState<VStats | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!access) return;
    setLoading(true);
    Promise.all([
      authFetch(`/api/volunteer-stats/`).then((r) => (r.ok ? r.json() : null)),
      authFetch(`/api/volunteers/`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, v]) => {
        if (s) setStats(s);
        if (v) setVolunteers(v.results || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [access]);

  const totalPages = Math.max(1, Math.ceil(volunteers.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => volunteers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [volunteers, page],
  );

  const kpis = stats ? [
    { label: "إجمالي المتطوعين", value: stats.total_volunteers },
    { label: "نشطون", value: stats.active_volunteers },
    { label: "إجمالي الساعات", value: stats.total_hours },
    { label: "مهام منجزة", value: stats.completed_tasks },
  ] : [];

  return (
    <AdminShell>
      <Breadcrumb items={[{ label: "الإدارة", href: "/Admin" }, { label: "إدارة المتطوعين" }]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">إدارة المتطوعين</h1>
        {volunteers.length > 0 && (
          <AvatarGroup people={volunteers.slice(0, 8).map((v) => ({ name: v.name }))} max={5} />
        )}
      </div>
      {loading ? (
        <Skeleton lines={4} height="var(--space-12)" />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} label={k.label} value={k.value} />
            ))}
          </div>
          <Card>
            <h2 className="mb-4 text-xl font-bold text-primary">المتطوعون</h2>
            <DataTable columns={cols} rows={pageRows} emptyText="لا يوجد متطوعون بعد" />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </Card>
        </>
      )}
    </AdminShell>
  );
}
