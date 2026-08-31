import { useCallback, useEffect, useState } from "react";
import { FileText, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Tabs from "../../ui/Tabs";
import Modal from "../../ui/Modal";
import CompactListCard from "../../ui/CompactListCard";
import { LoadingState } from "../../feedback/PageStates";

type TabKey = "volunteers" | "applications" | "joins";

interface VStats { total_volunteers: number; active_volunteers: number; total_hours: number; completed_tasks: number }
interface Volunteer {
  id: number; name: string; email: string; phone?: string; location: string; city?: string; status: string;
  volunteer_hours: number; completed_tasks: number; current_tasks: number; is_active: boolean;
  join_date?: string;
}
interface Application { id: number; volunteer_name: string; volunteer_email: string; project_title: string; status: string; message: string }
interface JoinReq { id: number; name: string; email: string; phone: string; location: string; qualification: string; skills: string[] }
interface VTask { id: number; title: string; status: string; project_name: string; progress: number; due_date: string | null }

const APP_TABS = [
  { key: "قيد المراجعة", label: "قيد المراجعة" },
  { key: "مقبول", label: "مقبولة" },
  { key: "مرفوض", label: "مرفوضة" },
];

const emptyForm = { name: "", email: "", phone: "", national_id: "", city: "", password: "" };

/** نطاق المتطوّعين — بطاقات/جدول مختصر + نماذج إضافة في نافذة عائمة. */
export default function VolunteersAdmin({ defaultTab = "volunteers" }: { defaultTab?: TabKey }) {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [tab, setTab] = useState<TabKey>(defaultTab);

  const [stats, setStats] = useState<VStats | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loadingVols, setLoadingVols] = useState(true);
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [reportFor, setReportFor] = useState<Volunteer | null>(null);
  const [reportTasks, setReportTasks] = useState<VTask[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadVolunteers = useCallback(() => {
    setLoadingVols(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (activeFilter) params.set("is_active", activeFilter);
    const qs = params.toString() ? `?${params}` : "";
    authFetch(`/api/volunteer-stats/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    authFetch(`/api/volunteers/${qs}`).then((r) => (r.ok ? r.json() : null))
      .then((d) => setVolunteers(d?.results || []))
      .catch(() => {})
      .finally(() => setLoadingVols(false));
  }, [q, activeFilter]);

  const [apps, setApps] = useState<Application[]>([]);
  const [appStatus, setAppStatus] = useState("قيد المراجعة");
  const loadApps = useCallback((status: string) => {
    authFetch(`/api/admin/applications/?status=${encodeURIComponent(status)}`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => setApps(d?.results || [])).catch(() => {});
  }, []);

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
    // الـ API يعيد { tasks: [...] } — ليس مصفوفة مباشرة
    const list = Array.isArray(d) ? d : (d?.tasks || d?.results || []);
    setReportTasks(list as VTask[]);
  };

  const startAdd = () => { setEditId(null); setForm(emptyForm); setFormOpen(true); };
  const startEdit = (v: Volunteer) => {
    setEditId(v.id);
    setForm({
      email: v.email, name: v.name || "", city: v.city || v.location || "",
      phone: v.phone || "", national_id: "", password: "",
    });
    setFormOpen(true);
  };

  const saveVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const res = await authFetch(`/api/accounts/users/${editId}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: form.name, city: form.city, phone: form.phone, national_id: form.national_id }),
      });
      if (res.ok) { success({ title: "تم تحديث المتطوّع" }); setFormOpen(false); loadVolunteers(); }
      else { const d = await res.json().catch(() => ({})); error({ title: d.detail || d.name?.[0] || "تعذّر التحديث" }); }
      return;
    }
    const res = await authFetch(`/api/accounts/users/`, {
      method: "POST",
      body: JSON.stringify({
        name: form.name, email: form.email, phone: form.phone, national_id: form.national_id,
        city: form.city, role: "user", password: form.password || "Hello12345!",
      }),
    });
    if (res.ok) { success({ title: "تم إضافة المتطوّع" }); setFormOpen(false); loadVolunteers(); }
    else {
      const d = await res.json().catch(() => ({}));
      error({ title: d.email?.[0] || d.password?.[0] || d.phone?.[0] || d.detail || "تعذّر الإضافة" });
    }
  };

  const actApp = async (id: number, action: "accept" | "reject") => {
    const res = await authFetch(`/api/admin/applications/${id}/${action}/`, { method: "POST", body: JSON.stringify({}) });
    if (res.ok) { success({ title: action === "accept" ? "تم القبول" : "تم الرفض" }); loadApps(appStatus); }
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

          <Card className="mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] flex-1">
                <Input label="بحث (اسم / بريد / مدينة)" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="w-40">
                <Select label="حالة الحساب" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                  <option value="">الكل</option>
                  <option value="true">مفعّل</option>
                  <option value="false">معلّق</option>
                </Select>
              </div>
              <Button type="button" variant="secondary" onClick={() => loadVolunteers()}>تطبيق</Button>
              <Button type="button" onClick={startAdd}>إضافة متطوّع</Button>
            </div>
          </Card>

          <div className="space-y-3">
            {loadingVols ? <LoadingState title="جاري تحميل المتطوعين…" /> : volunteers.length === 0 ? (
              <Card><p className="text-center text-sm text-brand-gray">لا يوجد متطوعون.</p></Card>
            ) : volunteers.map((v) => (
              <CompactListCard
                key={v.id}
                name={v.name || v.email || `#${v.id}`}
                active={v.is_active !== false}
                createdAt={v.join_date}
                onDetails={() => startEdit(v)}
                detailsLabel="فتح البطاقة"
              />
            ))}
          </div>
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
                <h3 className="mb-2 font-bold text-primary">{r.name || r.email}</h3>
                <p className="mb-3 text-xs text-brand-gray">{r.email} · {r.location}</p>
                <div className="flex gap-2">
                  <Button onClick={() => actJoin(r.id, "accept")}>قبول</Button>
                  <Button variant="secondary" onClick={() => actJoin(r.id, "reject")}>رفض</Button>
                </div>
              </Card>
            ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? "بطاقة المتطوّع" : "إضافة متطوّع"} wide>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={saveVolunteer}>
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {!editId && (
            <Input label="البريد" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
          )}
          <Input label="رقم الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
          <Input label="الهوية" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} dir="ltr" />
          <Input label="المدينة" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          {!editId && (
            <Input label="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit">{editId ? "حفظ" : "إنشاء"}</Button>
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>إلغاء</Button>
            {editId && (() => {
              const v = volunteers.find((x) => x.id === editId);
              if (!v) return null;
              return (
                <>
                  <button type="button" title="تقرير" className="rounded p-2 text-primary hover:bg-surface-muted" onClick={() => openReport(v)}><FileText size={16} /></button>
                  <button type="button" title={v.is_active === false ? "تفعيل" : "تعليق"} className="rounded p-2 text-amber-700 hover:bg-surface-muted" onClick={() => void toggleActive(v)}>
                    {v.is_active === false ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                  </button>
                  <button type="button" title="حذف" className="rounded p-2 text-red-600 hover:bg-surface-muted" onClick={() => void removeVolunteer(v)}><Trash2 size={16} /></button>
                </>
              );
            })()}
          </div>
        </form>
      </Modal>

      <Modal open={!!reportFor} onClose={() => { setReportFor(null); setReportTasks(null); }} title={`تقرير إنجاز: ${reportFor?.name || reportFor?.email || ""}`} wide>
        {reportFor && (
          <div>
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
