import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Badge from "../../ui/Badge";
import Tabs from "../../ui/Tabs";
import { LoadingState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";

type FieldType = "text" | "textarea" | "number" | "select" | "boolean" | "date";
interface SchemaField { key: string; label: string; type: FieldType; required: boolean; options?: string[] }
interface RForm {
  id: number; project: number | null; project_name: string | null; title: string; slug: string;
  description: string; fields_schema: SchemaField[]; is_active: boolean; submissions_count: number;
}
interface Submission { id: number; form: number; form_title: string; project_name: string | null; data: Record<string, unknown>; status: string; admin_notes: string; created_at: string }
interface ProjectOption { id: number; name: string }

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "نص", textarea: "نص طويل", number: "رقم", select: "قائمة اختيار", boolean: "نعم/لا", date: "تاريخ",
};
const SUB_STATUS: Record<string, string> = { PENDING: "قيد المراجعة", APPROVED: "مقبول", REJECTED: "مرفوض", DONE: "منجز" };

/** نطاق الطلبات — نماذج ديناميكية تُنشئها الإدارة وتربطها بمشروع (D-47). */
export default function RequestFormsAdmin() {
  const toast = useToast();
  const [tab, setTab] = useState("forms");
  const [forms, setForms] = useState<RForm[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [meta, setMeta] = useState({ title: "", slug: "", project: "", description: "" });
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [fieldDraft, setFieldDraft] = useState<SchemaField>({ key: "", label: "", type: "text", required: false, options: [] });
  const [optionsText, setOptionsText] = useState("");

  const [selected, setSelected] = useState<RForm | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);

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
    if (!fieldDraft.key || !fieldDraft.label) { toast.error({ title: "المفتاح والتسمية مطلوبان" }); return; }
    if (fields.some((f) => f.key === fieldDraft.key)) { toast.error({ title: "مفتاح مكرّر" }); return; }
    const options = fieldDraft.type === "select" ? optionsText.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    setFields([...fields, { ...fieldDraft, options }]);
    setFieldDraft({ key: "", label: "", type: "text", required: false, options: [] });
    setOptionsText("");
  };

  const createForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fields.length === 0) { toast.error({ title: "أضِف حقلاً واحداً على الأقل" }); return; }
    const res = await authFetch("/api/admin/request-forms/", {
      method: "POST",
      body: JSON.stringify({
        title: meta.title, slug: meta.slug, description: meta.description,
        project: meta.project ? Number(meta.project) : null,
        fields_schema: fields, is_active: true,
      }),
    });
    if (res.ok) {
      toast.success({ title: "تم إنشاء النموذج" });
      setMeta({ title: "", slug: "", project: "", description: "" }); setFields([]);
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
      <h1 className="mb-4 text-2xl font-extrabold text-primary">نماذج الطلبات المخصّصة</h1>
      <div className="mb-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: "forms", label: `النماذج (${forms.length})` },
          { key: "submissions", label: selected ? `طلبات: ${selected.title}` : "الطلبات" },
        ]} />
      </div>

      {tab === "forms" && (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 text-lg font-bold text-primary">إنشاء نموذج وربطه بمشروع</h2>
            <form className="space-y-3" onSubmit={createForm}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="عنوان النموذج" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} required />
                <Input label="المعرّف (slug)" dir="ltr" value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} required />
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
                      <code className="text-xs text-brand-gray" dir="ltr">{f.key}</code>
                      <Badge>{FIELD_TYPE_LABELS[f.type]}</Badge>
                      {f.required && <Badge variant="warning">إلزامي</Badge>}
                      {f.options && f.options.length > 0 && <span className="text-xs text-brand-gray">[{f.options.join("، ")}]</span>}
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setFields(fields.filter((_, j) => j !== i))}>إزالة</button>
                    </div>
                  ))}
                  {fields.length === 0 && <p className="text-xs text-brand-gray">لم تُضف حقول بعد.</p>}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                  <Input label="المفتاح" dir="ltr" value={fieldDraft.key} onChange={(e) => setFieldDraft({ ...fieldDraft, key: e.target.value })} />
                  <Input label="التسمية" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} />
                  <Select label="النوع" value={fieldDraft.type} onChange={(e) => setFieldDraft({ ...fieldDraft, type: e.target.value as FieldType })}>
                    {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                  </Select>
                  {fieldDraft.type === "select" && (
                    <Input label="الخيارات (بفواصل)" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
                  )}
                  <label className="flex items-end gap-1 text-sm"><input type="checkbox" checked={fieldDraft.required} onChange={(e) => setFieldDraft({ ...fieldDraft, required: e.target.checked })} /> إلزامي</label>
                  <div className="flex items-end"><Button type="button" variant="secondary" onClick={addField}>إضافة حقل</Button></div>
                </div>
              </div>

              <Button type="submit">حفظ النموذج</Button>
            </form>
          </Card>

          {loading ? <LoadingState title="جاري التحميل…" /> : (
            <div className="space-y-3">
              {forms.map((f) => (
                <Card key={f.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-primary">{f.title}</h3>
                      <Badge variant={f.is_active ? "success" : "danger"}>{f.is_active ? "مفعّل" : "معطّل"}</Badge>
                      {f.project_name && <Badge>{f.project_name}</Badge>}
                      <code className="text-xs text-brand-gray" dir="ltr">/forms/{f.slug}</code>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-bold">
                      <button type="button" className="text-primary hover:underline" onClick={() => openSubmissions(f)}>الطلبات ({f.submissions_count})</button>
                      <button type="button" className="text-amber-700 hover:underline" onClick={() => toggleActive(f)}>{f.is_active ? "تعطيل" : "تفعيل"}</button>
                      <button type="button" className="text-red-600 hover:underline" onClick={() => removeForm(f)}>حذف</button>
                    </div>
                  </div>
                </Card>
              ))}
              {forms.length === 0 && <p className="text-brand-gray">لا نماذج بعد — أنشئ أول نموذج أعلاه.</p>}
            </div>
          )}
        </>
      )}

      {tab === "submissions" && (
        <div className="space-y-3">
          {!selected && <p className="text-brand-gray">اختر نموذجاً من تبويب «النماذج» لعرض طلباته.</p>}
          {selected && subs.length === 0 && <p className="text-brand-gray">لا طلبات على هذا النموذج بعد.</p>}
          {subs.map((s) => (
            <Card key={s.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Badge variant={s.status === "APPROVED" ? "success" : s.status === "REJECTED" ? "danger" : s.status === "DONE" ? "primary" : "warning"}>{SUB_STATUS[s.status] || s.status}</Badge>
                <span className="text-xs text-brand-gray" dir="ltr">{new Date(s.created_at).toLocaleString("ar")}</span>
              </div>
              <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {Object.entries(s.data).map(([k, v]) => (
                  <div key={k} className="flex gap-2"><dt className="font-bold text-brand-gray">{k}:</dt><dd>{String(v)}</dd></div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <button type="button" className="text-green-700 hover:underline" onClick={() => setSubStatus(s, "APPROVED")}>قبول</button>
                <button type="button" className="text-red-600 hover:underline" onClick={() => setSubStatus(s, "REJECTED")}>رفض</button>
                <button type="button" className="text-primary hover:underline" onClick={() => setSubStatus(s, "DONE")}>إنجاز</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
