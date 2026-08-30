import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Button from "../../ui/Button";
import Tabs from "../../ui/Tabs";
import { LoadingState } from "../../feedback/PageStates";

type TabKey = "volunteers" | "applications" | "joins";

interface VStats { total_volunteers: number; active_volunteers: number; total_hours: number; completed_tasks: number }
interface Volunteer {
  id: number; name: string; email: string; location: string; status: string;
  volunteer_hours: number; completed_tasks: number; current_tasks: number; is_active: boolean;
}
interface Application { id: number; volunteer_name: string; volunteer_email: string; project_title: string; status: string; message: string }
interface JoinReq { id: number; name: string; email: string; phone: string; location: string; qualification: string; skills: string[] }
interface VTask { id: number; title: string; status: string; project_name: string; progress: number; due_date: string | null }

const APP_TABS = [
  { key: "قيد المراجعة", label: "قيد المراجعة" },
  { key: "مقبول", label: "مقبولة" },
  { key: "مرفوض", label: "مرفوضة" },
];

/** نطاق المتطوّعين الموحّد — متطوّعون · طلبات المشاريع · طلبات الانضمام. */
export default function VolunteersAdmin({ defaultTab = "volunteers" }: { defaultTab?: TabKey }) {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [tab, setTab] = useState<TabKey>(defaultTab);

  // — قسم المتطوّعين —
  const [stats, setStats] = useState<VStats | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loadingVols, setLoadingVols] = useState(true);
  const [reportFor, setReportFor] = useState<Volunteer | null>(null);
  const [reportTasks, setReportTasks] = useState<VTask[] | null>(null);

  const loadVolunteers = useCallback(() => {
    setLoadingVols(true);
    authFetch(`/api/volunteer-stats/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    authFetch(`/api/volunteers/`).then((r) => (r.ok ? r.json() : null))
      .then((d) => setVolunteers(d?.results || []))
      .catch(() => {})
      .finally(() => setLoadingVols(false));
  }, []);

  // — قسم طلبات المشاريع —
  const [apps, setApps] = useState<Application[]>([]);
  const [appStatus, setAppStatus] = useState("قيد المراجعة");
  const loadApps = useCallback((status: string) => {
    authFetch(`/api/admin/applications/?status=${encodeURIComponent(status)}`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => setApps(d?.results || [])).catch(() => {});
  }, []);

  // — قسم طلبات الانضمام —
  const [joins, setJoins] = useState<JoinReq[]>([]);
  const loadJoins = useCallback(() => {
    authFetch(`/api/volunteer-requests/`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => setJoins(d?.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!access) return;
    if (tab === "volunteers") loadVolunteers();
    if (tab === "applications") loadApps(appStatus);
    if (tab === "joins") loadJoins();
  }, [access, tab, appStatus, loadVolunteers, loadApps, loadJoins]);

  // إجراءات الحساب عبر واجهة إدارة المستخدمين
  const toggleActive = async (v: Volunteer) => {
    const res = await authFetch(`/api/accounts/users/${v.id}/set_active/`, {
      method: "POST", body: JSON.stringify({ is_active: !v.is_active }),
    });
    if (res.ok) { success({ title: v.is_active ? "تم تعليق المتطوّع" : "تم تفعيل المتطوّع" }); loadVolunteers(); }
    else { const d = await res.json().catch(() => ({})); error({ title: d.detail || "تعذّر التنفيذ" }); }
  };

  const removeVolunteer = async (v: Volunteer) => {
    if (!window.confirm(`حذف المتطوّع «${v.name || v.email}»؟`)) return;
    const res = await authFetch(`/api/accounts/users/${v.id}/`, { method: "DELETE" });
    if (res.ok) { success({ title: "تم حذف المتطوّع" }); loadVolunteers(); }
    else { const d = await res.json().catch(() => ({})); error({ title: d.detail || "تعذّر الحذف" }); }
  };

  const openReport = async (v: Volunteer) => {
    setReportFor(v); setReportTasks(null);
    const res = await authFetch(`/api/reports/volunteer-tasks/?volunteer_id=${v.id}`);
    const d = res.ok ? await res.json().catch(() => null) : null;
    setReportTasks((d?.results || d || []) as VTask[]);
  };

  const actApp = async (id: number, action: "accept" | "reject") => {
    const res = await authFetch(`/api/admin/applications/${id}/${action}/`, { method: "POST", body: JSON.stringify({}) });
    if (res.ok) { success({ title: action === "accept" ? "تم القبول وإنشاء مهمة" : "تم الرفض" }); loadApps(appStatus); }
    else error({ title: "تعذّر تنفيذ العملية" });
  };

  const actJoin = async (id: number, action: "accept" | "reject") => {
    const res = await authFetch(`/api/volunteer-requests/${id}/${action}/`, { method: "POST" });
    if (res.ok) { success({ title: action === "accept" ? "تم قبول المتطوّع" : "تم رفض الطلب" }); loadJoins(); }
    else error({ title: "تعذّر تنفيذ العملية" });
  };

  const kpis = stats ? [
    { label: "إجمالي المتطوعين", value: stats.total_volunteers },
    { label: "نشطون", value: stats.active_volunteers },
    { label: "إجمالي الساعات", value: stats.total_hours },
    { label: "مهام منجزة", value: stats.completed_tasks },
  ] : [];

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">المتطوعون</h1>
      <div className="mb-4">
        <Tabs
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
          tabs={[
            { key: "volunteers", label: "المتطوّعون" },
            { key: "applications", label: "طلبات المشاريع" },
            { key: "joins", label: "طلبات الانضمام" },
          ]}
        />
      </div>

      {tab === "volunteers" && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}><div className="text-center"><div className="text-2xl font-extrabold text-primary">{k.value}</div><div className="mt-1 text-xs text-brand-gray">{k.label}</div></div></Card>
            ))}
          </div>
          <Card>
            {loadingVols ? <LoadingState title="جاري تحميل المتطوعين…" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-xs text-brand-gray">
                      <th className="py-2">المتطوّع</th>
                      <th>المدينة</th>
                      <th>الحالة</th>
                      <th>الساعات</th>
                      <th>منجزة</th>
                      <th>حالية</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers.length === 0 && (
                      <tr><td colSpan={7} className="py-4 text-center text-brand-gray">لا يوجد متطوعون.</td></tr>
                    )}
                    {volunteers.map((v) => (
                      <tr key={v.id} className="border-b border-surface-border last:border-0">
                        <td className="py-2 font-semibold">{v.name || v.email || `#${v.id}`}</td>
                        <td>{v.location || "—"}</td>
                        <td>
                          {v.is_active === false
                            ? <Badge variant="danger">معلّق</Badge>
                            : <Badge variant={v.status === "نشط" ? "success" : v.status === "مشغول" ? "warning" : "primary"}>{v.status}</Badge>}
                        </td>
                        <td>{v.volunteer_hours}</td>
                        <td>{v.completed_tasks}</td>
                        <td>{v.current_tasks}</td>
                        <td>
                          <div className="flex flex-wrap gap-2 text-xs font-bold">
                            <button type="button" className="text-primary hover:underline" onClick={() => openReport(v)}>تقرير</button>
                            <button type="button" className="text-amber-700 hover:underline" onClick={() => toggleActive(v)}>{v.is_active === false ? "تفعيل" : "تعليق"}</button>
                            <button type="button" className="text-red-600 hover:underline" onClick={() => removeVolunteer(v)}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {reportFor && (
            <Card className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">تقرير إنجاز: {reportFor.name || reportFor.email}</h2>
                <button type="button" className="text-xs font-bold text-brand-gray hover:underline" onClick={() => { setReportFor(null); setReportTasks(null); }}>إغلاق</button>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-3 text-center text-sm">
                <div><div className="text-xl font-extrabold text-primary">{reportFor.completed_tasks}</div><div className="text-xs text-brand-gray">مهام منجزة</div></div>
                <div><div className="text-xl font-extrabold text-primary">{reportFor.current_tasks}</div><div className="text-xs text-brand-gray">مهام حالية</div></div>
                <div><div className="text-xl font-extrabold text-primary">{reportFor.volunteer_hours}</div><div className="text-xs text-brand-gray">ساعات</div></div>
              </div>
              {reportTasks === null ? <LoadingState title="جاري تحميل المهام…" /> : reportTasks.length === 0 ? (
                <p className="text-sm text-brand-gray">لا مهام مسجّلة لهذا المتطوّع.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {reportTasks.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-2 border-b border-surface-border py-1 last:border-0">
                      <strong>{t.title}</strong>
                      <span className="text-xs text-brand-gray">{t.project_name}</span>
                      <Badge variant={t.status === "مكتملة" ? "success" : "warning"}>{t.status}</Badge>
                      <span className="text-xs text-brand-gray">{t.progress}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}

      {tab === "applications" && (
        <>
          <div className="mb-4"><Tabs tabs={APP_TABS} active={appStatus} onChange={setAppStatus} /></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {apps.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد طلبات.</p></Card> :
              apps.map((a) => (
                <Card key={a.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold text-primary">{a.volunteer_name}</h3>
                    <Badge variant={a.status === "مقبول" ? "success" : a.status === "مرفوض" ? "danger" : "warning"}>{a.status}</Badge>
                  </div>
                  <p className="mb-1 text-xs text-brand-gray">{a.volunteer_email}</p>
                  <p className="mb-3 text-sm text-brand-gray">المشروع: {a.project_title || "—"}</p>
                  {a.status === "قيد المراجعة" && (
                    <div className="flex gap-2">
                      <Button onClick={() => actApp(a.id, "accept")}>قبول</Button>
                      <Button variant="secondary" onClick={() => actApp(a.id, "reject")}>رفض</Button>
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </>
      )}

      {tab === "joins" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {joins.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد طلبات معلّقة.</p></Card> :
            joins.map((r) => (
              <Card key={r.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-primary">{r.name || r.email}</h3>
                  <Badge variant="warning">بانتظار الموافقة</Badge>
                </div>
                <p className="text-xs text-brand-gray">{r.email} · {r.phone}</p>
                <p className="mb-1 text-xs text-brand-gray">{r.location} · {r.qualification}</p>
                {r.skills?.length > 0 && <div className="mb-3 mt-2 flex flex-wrap gap-1">{r.skills.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}</div>}
                <div className="flex gap-2">
                  <Button onClick={() => actJoin(r.id, "accept")}>قبول</Button>
                  <Button variant="secondary" onClick={() => actJoin(r.id, "reject")}>رفض</Button>
                </div>
              </Card>
            ))}
        </div>
      )}
    </AdminShell>
  );
}
