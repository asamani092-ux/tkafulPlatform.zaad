import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Badge from "../../ui/Badge";
import MultiSelect from "../../ui/MultiSelect";
import Alert from "../../ui/Alert";
import Modal from "../../ui/Modal";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { labelAr, ROLE_AR } from "../../../i18n/labels";
import ToolConfigFields from "../../admin/ToolConfigFields";
import { Link } from "react-router-dom";
import { TOOL_LABELS, STATUS_LABELS, LIFECYCLE_ACTION_LABELS, type ProjectType } from "../projects/types";

interface AdminTool { id: number; tool_key: string; config: Record<string, unknown>; is_enabled: boolean }
interface AdminMember { id: number; user: number; username: string; email: string; role: string }
interface AdminProject {
  id: number; name: string; slug: string; description: string; brand_color: string;
  donation_url: string; donation_label: string;
  status: string; is_active: boolean; is_featured: boolean; featured_order: number;
  tools: AdminTool[]; members: AdminMember[];
  my_role: string | null;
  next_actions: string[];
  type: number | null; type_name: string | null; type_slug: string | null;
  created_at?: string;
  allowed_supplier_ids?: number[];
  allowed_representative_ids?: number[];
}

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "primary"> = {
  active: "success",
  draft: "warning",
  completed: "primary",
  archived: "danger",
};

const ALL_TOOLS = Object.keys(TOOL_LABELS);
const MEMBER_ROLES = [
  { value: "project_admin", label: "مدير مشروع" },
  { value: "project_editor", label: "محرر" },
  { value: "project_viewer", label: "مشاهد" },
];
const MEMBER_ROLE_AR: Record<string, string> = Object.fromEntries(MEMBER_ROLES.map((r) => [r.value, r.label]));
const UNKNOWN_AR = "غير معروف";


/** إدارة مشاريع المنصّة — نطاق حسب الدور (super-admin يرى الكل). */
export default function PlatformProjects() {
  const toast = useToast();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", brand_color: "#8b1538", type: "" });
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  // مُنتقي الأعضاء: كل المستخدمين (بلا قيد دور) قابل للبحث — قرار العميل.
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [memberPick, setMemberPick] = useState<string[]>([]);
  const [memberRole, setMemberRole] = useState("project_viewer");
  const [supplierOpts, setSupplierOpts] = useState<Array<{ value: string; label: string }>>([]);
  const [repOpts, setRepOpts] = useState<Array<{ value: string; label: string }>>([]);
  const [allowSuppliers, setAllowSuppliers] = useState<string[]>([]);
  const [allowReps, setAllowReps] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [projectsRes, meRes, typesRes, supRes, repRes] = await Promise.all([
        authFetch("/api/platform/projects/"),
        authFetch("/api/platform/my-memberships/"),
        authFetch("/api/platform/project-types/"),
        authFetch("/api/saqya/suppliers/"),
        authFetch("/api/saqya/representatives/"),
      ]);
      if (!projectsRes.ok || !meRes.ok) throw new Error("fetch");
      setProjects(await projectsRes.json());
      setIsSuperAdmin((await meRes.json()).is_super_admin);
      if (typesRes.ok) {
        const td = await typesRes.json();
        setTypes(Array.isArray(td) ? td : td.results || []);
      }
      if (supRes.ok) {
        const sd = await supRes.json();
        const arr = Array.isArray(sd) ? sd : sd.results || [];
        setSupplierOpts(arr.map((x: { user: number; business_name?: string; name?: string }) => ({
          value: String(x.user), label: x.business_name || x.name || String(x.user),
        })));
      }
      if (repRes.ok) {
        const rd = await repRes.json();
        const arr = Array.isArray(rd) ? rd : rd.results || [];
        setRepOpts(arr.map((x: { user: number; name?: string }) => ({
          value: String(x.user), label: x.name || String(x.user),
        })));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name, description: form.description, brand_color: form.brand_color,
    };
    if (form.type) payload.type = Number(form.type);
    const res = await authFetch("/api/platform/projects/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success({ title: "تم إنشاء المشروع" });
      setForm({ name: "", description: "", brand_color: "#8b1538", type: "" });
      setCreateOpen(false);
      void load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error({ title: data.detail || data.name?.[0] || "تعذّر إنشاء المشروع" });
    }
  };

  const changeType = async (project: AdminProject, typeId: string) => {
    if (!isSuperAdmin) return;
    const res = await authFetch(`/api/platform/projects/${project.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ type: typeId ? Number(typeId) : null }),
    });
    if (res.ok) { toast.success({ title: "تم تحديث النوع" }); void load(); }
    else toast.error({ title: "تعذّر تحديث النوع" });
  };

  const setTool = async (
    project: AdminProject,
    toolKey: string,
    enable: boolean,
    config?: Record<string, unknown>,
  ) => {
    const existing = project.tools.find((t) => t.tool_key === toolKey);
    const body: Record<string, unknown> = { tool_key: toolKey, is_enabled: enable };
    body.config = config ?? existing?.config ?? {};
    const res = await authFetch(`/api/platform/projects/${project.id}/set_tool/`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) { toast.success({ title: "تم تحديث الأداة" }); setCfgEdit(null); void load(); return true; }
    const data = await res.json().catch(() => ({}));
    const msg = data.config?.[0] || data.config || data.detail || "تعذّر تحديث الأداة (صلاحية المشرف العام)";
    toast.error({ title: typeof msg === "string" ? msg : JSON.stringify(msg) });
    return false;
  };

  const [cfgEdit, setCfgEdit] = useState<{ projectId: number; toolKey: string; config: Record<string, unknown> } | null>(null);

  const saveToolConfig = async (project: AdminProject, toolKey: string, config: Record<string, unknown>) => {
    await setTool(project, toolKey, true, config);
  };

  const [editDonation, setEditDonation] = useState({ projectId: 0, donation_url: "", donation_label: "تبرع الآن" });

  const saveDonation = async (
    project: AdminProject,
    payload?: { donation_url: string; donation_label: string },
  ) => {
    const body = payload || {
      donation_url: editDonation.donation_url,
      donation_label: editDonation.donation_label || "تبرع الآن",
    };
    const res = await authFetch(`/api/platform/projects/${project.id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        donation_url: body.donation_url,
        donation_label: body.donation_label || "تبرع الآن",
      }),
    });
    if (res.ok) {
      toast.success({ title: "تم حفظ رابط التبرع" });
      void load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error({ title: data.donation_url?.[0] || "تعذّر الحفظ" });
    }
  };

  const saveAllowlists = async (project: AdminProject) => {
    const res = await authFetch(`/api/platform/projects/${project.id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        allowed_supplier_ids: allowSuppliers.map(Number),
        allowed_representative_ids: allowReps.map(Number),
      }),
    });
    if (res.ok) {
      toast.success({ title: "تم حفظ نطاق الإسناد" });
      void load();
    } else {
      toast.error({ title: "تعذّر حفظ نطاق الإسناد" });
    }
  };

  const runTransition = async (project: AdminProject, action: string) => {
    if (!isSuperAdmin) return;
    const label = labelAr(LIFECYCLE_ACTION_LABELS, action, UNKNOWN_AR);
    if (!window.confirm(`تأكيد ${label} المشروع «${project.name}»؟`)) return;
    const res = await authFetch(`/api/platform/projects/${project.id}/${action}/`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (res.ok) {
      toast.success({ title: `تم ${label} المشروع` });
      void load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error({ title: data.detail || `تعذّر ${label} المشروع` });
    }
  };

  const toggleFeatured = async (project: AdminProject) => {
    if (!isSuperAdmin) return;
    const res = await authFetch(`/api/platform/projects/${project.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_featured: !project.is_featured }),
    });
    if (res.ok) {
      toast.success({ title: project.is_featured ? "أُزيل من الرئيسية" : "أُضيف للرئيسية" });
      void load();
    } else {
      toast.error({ title: "تعذّر تحديث التمييز" });
    }
  };

  const saveFeaturedOrder = async (project: AdminProject, order: number) => {
    if (!isSuperAdmin) return;
    const res = await authFetch(`/api/platform/projects/${project.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ featured_order: order }),
    });
    if (res.ok) {
      toast.success({ title: "تم حفظ ترتيب العرض" });
      void load();
    } else {
      toast.error({ title: "تعذّر حفظ الترتيب" });
    }
  };

  // تحميل كل المستخدمين مرّة عند فتح أي بطاقة مشروع (بحث محلي O(n)).
  const loadAllUsers = useCallback(async () => {
    if (allUsers.length > 0) return;
    const res = await authFetch("/api/accounts/users/?page_size=100");
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const rows = data?.results || data || [];
    setAllUsers(rows.map((u: { id: number; name?: string; email: string }) => ({ id: u.id, name: u.name || u.email, email: u.email })));
  }, [allUsers.length]);

  useEffect(() => { if (detailId) void loadAllUsers(); }, [detailId, loadAllUsers]);

  // إضافة كل المستخدمين المختارين بالدور المحدّد (أي مستخدم، قابل للتعديل لاحقاً).
  const addSelectedMembers = async (projectId: number) => {
    if (memberPick.length === 0) return;
    let ok = 0;
    for (const uid of memberPick) {
      const res = await authFetch(`/api/platform/projects/${projectId}/add_member/`, {
        method: "POST",
        body: JSON.stringify({ user_id: Number(uid), role: memberRole }),
      });
      if (res.ok) ok += 1;
    }
    if (ok > 0) { toast.success({ title: `أُضيف ${ok} عضواً` }); setMemberPick([]); void load(); }
    else toast.error({ title: "تعذّرت إضافة الأعضاء" });
  };

  const removeMember = async (project: AdminProject, userId: number) => {
    const res = await authFetch(`/api/platform/projects/${project.id}/remove_member/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) { toast.success({ title: "تمت إزالة العضو" }); void load(); }
    else toast.error({ title: "تعذّرت إزالة العضو" });
  };

  if (loading) return <AdminShell><LoadingState title="جاري تحميل المشاريع…" /></AdminShell>;
  if (error) return <AdminShell><ErrorState title="تعذّر التحميل" message="تحقّق من الاتصال." /></AdminShell>;

  const detail = projects.find((p) => p.id === detailId) || null;

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-primary">المشاريع</h1>
        {isSuperAdmin && (
          <Button type="button" onClick={() => setCreateOpen(true)}>إضافة مشروع</Button>
        )}
      </div>

      {projects.some((p) => p.tools.some((t) => t.tool_key === "sponsorships" && t.is_enabled)) && (
        <Card className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-primary">فهرس مشاريع الكفالات</h2>
          <ul className="space-y-2 text-sm">
            {projects.filter((p) => p.tools.some((t) => t.tool_key === "sponsorships" && t.is_enabled)).map((p) => (
              <li key={`sp-${p.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border py-2 last:border-0">
                <span className="font-semibold text-primary">{p.name}</span>
                <Link to={`/Admin/projects/${p.slug}/sponsorships`} className="font-bold text-primary hover:underline">إدارة الكفالات</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        {projects.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: p.brand_color, display: "inline-block" }} />
                <h3 className="truncate text-base font-bold text-primary">{p.name}</h3>
                <Badge variant={p.is_active && p.status === "active" ? "success" : "danger"}>
                  {p.is_active && p.status === "active" ? "نشط" : "غير نشط"}
                </Badge>
                <span className="text-xs text-brand-gray">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString("ar") : "—"}
                </span>
              </div>
              <Button type="button" variant="secondary" onClick={() => {
                setDetailId(p.id);
                setAllowSuppliers((p.allowed_supplier_ids || []).map(String));
                setAllowReps((p.allowed_representative_ids || []).map(String));
              }}>التفاصيل</Button>
            </div>
          </Card>
        ))}
        {projects.length === 0 && <p className="text-brand-gray">لا مشاريع ضمن نطاقك.</p>}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء مشروع جديد" wide>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={createProject}>
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="لون الهوية" type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
          <Select label="النوع (اختياري)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="">— بدون نوع —</option>
            {types.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">إنشاء</Button>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>إلغاء</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail?.name || "تفاصيل المشروع"} wide>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE[detail.status] || "warning"}>{labelAr(STATUS_LABELS, detail.status, UNKNOWN_AR)}</Badge>
              {detail.type_name && <Badge>{detail.type_name}</Badge>}
              {detail.is_featured && <Badge variant="success">مميز</Badge>}
              <a href={`/projects/${detail.slug}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary hover:underline">صفحة المشروع ↗</a>
              {detail.tools.some((t) => t.tool_key === "sponsorships" && t.is_enabled) && (
                <Link to={`/Admin/projects/${detail.slug}/sponsorships`} className="text-sm font-bold text-primary hover:underline">إدارة الكفالات</Link>
              )}
            </div>

            {isSuperAdmin && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border p-3">
                <span className="text-xs font-bold text-brand-gray">دورة الحياة —</span>
                {detail.next_actions.length === 0 && <span className="text-xs text-brand-gray">لا إجراءات</span>}
                {detail.next_actions.map((action) => (
                  <button key={action} type="button"
                    className="rounded-full border border-surface-border bg-surface px-3 py-1 text-xs font-bold text-primary"
                    onClick={() => void runTransition(detail, action)}>
                    {labelAr(LIFECYCLE_ACTION_LABELS, action, UNKNOWN_AR)}
                  </button>
                ))}
              </div>
            )}

            {isSuperAdmin && (
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-surface-border p-3">
                <div className="w-48">
                  <Select label="النوع" value={detail.type ? String(detail.type) : ""} onChange={(e) => void changeType(detail, e.target.value)}>
                    <option value="">— بدون نوع —</option>
                    {types.filter((t) => t.is_active || t.id === detail.type).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </div>
                <button type="button"
                  className={`rounded-full px-3 py-1 text-xs font-bold${detail.is_featured ? " bg-primary text-white" : " border border-surface-border bg-surface"}`}
                  onClick={() => void toggleFeatured(detail)}>
                  {detail.is_featured ? "مميز ✓" : "تمييز للرئيسية"}
                </button>
              </div>
            )}

            <div className="rounded-lg border border-surface-border p-3">
              <span className="text-xs font-bold text-brand-gray">رابط التبرع:</span>
              {(isSuperAdmin || detail.my_role === "project_admin") ? (
                <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(e) => {
                  e.preventDefault();
                  const donation_url = editDonation.projectId === detail.id ? editDonation.donation_url : (detail.donation_url || "");
                  const donation_label = editDonation.projectId === detail.id ? editDonation.donation_label : (detail.donation_label || "تبرع الآن");
                  void saveDonation(detail, { donation_url, donation_label });
                }}
                  onFocus={() => {
                    if (editDonation.projectId !== detail.id) {
                      setEditDonation({ projectId: detail.id, donation_url: detail.donation_url || "", donation_label: detail.donation_label || "تبرع الآن" });
                    }
                  }}>
                  <div className="min-w-[200px] flex-1">
                    <Input label="رابط التبرع" dir="ltr" value={editDonation.projectId === detail.id ? editDonation.donation_url : (detail.donation_url || "")}
                      onChange={(e) => setEditDonation({ projectId: detail.id, donation_url: e.target.value, donation_label: editDonation.projectId === detail.id ? editDonation.donation_label : (detail.donation_label || "تبرع الآن") })} />
                  </div>
                  <div className="w-36">
                    <Input label="نص الزر" value={editDonation.projectId === detail.id ? editDonation.donation_label : (detail.donation_label || "تبرع الآن")}
                      onChange={(e) => setEditDonation({ projectId: detail.id, donation_url: editDonation.projectId === detail.id ? editDonation.donation_url : (detail.donation_url || ""), donation_label: e.target.value })} />
                  </div>
                  <Button type="submit" variant="secondary">حفظ</Button>
                </form>
              ) : (
                <p className="mt-1 text-sm text-brand-gray">{detail.donation_url || "—"}</p>
              )}
            </div>

            <div>
              <span className="text-xs font-bold text-brand-gray">الأدوات: </span>
              <div className="my-2">
                <Alert tone="info">
                  <span className="text-xs">
                    اضغط اسم الأداة لتفعيلها/تعطيلها للمشروع. بعد التفعيل يظهر زر «إعدادات»
                    اضبط خيارات الأداة من الحقول أدناه — مثل مركز الخريطة أو مبلغ الكفالة المستهدف.
                  </span>
                </Alert>
              </div>
              {ALL_TOOLS.map((toolKey) => {
                const tool = detail.tools.find((t) => t.tool_key === toolKey);
                const enabled = !!tool?.is_enabled;
                return (
                  <span key={toolKey} className="m-1 inline-flex items-center gap-1">
                    <button type="button" disabled={!isSuperAdmin}
                      className={`rounded-full px-3 py-1 text-xs font-bold${enabled ? " bg-primary text-white" : " border border-surface-border bg-surface"}`}
                      onClick={() => isSuperAdmin && setTool(detail, toolKey, !enabled)}>
                      {TOOL_LABELS[toolKey]}
                    </button>
                    {isSuperAdmin && enabled && (
                      <button type="button" className="text-[11px] text-primary underline"
                        onClick={() => setCfgEdit({ projectId: detail.id, toolKey, config: { ...(tool?.config ?? {}) } })}>
                        إعدادات
                      </button>
                    )}
                  </span>
                );
              })}
              {cfgEdit && cfgEdit.projectId === detail.id && (
                <div className="mt-2 rounded-lg border border-surface-border p-3">
                  <p className="mb-2 text-sm font-bold text-primary">إعدادات {labelAr(TOOL_LABELS, cfgEdit.toolKey, UNKNOWN_AR)}</p>
                  <ToolConfigFields
                    toolKey={cfgEdit.toolKey}
                    value={cfgEdit.config}
                    onChange={(config) => setCfgEdit({ ...cfgEdit, config })}
                  />
                  <div className="mt-2 flex gap-2">
                    <Button type="button" onClick={() => void saveToolConfig(detail, cfgEdit.toolKey, cfgEdit.config)}>حفظ</Button>
                    <Button type="button" variant="secondary" onClick={() => setCfgEdit(null)}>إلغاء</Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-bold text-brand-gray">الأعضاء:</span>
              <ul className="mt-1 space-y-1 text-sm">
                {detail.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <span>{m.username} — {labelAr(MEMBER_ROLE_AR, m.role, UNKNOWN_AR)}</span>
                    {(isSuperAdmin || detail.my_role === "project_admin" || detail.my_role === "super_admin") && (
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeMember(detail, m.user)}>إزالة</button>
                    )}
                  </li>
                ))}
                {detail.members.length === 0 && <li className="text-brand-gray">لا أعضاء.</li>}
              </ul>
              {(isSuperAdmin || detail.my_role === "project_admin" || detail.my_role === "super_admin") && (
                <div className="mt-3 rounded-lg border border-surface-border p-3">
                  <p className="mb-2 text-xs text-brand-gray">أضف أي مستخدم من المنصّة كعضو (بحث بالاسم أو البريد) — الدور قابل للتعديل لاحقاً.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <MultiSelect
                        label="الأعضاء"
                        placeholder="ابحث بالاسم أو البريد…"
                        options={allUsers
                          .filter((u) => !detail.members.some((m) => m.user === u.id))
                          .map((u) => ({ value: String(u.id), label: u.name, hint: u.email }))}
                        value={memberPick}
                        onChange={setMemberPick}
                      />
                    </div>
                    <Select label="الدور" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                      {MEMBER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </Select>
                  </div>
                  <div className="mt-2">
                    <Button type="button" variant="secondary" disabled={memberPick.length === 0} onClick={() => void addSelectedMembers(detail.id)}>
                      إضافة {memberPick.length > 0 ? `(${memberPick.length})` : ""} عضو
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
