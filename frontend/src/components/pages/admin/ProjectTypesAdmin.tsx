import { useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Modal from "../../ui/Modal";
import CompactListCard from "../../ui/CompactListCard";
import { LoadingState, ErrorState, EmptyState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import type { ProjectType } from "../projects/types";

const emptyForm = { name: "", slug: "", order: 0 };

/** إدارة «أنواع المشاريع» — إضافة بنافذة عائمة + بطاقات مختصرة. */
export default function ProjectTypesAdmin() {
  const toast = useToast();
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ProjectType | null>(null);

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
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: "تعذّر الإنشاء", description: data.slug?.[0] || data.name?.[0] || "تحقّق من الحقول" });
      } else {
        toast.success({ title: "تمت إضافة النوع" });
        setForm(emptyForm);
        setCreateOpen(false);
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
    if (res.ok) {
      toast.success({ title: "تم التحديث" });
      setDetail((d) => (d && d.id === t.id ? { ...d, is_active: !t.is_active } : d));
      void load();
    } else toast.error({ title: "تعذّر التحديث" });
  };

  const remove = async (t: ProjectType) => {
    if (!window.confirm(`حذف النوع «${t.name}»؟ ستُزال إشارته من المشاريع.`)) return;
    const res = await authFetch(`/api/platform/project-types/${t.id}/`, { method: "DELETE" });
    if (res.ok) {
      toast.success({ title: "تم الحذف" });
      setDetail(null);
      void load();
    } else toast.error({ title: "تعذّر الحذف" });
  };

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-primary">أنواع المشاريع</h1>
        <Button type="button" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>إضافة نوع</Button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message="تعذّر تحميل الأنواع" />}
      {!loading && !error && types.length === 0 && <EmptyState title="لا أنواع بعد" />}
      {!loading && !error && types.length > 0 && (
        <div className="space-y-3">
          {types.map((t) => (
            <CompactListCard
              key={t.id}
              name={t.name}
              active={t.is_active}
              createdAt={t.created_at}
              onDetails={() => setDetail(t)}
            />
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إضافة نوع مشروع">
        <form className="grid gap-3" onSubmit={(e) => void create(e)}>
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="المعرّف (slug)" dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          <Input label="الترتيب" type="number" min={0} dir="ltr" value={String(form.order)} onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "جاري الحفظ…" : "إنشاء"}</Button>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>إلغاء</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || "تفاصيل النوع"}>
        {detail && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={detail.is_active ? "success" : "danger"}>{detail.is_active ? "نشط" : "غير نشط"}</Badge>
              <span className="text-xs text-brand-gray" dir="ltr">{detail.slug}</span>
              <span className="text-xs text-brand-gray">ترتيب: {detail.order}</span>
            </div>
            <Card>
              <p className="text-sm text-brand-gray">
                تاريخ الإنشاء:{" "}
                {detail.created_at ? new Date(detail.created_at).toLocaleDateString("ar") : "—"}
              </p>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void toggleActive(detail)}>
                {detail.is_active ? "تعطيل" : "تفعيل"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void remove(detail)}>حذف</Button>
              <Button type="button" variant="secondary" onClick={() => setDetail(null)}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
