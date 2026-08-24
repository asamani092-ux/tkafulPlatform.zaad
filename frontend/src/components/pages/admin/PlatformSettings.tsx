import { useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { usePlatformSettings, type PublicPlatformSettings } from "../../../contexts/PlatformSettingsContext";
import { authFetch } from "../../../lib/api";
import { EXTERNAL_STORE_URL } from "../../../config";

type BoolKey = "water_supply_form_enabled" | "public_registration_enabled" | "maintenance_mode";
type StrKey = "contact_email" | "contact_phone";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-surface-border p-3">
      <div>
        <div className="font-bold text-primary">{label}</div>
        <p className="mt-1 text-xs text-brand-gray">{description}</p>
      </div>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 accent-[var(--tmkeen-primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

/** إعدادات المنصّة — مشرف عام فقط. */
export default function PlatformSettingsPage() {
  const toast = useToast();
  const { applyPublicSettings } = usePlatformSettings();
  const [form, setForm] = useState<PublicPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    authFetch("/api/platform/settings/")
      .then(async (r) => {
        if (!r.ok) throw new Error("fetch");
        return r.json() as Promise<PublicPlatformSettings>;
      })
      .then(setForm)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const setBool = (key: BoolKey, value: boolean) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setStr = (key: StrKey, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/platform/settings/", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("save");
      const data = (await res.json()) as PublicPlatformSettings;
      setForm(data);
      applyPublicSettings(data);
      toast.success({ title: "تم حفظ إعدادات المنصّة" });
    } catch {
      toast.error({ title: "تعذّر الحفظ", description: "تحقّق من الاتصال أو الصلاحيات." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminShell><LoadingState title="جاري تحميل الإعدادات…" /></AdminShell>;
  if (error || !form) {
    return (
      <AdminShell>
        <ErrorState title="تعذّر تحميل الإعدادات" message="تحقّق من الاتصال أو صلاحية المشرف العام." />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">إعدادات المنصّة</h1>
      <p className="mb-6 text-sm text-brand-gray">
        تغييرات فورية دون إعادة نشر — أسرار البنية التحتية تبقى في متغيرات البيئة فقط.
      </p>

      <div className="space-y-6">
        <Card>
          <h2 className="mb-3 text-lg font-bold text-primary">النماذج العامة</h2>
          <div className="space-y-3">
            <ToggleRow
              label="نموذج سقيا الماء"
              description="إظهار روابط ونموذج طلب سقيا الماء في الواجهة العامة."
              checked={form.water_supply_form_enabled}
              onChange={(v) => setBool("water_supply_form_enabled", v)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-primary">الوصول</h2>
          <div className="space-y-3">
            <ToggleRow
              label="التسجيل العام"
              description="السماح بإنشاء حسابات جديدة من صفحة التسجيل."
              checked={form.public_registration_enabled}
              onChange={(v) => setBool("public_registration_enabled", v)}
            />
            <ToggleRow
              label="وضع الصيانة"
              description="عرض رسالة صيانة للزوار (المشرف العام يتجاوزها)."
              checked={form.maintenance_mode}
              onChange={(v) => setBool("maintenance_mode", v)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-primary">التواصل</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="البريد"
              dir="ltr"
              value={form.contact_email}
              onChange={(e) => setStr("contact_email", e.target.value)}
            />
            <Input
              label="الهاتف"
              dir="ltr"
              value={form.contact_phone}
              onChange={(e) => setStr("contact_phone", e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-bold text-primary">للمطوّر فقط (قراءة)</h2>
          <p className="text-xs text-brand-gray">
            رابط المتجر الخارجي من البيئة:{" "}
            <code dir="ltr">{EXTERNAL_STORE_URL || "— غير مضبوط —"}</code>
          </p>
        </Card>

        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "جاري الحفظ…" : "حفظ الإعدادات"}
        </Button>
      </div>
    </AdminShell>
  );
}
