import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../config";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import DataTable from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";

interface VStats { total_volunteers: number; active_volunteers: number; total_hours: number; completed_tasks: number }
interface Volunteer { id: number; name: string; email: string; location: string; status: string; volunteer_hours: number; completed_tasks: number; current_tasks: number }

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
  const authHeaders = { Authorization: `Bearer ${access}` };

  useEffect(() => {
    if (!access) return;
    fetch(`${API_BASE_URL}/api/volunteer-stats/`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    fetch(`${API_BASE_URL}/api/volunteers/`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setVolunteers(d.results || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const kpis = stats ? [
    { label: "إجمالي المتطوعين", value: stats.total_volunteers },
    { label: "نشطون", value: stats.active_volunteers },
    { label: "إجمالي الساعات", value: stats.total_hours },
    { label: "مهام منجزة", value: stats.completed_tasks },
  ] : [];

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">إدارة المتطوعين</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}><div className="text-center"><div className="text-2xl font-extrabold text-primary">{k.value}</div><div className="mt-1 text-xs text-brand-gray">{k.label}</div></div></Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-4 text-xl font-bold text-primary">المتطوعون</h2>
        <DataTable columns={cols} rows={volunteers} />
      </Card>
    </AdminShell>
  );
}
