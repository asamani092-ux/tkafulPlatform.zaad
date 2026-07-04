import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Button from "../../ui/Button";
import Tabs from "../../ui/Tabs";

interface Stats { total_donations: number; total_beneficiaries: number; active_projects: number; completed_projects: number; total_projects: number }
interface Project { id: number; title: string; status_display: string; category: string; progress: number }

const TABS = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "active", label: "نشطة" },
  { key: "completed", label: "مكتملة" },
];

export default function AdminMain() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState("pending");
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!access) return;
    authFetch(`/api/admin/stats/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
  }, [access]);

  const loadProjects = (status: string) => {
    authFetch(`/api/projects/?status=${status}`)
      .then((r) => (r.ok ? r.json() : [])).then((d) => setProjects(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) loadProjects(tab); }, [tab, access]);

  const act = async (id: number, action: "approve" | "reject") => {
    try {
      const res = await authFetch(`/api/admin/projects/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error();
      success({ title: action === "approve" ? "تم اعتماد المشروع" : "تم رفض المشروع" });
      loadProjects(tab);
    } catch { error({ title: "خطأ", description: "تعذّر تنفيذ العملية" }); }
  };

  const kpis = stats ? [
    { label: "إجمالي التبرعات", value: stats.total_donations.toLocaleString("en-US") },
    { label: "المستفيدون", value: stats.total_beneficiaries },
    { label: "مشاريع نشطة", value: stats.active_projects },
    { label: "مشاريع مكتملة", value: stats.completed_projects },
    { label: "إجمالي المشاريع", value: stats.total_projects },
  ] : [];

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">لوحة الإدارة</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}><div className="text-center"><div className="text-2xl font-extrabold text-primary">{k.value}</div><div className="mt-1 text-xs text-brand-gray">{k.label}</div></div></Card>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-bold text-primary">المشاريع</h2>
      <div className="mb-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد مشاريع.</p></Card> :
          projects.map((p) => (
            <Card key={p.id}>
              <div className="mb-2 flex items-center justify-between">
                {p.category && <Badge variant="primary">{p.category}</Badge>}
                <Badge variant="success">{p.status_display}</Badge>
              </div>
              <h3 className="mb-2 font-bold text-primary">{p.title}</h3>
              {tab === "pending" && (
                <div className="flex gap-2">
                  <Button onClick={() => act(p.id, "approve")}>اعتماد</Button>
                  <Button variant="secondary" onClick={() => act(p.id, "reject")}>رفض</Button>
                </div>
              )}
            </Card>
          ))}
      </div>
    </AdminShell>
  );
}
