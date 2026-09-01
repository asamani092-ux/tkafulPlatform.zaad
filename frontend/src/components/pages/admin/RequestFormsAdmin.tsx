import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Badge from "../../ui/Badge";
import Checkbox from "../../ui/Checkbox";
import Tabs from "../../ui/Tabs";
import Modal from "../../ui/Modal";
import { LoadingState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { autoFieldKeyFromLabel, autoSlugFromLabel } from "../../../utils/autoSlug";

type FieldType = "text" | "textarea" | "number" | "select" | "boolean" | "date";
interface SchemaField { key: string; label: string; type: FieldType; required: boolean; options?: string[] }
interface RForm {
  id: number; project: number | null; project_name: string | null; title: string; slug: string;
  description: string; fields_schema: SchemaField[]; is_active: boolean; submissions_count: number;
  created_at?: string;
}
interface Submission { id: number; form: number; form_title: string; project_name: string | null; data: Record<string, unknown>; status: string; admin_notes: string; created_at: string }
interface ProjectOption { id: number; name: string }

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "نص", textarea: "نص طويل", number: "رقم", select: "قائمة اختيار", boolean: "نعم/لا", date: "تاريخ",
};
const SUB_STATUS: Record<string, string> = { PENDING: "قيد المراجعة", APPROVED: "مقبول", REJECTED: "مرفوض", DONE: "منجز" };

/** نطاق الطلبات — إنشاء نموذج بنافذة عائمة؛ مفتاح الحقل تلقائي من التسمية. */
export default function RequestFormsAdmin() {
  const toast = useToast();
  const [tab, setTab] = useState("forms");
  const [forms, setForms] = useState<RForm[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [meta, setMeta] = useState({ title: "", slug: "", project: "", description: "" });
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [fieldDraft, setFieldDraft] = useState<{ label: string; type: FieldType; required: boolean }>({ label: "", type: "text", required: false });
  const [optionsText, setOptionsText] = useState("");

  const [selected, setSelected] = useState<RForm | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);

  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of selected?.fields_schema || []) m[f.key] = f.label || f.key;
    return m;
  }, [selected]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        authFetch("/api/admin/request-forms/"),
        authFetch("/api/platform/projects/"),
      ]);
      setForms(fRes.ok ? await fRes.json() : []);
      if (pRes.ok) {
        const pd = await pRes.json();
        const arr = Array.isArray(pd) ? pd : pd.results || [];
        setProjects(arr.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addField = () => {
    if (!fieldDraft.label.trim()) { toast.error({ title: "التسمية مطلوبة" }); return; }
    let key = autoFieldKeyFromLabel(fieldDraft.label);
    let n = 2;
    while (fields.some((f) => f.key === key)) {
      key = `${autoFieldKeyFromLabel(fieldDraft.label)}_${n}`;
      n += 1;
    }
    const options = fieldDraft.type === "select" ? optionsText.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    setFields([...fields, { key, label: fieldDraft.label, type: fieldDraft.type, required: fieldDraft.required, options }]);
    setFieldDraft({ label: "", type: "text", required: false });
    setOptionsText("");
  };

  const createForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fields.length === 0) { toast.error({ title: "أضِف حقلاً واحداً على الأقل" }); return; }
    const slug = meta.slug.trim() || autoSlugFromLabel(meta.title, "form");
    const res = await authFetch("/api/admin/request-forms/", {
      method: "POST",
      body: JSON.stringify({
        title: meta.title, slug, description: meta.description,
        project: meta.project ? Number(meta.project) : null,
        fields_schema: fields, is_active: true,
      }),
    });
    if (res.ok) {
      toast.success({ title: "تم إنشاء النموذج" });
      setMeta({ title: "", slug: "", project: "", description: "" }); setFields([]);
      setCreateOpen(false);
      void load();
    } else {
      const d = await res.json().catch(() => ({}));
      const msg = d.slug?.[0] || d.fields_schema?.[0] || d.detail || "تعذّر الإنشاء";
      toast.error({ title: typeof msg === "string" ? msg : JSON.stringify(msg) });
    }
  };

  const toggleActive = async (f: RForm) => {
    const res = await authFetch(`/api/admin/request-forms/${f.id}/`, { method: "PATCH", body: JSON.stringify({ is_active: !f.is_active }) });
    if (res.ok) { toast.success({ title: f.is_active ? "أُلغي التفعيل" : "تم التفعيل" }); void load(); }
  };

  const removeForm = async (f: RForm) => {
    if (!window.confirm(`حذف النموذج «${f.title}» وكل طلباته؟`)) return;
    const res = await authFetch(`/api/admin/request-forms/${f.id}/`, { method: "DELETE" });
    if (res.ok) { toast.success({ title: "تم الحذف" }); if (selected?.id === f.id) setSelected(null); void load(); }
  };

  const openSubmissions = async (f: RForm) => {
    setSelected(f); setTab("submissions"); setSubs([]);
    const res = await authFetch(`/api/admin/request-submissions/?form=${f.id}`);
    if (res.ok) { const d = await res.json(); setSubs(d.results || d); }
  };

  const setSubStatus = async (s: Submission, status: string) => {
    const res = await authFetch(`/api/admin/request-submissions/${s.id}/`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (res.ok && selected) { toast.success({ title: "تم تحديث الحالة" }); void openSubmissions(selected); }
  };

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-primary">نماذج الطلبات</h1>
        {tab === "forms" && <Button type="button" onClick={() => setCreateOpen(true)}>إضافة نموذج</Button>}
      </div>
      <div className="mb-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: "forms", label: `النماذج (${forms.length})` },
          { key: "submissions", label: selected ? `الطلبات: ${selected.title}` : "الطلبات" },
        ]} />
      </div>

      {tab === "forms" && (
        loading ? <LoadingState title="جاري التحميل…" /> : (
          <div className="space-y-3">
            {forms.map((f) => (
              <Card key={f.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-primary">{f.title}</h3>
                    <Badge variant={f.is_active ? "success" : "danger"}>{f.is_active ? "نشط" : "غير نشط"}</Badge>
                    <span className="text-xs text-brand-gray">
                      {f.created_at ? new Date(f.created_at).toLocaleDateString("ar") : "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openSubmissions(f)}>التفاصيل ({f.submissions_count})</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => toggleActive(f)}>{f.is_active ? "تعطيل" : "تفعيل"}</Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => removeForm(f)}>حذف</Button>
                  </div>
                </div>
              </Card>
            ))}
            {forms.length === 0 && <p className="text-brand-gray">لا نماذج بعد — اضغط «إضافة نموذج».</p>}
          </div>
        )
      )}

      {tab === "submissions" && (
        <div className="space-y-3">
          {!selected && <p className="text-brand-gray">اختر نموذجاً من تبويب «النماذج» لعرض طلباته.</p>}
          {selected && (
            <p className="text-sm text-brand-gray">
              مراجعة الطلبات: قبول / رفض / إنجاز تغيّر حالة الطلب للمتابعة الإدارية.
              الرابط العام: <code dir="ltr">/forms/{selected.slug}</code>
            </p>
          )}
          {selected && subs.length === 0 && <p className="text-brand-gray">لا طلبات على هذا النموذج بعد.</p>}
          {subs.map((s) => (
            <Card key={s.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Badge variant={s.status === "APPROVED" ? "success" : s.status === "REJECTED" ? "danger" : s.status === "DONE" ? "primary" : "warning"}>
                  {SUB_STATUS[s.status] || s.status}
                </Badge>
                <span className="text-xs text-brand-gray">{new Date(s.created_at).toLocaleString("ar")}</span>
              </div>
              <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {Object.entries(s.data).filter(([k]) => k !== "legacy_id").map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="font-bold text-brand-gray">{labelMap[k] || k}:</dt>
                    <dd>{typeof v === "boolean" ? (v ? "نعم" : "لا") : String(v)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setSubStatus(s, "APPROVED")}>قبول</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSubStatus(s, "REJECTED")}>رفض</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSubStatus(s, "DONE")}>إنجاز</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء نموذج طلب" wide>
        <form className="space-y-3" onSubmit={createForm}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="عنوان النموذج"
              value={meta.title}
              onChange={(e) => {
                const title = e.target.value;
                setMeta((m) => ({
                  ...m,
                  title,
                  slug: m.slug && m.slug !== autoSlugFromLabel(m.title, "form") ? m.slug : autoSlugFromLabel(title, "form"),
                }));
              }}
              required
            />
            <Input
              label="رابط النموذج (يُنشأ تلقائياً)"
              dir="ltr"
              value={meta.slug}
              onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
              required
            />
            <Select label="المشروع (اختياري)" value={meta.project} onChange={(e) => setMeta({ ...meta, project: e.target.value })}>
              <option value="">— بلا مشروع —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input label="وصف مختصر" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </div>

          <div className="rounded-lg border border-surface-border p-3">
            <p className="mb-2 text-sm font-bold text-primary">الحقول ({fields.length})</p>
            <div className="mb-2 space-y-1">
              {fields.map((f, i) => (
                <div key={f.key} className="flex flex-wrap items-center gap-2 text-sm">
                  <strong>{f.label}</strong>
                  <Badge>{FIELD_TYPE_LABELS[f.type]}</Badge>
                  {f.required && <Badge variant="warning">إلزامي</Badge>}
                  <Button type="button" variant="danger" size="sm" onClick={() => setFields(fields.filter((_, j) => j !== i))}>إزالة</Button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              <Input label="تسمية الحقل" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} />
              <Select label="النوع" value={fieldDraft.type} onChange={(e) => setFieldDraft({ ...fieldDraft, type: e.target.value as FieldType })}>
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
              </Select>
              {fieldDraft.type === "select" && (
                <Input label="الخيارات (بفواصل)" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
              )}
              <div className="flex items-end"><Checkbox label="إلزامي" checked={fieldDraft.required} onChange={(e) => setFieldDraft({ ...fieldDraft, required: e.target.checked })} /></div>
              <div className="flex items-end"><Button type="button" variant="secondary" onClick={addField}>إضافة حقل</Button></div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">حفظ النموذج</Button>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>إلغاء</Button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
