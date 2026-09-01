import { useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import type { ProjectType } from "../projects/types";

const emptyForm = { name: "", order: 0 };

/** إدارة «أنواع المشاريع» — قابلة للتوسّع من الإعدادات (المشرف العام). */
export default function ProjectTypesAdmin() {
  const toast = useToast();
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch("/api/platform/project-types/");
      if (!res.ok) throw new Error("fetch");
      const data = await res.json();
      setTypes(Array.isArray(data) ? data : data.results || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authFetch("/api/platform/project-types/", {
        method: "POST",
        body: JSON.stringify({ name: form.name, order: form.order }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: "تعذّر الإنشاء", description: data.name?.[0] || "تحقّق من الحقول" });
      } else {
        toast.success({ title: "تمت إضافة النوع" });
        setForm(emptyForm);
        void load();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (t: ProjectType) => {
    const res = await authFetch(`/api/platform/project-types/${t.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    if (res.ok) { toast.success({ title: "تم التحديث" }); void load(); }
    else toast.error({ title: "تعذّر التحديث" });
  };

  const remove = async (t: ProjectType) => {
    if (!window.confirm(`حذف النوع «${t.name}»؟ ستُزال إشارته من المشاريع.`)) return;
    const res = await authFetch(`/api/platform/project-types/${t.id}/`, { method: "DELETE" });
    if (res.ok) { toast.success({ title: "تم الحذف" }); void load(); }
    else toast.error({ title: "تعذّر الحذف" });
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">أنواع المشاريع</h1>
      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-bold text-primary">إضافة نوع</h2>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => void create(e)}>
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="الترتيب" type="number" min={0} dir="ltr" value={String(form.order)} onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })} />
          <div className="sm:col-span-3"><Button type="submit" disabled={busy}>{busy ? "جاري الحفظ…" : "إضافة"}</Button></div>
        </form>
      </Card>

      {loading && <LoadingState />}
      {error && <ErrorState message="تعذّر تحميل الأنواع" />}
      {!loading && !error && types.length === 0 && <EmptyState title="لا أنواع بعد" />}
      {!loading && !error && types.length > 0 && (
        <Card>
          <ul className="space-y-2">
            {types.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{t.name}</span>
                  
                  <Badge variant={t.is_active ? "success" : "danger"}>{t.is_active ? "مفعّل" : "معطّل"}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => void toggleActive(t)}>{t.is_active ? "تعطيل" : "تفعيل"}</Button>
                  <Button type="button" variant="secondary" onClick={() => void remove(t)}>حذف</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AdminShell>
  );
}
