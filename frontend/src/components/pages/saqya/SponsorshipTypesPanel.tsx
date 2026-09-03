import { useCallback, useEffect, useState } from "react";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Textarea from "../../ui/Textarea";
import Badge from "../../ui/Badge";
import Modal from "../../ui/Modal";
import Checkbox from "../../ui/Checkbox";
import { LoadingState, EmptyState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import FieldSchemaBuilder, {
  FieldSchemaPreview,
  type SchemaField,
} from "../../admin/FieldSchemaBuilder";

interface SponsorshipType {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  order: number;
  fields: SchemaField[];
}

/**
 * مدير أنواع الكفالات لمشروع — بلا JSON خام أو طلب slug من المستخدم.
 * التعقيد: O(t + f) للتحميل والعرض.
 */
export default function SponsorshipTypesPanel({ projectSlug }: { projectSlug: string }) {
  const { success, error } = useToast();
  const [items, setItems] = useState<SponsorshipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SponsorshipType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<SchemaField[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/saqya/sponsorship-types/?project=${encodeURIComponent(projectSlug)}`,
      );
      if (res.ok) {
        const d = await res.json();
        setItems(d.results || d);
      }
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setFields([]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (t: SponsorshipType) => {
    setEditing(t);
    setName(t.name);
    setDescription(t.description || "");
    setIsActive(t.is_active);
    setFields(t.fields || []);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error({ title: "اسم النوع مطلوب" });
      return;
    }
    const body = {
      project: projectSlug,
      name: name.trim(),
      description,
      is_active: isActive,
      fields,
    };
    const res = editing
      ? await authFetch(`/api/saqya/sponsorship-types/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await authFetch("/api/saqya/sponsorship-types/", {
          method: "POST",
          body: JSON.stringify(body),
        });
    if (res.ok) {
      success({ title: editing ? "تم تحديث النوع" : "تم إنشاء النوع" });
      setOpen(false);
      resetForm();
      void load();
    } else {
      const d = await res.json().catch(() => ({}));
      const msg = d.fields?.[0] || d.name?.[0] || d.detail || "تعذّر الحفظ";
      error({ title: typeof msg === "string" ? msg : JSON.stringify(msg) });
    }
  };

  const remove = async (t: SponsorshipType) => {
    if (!window.confirm(`حذف النوع «${t.name}»؟`)) return;
    const res = await authFetch(`/api/saqya/sponsorship-types/${t.id}/`, { method: "DELETE" });
    if (res.ok) {
      success({ title: "تم الحذف" });
      void load();
    } else error({ title: "تعذّر الحذف" });
  };

  const toggle = async (t: SponsorshipType) => {
    const res = await authFetch(`/api/saqya/sponsorship-types/${t.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    if (res.ok) {
      success({ title: t.is_active ? "أُلغي التفعيل" : "تم التفعيل" });
      void load();
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-primary">أنواع الكفالات</h2>
        <Button type="button" onClick={openCreate}>
          إضافة نوع
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState title="لا أنواع بعد" message="أنشئ نوع كفالة بحقول مخصّصة للمتبرّعين." />
      ) : (
        items.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="font-bold text-primary">{t.name}</h3>
                <Badge variant={t.is_active ? "success" : "danger"}>
                  {t.is_active ? "نشط" : "غير نشط"}
                </Badge>
                <span className="text-xs text-brand-gray">{t.fields?.length || 0} حقل</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(t)}>
                  تعديل
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggle(t)}>
                  {t.is_active ? "تعطيل" : "تفعيل"}
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={() => remove(t)}>
                  حذف
                </Button>
              </div>
            </div>
            {t.description && <p className="mt-2 text-sm text-brand-gray">{t.description}</p>}
          </Card>
        ))
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title={editing ? "تعديل نوع كفالة" : "إنشاء نوع كفالة"}
        wide
      >
        <form className="space-y-3" onSubmit={save}>
          <Input label="اسم النوع" value={name} onChange={(e) => setName(e.target.value)} required />
          <Textarea
            label="الوصف"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Checkbox
            label="نشط (ظاهر للمتبرّع)"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FieldSchemaBuilder fields={fields} onChange={setFields} allowPublicFlag />
            <FieldSchemaPreview title={name} fields={fields} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">حفظ</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
