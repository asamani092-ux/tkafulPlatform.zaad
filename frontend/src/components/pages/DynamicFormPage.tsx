import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { LoadingState, ErrorState } from "../feedback/PageStates";
import { useToast } from "../../contexts/ToastContext";

type FieldType = "text" | "textarea" | "number" | "select" | "boolean" | "date";
interface SchemaField { key: string; label: string; type: FieldType; required: boolean; options?: string[] }
interface RForm { title: string; description: string; fields_schema: SchemaField[] }

/** صفحة عامة تُصيّر نموذجاً ديناميكياً من مخطط الخادم وتُرسله. */
export default function DynamicFormPage() {
  const { slug } = useParams();
  const toast = useToast();
  const [form, setForm] = useState<RForm | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-forms/${slug}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setForm)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public-forms/${slug}/submit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error({ title: d.detail || "تعذّر الإرسال" }); return; }
      setDone(true);
      toast.success({ title: "تم إرسال طلبك بنجاح" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-lg px-4 py-10" dir="rtl"><LoadingState title="جاري تحميل النموذج…" /></div>;
  if (error || !form) return <div className="mx-auto max-w-lg px-4 py-10" dir="rtl"><ErrorState title="النموذج غير موجود" message="تأكد من الرابط." /></div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-10" dir="rtl">
      <Card>
        <h1 className="mb-1 text-2xl font-extrabold text-primary">{form.title}</h1>
        {form.description && <p className="mb-4 text-sm text-brand-gray">{form.description}</p>}
        {done ? (
          <p className="py-6 text-center font-bold text-green-700">تم استلام طلبك — شكراً لك.</p>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            {form.fields_schema.map((f) => {
              const label = `${f.label}${f.required ? " *" : ""}`;
              if (f.type === "select") {
                return (
                  <Select key={f.key} label={label} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                    <option value="">—</option>
                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                );
              }
              if (f.type === "boolean") {
                return (
                  <Select key={f.key} label={label} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                    <option value="">—</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </Select>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.key}>
                    <label className="label-field">{label}</label>
                    <textarea className="input-field" rows={3} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
                  </div>
                );
              }
              return (
                <Input key={f.key} label={label}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
              );
            })}
            <Button type="submit" disabled={submitting}>{submitting ? "جاري الإرسال…" : "إرسال الطلب"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
