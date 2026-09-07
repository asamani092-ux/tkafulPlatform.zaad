import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Badge from "../../ui/Badge";
import MultiSelect from "../../ui/MultiSelect";
import Switch from "../../ui/Switch";
import Modal from "../../ui/Modal";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { labelAr } from "../../../i18n/labels";
import { shouldFlipPageLoading, type AdminLoadMode } from "../../../admin/loadMode";
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

const WIZARD_STEPS = [
  { n: 1 as const, label: "الأساسيات" },
  { n: 2 as const, label: "الأدوات" },
  { n: 3 as const, label: "الأعضاء" },
];

/** إدارة مشاريع المنصّة — نطاق حسب الدور (super-admin يرى الكل). */
export default function PlatformProjects() {
  const toast = useToast();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", brand_color: "#8b1538", type: "" });
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardProjectId, setWizardProjectId] = useState<number | null>(null);
  const [basicsSaving, setBasicsSaving] = useState(false);
  const [toolDrafts, setToolDrafts] = useState<Record<string, Record<string, unknown>>>({});
  // مُنتقي الأعضاء: كل المستخدمين (بلا قيد دور) قابل للبحث — قرار العميل.
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [memberPick, setMemberPick] = useState<string[]>([]);
  const [memberRole, setMemberRole] = useState("project_viewer");
  const [supplierOpts, setSupplierOpts] = useState<Array<{ value: string; label: string }>>([]);
  const [repOpts, setRepOpts] = useState<Array<{ value: string; label: string }>>([]);
  const [allowSuppliers, setAllowSuppliers] = useState<string[]>([]);
  const [allowReps, setAllowReps] = useState<string[]>([]);

  const load = useCallback(async (mode: AdminLoadMode = "initial") => {
    const flip = shouldFlipPageLoading(mode);
    if (flip) {
      setLoading(true);
      setError(false);
    }
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
      if (flip) setError(true);
      else toast.error({ title: "تعذّر تحديث القائمة" });
    } finally {
      if (flip) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load("initial"); }, [load]);

  const wizardProject = wizardProjectId ? projects.find((p) => p.id === wizardProjectId) ?? null : null;
  const isCreateMode = wizardProjectId === null;

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setWizardProjectId(null);
    setForm({ name: "", description: "", brand_color: "#8b1538", type: "" });
    setToolDrafts({});
    setMemberPick([]);
  };

  const openCreateWizard = () => {
    setForm({ name: "", description: "", brand_color: "#8b1538", type: "" });
    setWizardProjectId(null);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const openEditWizard = (p: AdminProject) => {
    setForm({
      name: p.name,
      description: p.description,
      brand_color: p.brand_color,
      type: p.type ? String(p.type) : "",
    });
    setWizardProjectId(p.id);
    setWizardStep(1);
    setWizardOpen(true);
    setAllowSuppliers((p.allowed_supplier_ids || []).map(String));
    setAllowReps((p.allowed_representative_ids || []).map(String));
    setToolDrafts({});
    void loadAllUsers();
  };

  const canGoToStep = (step: 1 | 2 | 3) => step === 1 || wizardProjectId !== null;

  const saveBasics = async (): Promise<boolean> => {
    if (!form.name.trim()) {
      toast.error({ title: "الاسم مطلوب" });
      return false;
    }
    setBasicsSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      brand_color: form.brand_color,
    };
    if (wizardProjectId) {
      payload.type = form.type ? Number(form.type) : null;
    } else if (form.type) {
      payload.type = Number(form.type);
    }
    try {
      if (wizardProjectId) {
        const res = await authFetch(`/api/platform/projects/${wizardProjectId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error({ title: data.detail || data.name?.[0] || "تعذّر حفظ الأساسيات" });
          return false;
        }
        toast.success({ title: "تم حفظ الأساسيات" });
        void load("silent");
        return true;
      }
      const res = await authFetch("/api/platform/projects/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error({ title: data.detail || data.name?.[0] || "تعذّر إنشاء المشروع" });
        return false;
      }
      const data = await res.json();
      setWizardProjectId(data.id);
      toast.success({ title: "تم إنشاء المشروع" });
      void load("silent");
      return true;
    } finally {
      setBasicsSaving(false);
    }
  };

  const handleWizardNext = async () => {
    if (wizardStep === 1) {
      const ok = await saveBasics();
      if (!ok) return;
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      setWizardStep(3);
    }
  };

  const handleWizardPrev = () => {
    if (wizardStep > 1) setWizardStep((wizardStep - 1) as 1 | 2 | 3);
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
    if (res.ok) {
      toast.success({ title: "تم تحديث الأداة" });
      setToolDrafts((prev) => {
        const next = { ...prev };
        delete next[toolKey];
        return next;
      });
      void load("silent");
      return true;
    }
    const data = await res.json().catch(() => ({}));
    const msg = data.config?.[0] || data.config || data.detail || "تعذّر تحديث الأداة (صلاحية المشرف العام)";
    toast.error({ title: typeof msg === "string" ? msg : JSON.stringify(msg) });
    return false;
  };

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
      void load("silent");
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
      void load("silent");
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
      void load("silent");
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
      void load("silent");
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
      void load("silent");
    } else {
      toast.error({ title: "تعذّر حفظ الترتيب" });
    }
  };

  // تحميل كل المستخدمين مرّة عند فتح المعالج للتعديل (بحث محلي O(n)).
  const loadAllUsers = useCallback(async () => {
    if (allUsers.length > 0) return;
    const res = await authFetch("/api/accounts/users/?page_size=100");
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const rows = data?.results || data || [];
    setAllUsers(rows.map((u: { id: number; name?: string; email: string }) => ({ id: u.id, name: u.name || u.email, email: u.email })));
  }, [allUsers.length]);

  useEffect(() => {
    if (wizardOpen && wizardProjectId) void loadAllUsers();
  }, [wizardOpen, wizardProjectId, loadAllUsers]);

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
    if (ok > 0) { toast.success({ title: `أُضيف ${ok} عضواً` }); setMemberPick([]); void load("silent"); }
    else toast.error({ title: "تعذّرت إضافة الأعضاء" });
  };

  const removeMember = async (project: AdminProject, userId: number) => {
    const res = await authFetch(`/api/platform/projects/${project.id}/remove_member/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) { toast.success({ title: "تمت إزالة العضو" }); void load("silent"); }
    else toast.error({ title: "تعذّرت إزالة العضو" });
  };

  const stepIndicator = (
    <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
      {WIZARD_STEPS.map((s, i) => {
        const num = s.n === 1 ? "١" : s.n === 2 ? "٢" : "٣";
        const disabled = !canGoToStep(s.n);
        const active = wizardStep === s.n;
        return (
          <span key={s.n} className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              className={`rounded px-1 py-0.5 transition-colors${active ? " font-extrabold text-primary" : disabled ? " cursor-not-allowed text-brand-gray/50" : " text-brand-gray hover:text-primary"}`}
              onClick={() => { if (canGoToStep(s.n)) setWizardStep(s.n); }}
            >
              {num} {s.label}
            </button>
            {i < WIZARD_STEPS.length - 1 && <span className="text-brand-gray">·</span>}
          </span>
        );
      })}
    </div>
  );

  const wizardNav = (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-4">
      <Button type="button" variant="secondary" disabled={wizardStep === 1} onClick={handleWizardPrev}>
        السابق
      </Button>
      <div className="flex gap-2">
        {wizardStep < 3 && (
          <Button
            type="button"
            disabled={(wizardStep > 1 && !wizardProjectId) || basicsSaving}
            onClick={() => void handleWizardNext()}
          >
            {wizardStep === 1 && basicsSaving ? "جاري الحفظ…" : "التالي"}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={closeWizard}>إنهاء</Button>
      </div>
    </div>
  );

  if (loading) return <AdminShell><LoadingState title="جاري تحميل المشاريع…" /></AdminShell>;
  if (error) return <AdminShell><ErrorState title="تعذّر التحميل" message="تحقّق من الاتصال." /></AdminShell>;

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-primary">المشاريع</h1>
        {isSuperAdmin && (
          <Button type="button" onClick={openCreateWizard}>إضافة مشروع</Button>
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
              <Button type="button" variant="secondary" onClick={() => openEditWizard(p)}>التفاصيل</Button>
            </div>
          </Card>
        ))}
        {projects.length === 0 && <p className="text-brand-gray">لا مشاريع ضمن نطاقك.</p>}
      </div>

      <Modal
        open={wizardOpen}
        onClose={closeWizard}
        title={isCreateMode ? "إنشاء مشروع جديد" : (wizardProject?.name || "تعديل المشروع")}
        wide
      >
        {stepIndicator}

        {wizardStep === 1 && (
          <div>
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); void handleWizardNext(); }}
            >
              <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input label="لون الهوية" type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
              <Select label="النوع (اختياري)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="">— بدون نوع —</option>
                {types
                  .filter((t) => t.is_active || (wizardProject && t.id === wizardProject.type))
                  .map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </form>

            {wizardProject && (
              <div className="mt-4 space-y-4 border-t border-surface-border pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_BADGE[wizardProject.status] || "warning"}>
                    {labelAr(STATUS_LABELS, wizardProject.status, UNKNOWN_AR)}
                  </Badge>
                  {wizardProject.type_name && <Badge>{wizardProject.type_name}</Badge>}
                  {wizardProject.is_featured && <Badge variant="success">مميز</Badge>}
                  <a href={`/projects/${wizardProject.slug}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary hover:underline">
                    صفحة المشروع ↗
                  </a>
                  {wizardProject.tools.some((t) => t.tool_key === "sponsorships" && t.is_enabled) && (
                    <Link to={`/Admin/projects/${wizardProject.slug}/sponsorships`} className="text-sm font-bold text-primary hover:underline">
                      إدارة الكفالات
                    </Link>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border p-3">
                    <span className="text-xs font-bold text-brand-gray">دورة الحياة —</span>
                    {wizardProject.next_actions.length === 0 && <span className="text-xs text-brand-gray">لا إجراءات</span>}
                    {wizardProject.next_actions.map((action) => (
                      <button key={action} type="button"
                        className="rounded-full border border-surface-border bg-surface px-3 py-1 text-xs font-bold text-primary"
                        onClick={() => void runTransition(wizardProject, action)}>
                        {labelAr(LIFECYCLE_ACTION_LABELS, action, UNKNOWN_AR)}
                      </button>
                    ))}
                  </div>
                )}

                {isSuperAdmin && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border p-3">
                    <button type="button"
                      className={`rounded-full px-3 py-1 text-xs font-bold${wizardProject.is_featured ? " bg-primary text-white" : " border border-surface-border bg-surface"}`}
                      onClick={() => void toggleFeatured(wizardProject)}>
                      {wizardProject.is_featured ? "مميز ✓" : "تمييز للرئيسية"}
                    </button>
                  </div>
                )}

                <div className="rounded-lg border border-surface-border p-3">
                  <span className="text-xs font-bold text-brand-gray">رابط التبرع:</span>
                  {(isSuperAdmin || wizardProject.my_role === "project_admin") ? (
                    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(e) => {
                      e.preventDefault();
                      const donation_url = editDonation.projectId === wizardProject.id ? editDonation.donation_url : (wizardProject.donation_url || "");
                      const donation_label = editDonation.projectId === wizardProject.id ? editDonation.donation_label : (wizardProject.donation_label || "تبرع الآن");
                      void saveDonation(wizardProject, { donation_url, donation_label });
                    }}
                      onFocus={() => {
                        if (editDonation.projectId !== wizardProject.id) {
                          setEditDonation({ projectId: wizardProject.id, donation_url: wizardProject.donation_url || "", donation_label: wizardProject.donation_label || "تبرع الآن" });
                        }
                      }}>
                      <div className="min-w-[200px] flex-1">
                        <Input label="رابط التبرع" dir="ltr" value={editDonation.projectId === wizardProject.id ? editDonation.donation_url : (wizardProject.donation_url || "")}
                          onChange={(e) => setEditDonation({ projectId: wizardProject.id, donation_url: e.target.value, donation_label: editDonation.projectId === wizardProject.id ? editDonation.donation_label : (wizardProject.donation_label || "تبرع الآن") })} />
                      </div>
                      <div className="w-36">
                        <Input label="نص الزر" value={editDonation.projectId === wizardProject.id ? editDonation.donation_label : (wizardProject.donation_label || "تبرع الآن")}
                          onChange={(e) => setEditDonation({ projectId: wizardProject.id, donation_url: editDonation.projectId === wizardProject.id ? editDonation.donation_url : (wizardProject.donation_url || ""), donation_label: e.target.value })} />
                      </div>
                      <Button type="submit" variant="secondary">حفظ</Button>
                    </form>
                  ) : (
                    <p className="mt-1 text-sm text-brand-gray">{wizardProject.donation_url || "—"}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {wizardStep === 2 && wizardProject && (
          <div className="space-y-4">
            {!isSuperAdmin && (
              <p className="text-sm text-brand-gray">عرض فقط — تفعيل الأدوات يتطلب صلاحية المشرف العام.</p>
            )}
            {ALL_TOOLS.map((toolKey) => {
              const tool = wizardProject.tools.find((t) => t.tool_key === toolKey);
              const enabled = !!tool?.is_enabled;
              const draft = toolDrafts[toolKey] ?? tool?.config ?? {};
              return (
                <div key={toolKey} className="rounded-lg border border-surface-border p-3">
                  <Switch
                    label={labelAr(TOOL_LABELS, toolKey, UNKNOWN_AR)}
                    checked={enabled}
                    disabled={!isSuperAdmin}
                    onChange={(checked) => { if (isSuperAdmin) void setTool(wizardProject, toolKey, checked); }}
                  />
                  {enabled && isSuperAdmin && (
                    <div className="mt-3 border-t border-surface-border pt-3">
                      <p className="mb-2 text-xs font-bold text-brand-gray">إعدادات {labelAr(TOOL_LABELS, toolKey, UNKNOWN_AR)}</p>
                      <ToolConfigFields
                        toolKey={toolKey}
                        value={draft}
                        onChange={(config) => setToolDrafts((prev) => ({ ...prev, [toolKey]: config }))}
                      />
                      <div className="mt-2">
                        <Button type="button" variant="secondary" onClick={() => void saveToolConfig(wizardProject, toolKey, draft)}>
                          حفظ الإعدادات
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {wizardStep === 2 && !wizardProject && (
          <p className="text-sm text-brand-gray">أكمل الخطوة الأولى لإنشاء المشروع قبل إعداد الأدوات.</p>
        )}

        {wizardStep === 3 && wizardProject && (
          <div>
            <span className="text-xs font-bold text-brand-gray">الأعضاء:</span>
            <ul className="mt-1 space-y-1 text-sm">
              {wizardProject.members.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span>{m.username} — {labelAr(MEMBER_ROLE_AR, m.role, UNKNOWN_AR)}</span>
                  {(isSuperAdmin || wizardProject.my_role === "project_admin" || wizardProject.my_role === "super_admin") && (
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeMember(wizardProject, m.user)}>إزالة</button>
                  )}
                </li>
              ))}
              {wizardProject.members.length === 0 && <li className="text-brand-gray">لا أعضاء.</li>}
            </ul>
            {(isSuperAdmin || wizardProject.my_role === "project_admin" || wizardProject.my_role === "super_admin") && (
              <div className="mt-3 rounded-lg border border-surface-border p-3">
                <p className="mb-2 text-xs text-brand-gray">أضف أي مستخدم من المنصّة كعضو (بحث بالاسم أو البريد) — الدور قابل للتعديل لاحقاً.</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <MultiSelect
                      label="الأعضاء"
                      placeholder="ابحث بالاسم أو البريد…"
                      options={allUsers
                        .filter((u) => !wizardProject.members.some((m) => m.user === u.id))
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
                  <Button type="button" variant="secondary" disabled={memberPick.length === 0} onClick={() => void addSelectedMembers(wizardProject.id)}>
                    إضافة {memberPick.length > 0 ? `(${memberPick.length})` : ""} عضو
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {wizardStep === 3 && !wizardProject && (
          <p className="text-sm text-brand-gray">أكمل الخطوة الأولى لإنشاء المشروع قبل إدارة الأعضاء.</p>
        )}

        {wizardNav}
      </Modal>
    </AdminShell>
  );
}
