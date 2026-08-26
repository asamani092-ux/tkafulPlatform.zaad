import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Badge from "../../ui/Badge";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
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
}

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "primary"> = {
  active: "success",
  draft: "warning",
  completed: "primary",
  archived: "danger",
};

const ALL_TOOLS = Object.keys(TOOL_LABELS);
// تلميح المفاتيح المقبولة لكل أداة (يطابق backend/projects/tool_config.py و PROJECT_TOOLS.md)
const TOOL_CONFIG_KEYS: Record<string, string> = {
  map: "default_center [lat,lng]، default_zoom (1-20)",
  sponsorships: "show_target_amount (bool)، target_amount (رقم ≥ 0)",
  volunteering: "show_opportunities (bool)",
  services: 'request_form ("service"|"water_supply")، show_request_button (bool)',
  reports: "public (bool)",
};
const MEMBER_ROLES = [
  { value: "project_admin", label: "مدير مشروع" },
  { value: "project_editor", label: "محرر" },
  { value: "project_viewer", label: "مشاهد" },
];

/** إدارة مشاريع المنصّة — نطاق حسب الدور (super-admin يرى الكل). */
export default function PlatformProjects() {
  const toast = useToast();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", brand_color: "#8b1538", type: "" });
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [memberForm, setMemberForm] = useState({ projectId: 0, userId: "", role: "project_viewer" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [projectsRes, meRes, typesRes] = await Promise.all([
        authFetch("/api/platform/projects/"),
        authFetch("/api/platform/my-memberships/"),
        authFetch("/api/platform/project-types/"),
      ]);
      if (!projectsRes.ok || !meRes.ok) throw new Error("fetch");
      setProjects(await projectsRes.json());
      setIsSuperAdmin((await meRes.json()).is_super_admin);
      if (typesRes.ok) {
        const td = await typesRes.json();
        setTypes(Array.isArray(td) ? td : td.results || []);
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
      name: form.name, slug: form.slug, description: form.description, brand_color: form.brand_color,
    };
    if (form.type) payload.type = Number(form.type);
    const res = await authFetch("/api/platform/projects/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success({ title: "تم إنشاء المشروع" });
      setForm({ name: "", slug: "", description: "", brand_color: "#8b1538", type: "" });
      void load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error({ title: data.detail || data.slug?.[0] || "تعذّر إنشاء المشروع" });
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

  const [cfgEdit, setCfgEdit] = useState<{ projectId: number; toolKey: string; text: string } | null>(null);

  const saveToolConfig = async (project: AdminProject, toolKey: string, text: string) => {
    let parsed: Record<string, unknown>;
    try {
      parsed = text.trim() ? JSON.parse(text) : {};
    } catch {
      toast.error({ title: "JSON غير صالح" });
      return;
    }
    await setTool(project, toolKey, true, parsed);
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

  const runTransition = async (project: AdminProject, action: string) => {
    if (!isSuperAdmin) return;
    const label = LIFECYCLE_ACTION_LABELS[action] || action;
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

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch(`/api/platform/projects/${memberForm.projectId}/add_member/`, {
      method: "POST",
      body: JSON.stringify({ user_id: Number(memberForm.userId), role: memberForm.role }),
    });
    if (res.ok) { toast.success({ title: "تمت إضافة العضو" }); setMemberForm({ ...memberForm, userId: "" }); void load(); }
    else {
      const data = await res.json().catch(() => ({}));
      toast.error({ title: data.detail || "تعذّرت إضافة العضو" });
    }
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

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-extrabold text-primary">المشاريع</h1>

      {isSuperAdmin && (
        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-primary">إنشاء مشروع جديد (المشرف العام)</h2>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={createProject}>
            <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="المعرّف (slug)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" required />
            <Input label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input label="لون الهوية" type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
            <Select label="النوع (اختياري)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">— بدون نوع —</option>
              {types.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <div className="sm:col-span-2"><Button type="submit">إنشاء</Button></div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {projects.map((p) => (
          <Card key={p.id}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span style={{ width: 14, height: 14, borderRadius: 4, background: p.brand_color, display: "inline-block" }} />
                <h3 className="text-lg font-bold text-primary">{p.name}</h3>
                <Badge variant={STATUS_BADGE[p.status] || "warning"}>{STATUS_LABELS[p.status] || p.status}</Badge>
                {p.type_name && <Badge>{p.type_name}</Badge>}
                {p.is_featured && <Badge variant="success">مميز في الرئيسية</Badge>}
                {p.my_role && <Badge>{p.my_role === "super_admin" ? "مشرف عام" : p.my_role}</Badge>}
              </div>
              <Link to={`/projects/${p.slug}`} className="text-sm font-bold text-primary hover:underline">صفحة المشروع ←</Link>
            </div>

            {isSuperAdmin && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-surface-border p-3">
                <span className="text-xs font-bold text-brand-gray">الحالة: {STATUS_LABELS[p.status] || p.status} —</span>
                {p.next_actions.length === 0 && <span className="text-xs text-brand-gray">لا إجراءات متاحة</span>}
                {p.next_actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-full border border-surface-border bg-surface px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                    onClick={() => void runTransition(p, action)}
                  >
                    {LIFECYCLE_ACTION_LABELS[action] || action}
                  </button>
                ))}
              </div>
            )}

            {isSuperAdmin && (
              <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-surface-border p-3">
                <div className="w-48">
                  <Select label="النوع" value={p.type ? String(p.type) : ""} onChange={(e) => void changeType(p, e.target.value)}>
                    <option value="">— بدون نوع —</option>
                    {types.filter((t) => t.is_active || t.id === p.type).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </div>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-bold${p.is_featured ? " bg-primary text-white" : " bg-surface border border-surface-border"}`}
                  onClick={() => void toggleFeatured(p)}
                >
                  {p.is_featured ? "مميز في الرئيسية ✓" : "تمييز للرئيسية"}
                </button>
                {p.is_featured && (
                  <div className="w-28">
                    <Input
                      label="ترتيب العرض"
                      type="number"
                      min={0}
                      dir="ltr"
                      defaultValue={String(p.featured_order ?? 0)}
                      key={`order-${p.id}-${p.featured_order}`}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isNaN(next) && next !== p.featured_order) {
                          void saveFeaturedOrder(p, Math.max(0, next));
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mb-3 rounded-lg border border-surface-border p-3">
              <span className="text-xs font-bold text-brand-gray">رابط التبرع (HTTPS):</span>
              {(isSuperAdmin || p.my_role === "project_admin") ? (
                <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(e) => {
                  e.preventDefault();
                  const donation_url = editDonation.projectId === p.id ? editDonation.donation_url : (p.donation_url || "");
                  const donation_label = editDonation.projectId === p.id ? editDonation.donation_label : (p.donation_label || "تبرع الآن");
                  void saveDonation(p, { donation_url, donation_label });
                }}
                  onFocus={() => {
                    if (editDonation.projectId !== p.id) {
                      setEditDonation({ projectId: p.id, donation_url: p.donation_url || "", donation_label: p.donation_label || "تبرع الآن" });
                    }
                  }}>
                  <div className="min-w-[200px] flex-1">
                    <Input label="رابط التبرع" dir="ltr" value={editDonation.projectId === p.id ? editDonation.donation_url : (p.donation_url || "")}
                      onChange={(e) => setEditDonation({ projectId: p.id, donation_url: e.target.value, donation_label: editDonation.projectId === p.id ? editDonation.donation_label : (p.donation_label || "تبرع الآن") })} />
                  </div>
                  <div className="w-36">
                    <Input label="نص الزر" value={editDonation.projectId === p.id ? editDonation.donation_label : (p.donation_label || "تبرع الآن")}
                      onChange={(e) => setEditDonation({ projectId: p.id, donation_url: editDonation.projectId === p.id ? editDonation.donation_url : (p.donation_url || ""), donation_label: e.target.value })} />
                  </div>
                  <Button type="submit" variant="secondary">حفظ</Button>
                </form>
              ) : (
                <p className="mt-1 text-sm text-brand-gray">{p.donation_url || "— غير مُعرَّف —"}</p>
              )}
            </div>

            <div className="mb-3">
              <span className="text-xs font-bold text-brand-gray">الأدوات: </span>
              {ALL_TOOLS.map((toolKey) => {
                const tool = p.tools.find((t) => t.tool_key === toolKey);
                const enabled = !!tool?.is_enabled;
                return (
                  <span key={toolKey} className="m-1 inline-flex items-center gap-1">
                    <button type="button" disabled={!isSuperAdmin}
                      className={`rounded-full px-3 py-1 text-xs font-bold${enabled ? " bg-primary text-white" : " bg-surface border border-surface-border"}`}
                      onClick={() => isSuperAdmin && setTool(p, toolKey, !enabled)}>
                      {TOOL_LABELS[toolKey]}
                    </button>
                    {isSuperAdmin && enabled && TOOL_CONFIG_KEYS[toolKey] && (
                      <button type="button" className="text-[11px] text-primary underline"
                        onClick={() => setCfgEdit({ projectId: p.id, toolKey, text: JSON.stringify(tool?.config ?? {}, null, 2) })}>
                        إعدادات
                      </button>
                    )}
                  </span>
                );
              })}
              {cfgEdit && cfgEdit.projectId === p.id && (
                <div className="mt-2 rounded-lg border border-surface-border p-3">
                  <p className="mb-1 text-xs font-bold text-primary">
                    إعدادات «{TOOL_LABELS[cfgEdit.toolKey]}» — المفاتيح: {TOOL_CONFIG_KEYS[cfgEdit.toolKey]}
                  </p>
                  <textarea dir="ltr" className="input-field min-h-[6rem] font-mono text-xs"
                    value={cfgEdit.text}
                    onChange={(e) => setCfgEdit({ ...cfgEdit, text: e.target.value })} />
                  <div className="mt-2 flex gap-2">
                    <Button type="button" onClick={() => void saveToolConfig(p, cfgEdit.toolKey, cfgEdit.text)}>حفظ الإعدادات</Button>
                    <Button type="button" variant="secondary" onClick={() => setCfgEdit(null)}>إلغاء</Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-bold text-brand-gray">الأعضاء:</span>
              <ul className="mt-1 space-y-1 text-sm">
                {p.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <span>{m.username} ({m.email || "بلا بريد"}) — {MEMBER_ROLES.find((r) => r.value === m.role)?.label || m.role}</span>
                    {(isSuperAdmin || p.my_role === "project_admin" || p.my_role === "super_admin") && (
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeMember(p, m.user)}>إزالة</button>
                    )}
                  </li>
                ))}
                {p.members.length === 0 && <li className="text-brand-gray">لا أعضاء بعد.</li>}
              </ul>
              {(isSuperAdmin || p.my_role === "project_admin" || p.my_role === "super_admin") && (
                <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(e) => { setMemberForm((f) => ({ ...f, projectId: p.id })); addMember(e); }}
                  onFocus={() => setMemberForm((f) => ({ ...f, projectId: p.id }))}>
                  <div className="w-32"><Input label="معرّف المستخدم" value={memberForm.projectId === p.id ? memberForm.userId : ""}
                    onChange={(e) => setMemberForm({ ...memberForm, projectId: p.id, userId: e.target.value })} dir="ltr" /></div>
                  <div className="w-36">
                    <Select label="الدور" value={memberForm.projectId === p.id ? memberForm.role : "project_viewer"}
                      onChange={(e) => setMemberForm({ ...memberForm, projectId: p.id, role: e.target.value })}>
                      {MEMBER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </Select>
                  </div>
                  <Button type="submit" variant="secondary">إضافة عضو</Button>
                </form>
              )}
            </div>
          </Card>
        ))}
        {projects.length === 0 && <p className="text-brand-gray">لا مشاريع ضمن نطاقك.</p>}
      </div>
    </AdminShell>
  );
}
