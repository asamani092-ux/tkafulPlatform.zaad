import { useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Textarea from "../../ui/Textarea";
import Checkbox from "../../ui/Checkbox";
import Switch from "../../ui/Switch";
import Button from "../../ui/Button";
import Tabs from "../../ui/Tabs";
import { LoadingState, ErrorState, EmptyState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import {
  usePlatformSettings,
  type DonorDataPolicy,
  type PublicPlatformSettings,
  type RolesCanLogin,
} from "../../../contexts/PlatformSettingsContext";
import { authFetch } from "../../../lib/api";
import { extractErrorDetail } from "../../../admin/userManagement";

type FlagKey = "show_map" | "show_services" | "show_volunteering";

const ROLE_LABELS: { key: keyof RolesCanLogin; label: string }[] = [
  { key: "admin", label: "مشرف" },
  { key: "manager", label: "مدير" },
  { key: "employee", label: "موظف" },
  { key: "user", label: "متطوّع (user)" },
  { key: "donor", label: "متبرّع" },
  { key: "supplier", label: "مورّد" },
  { key: "representative", label: "مندوب" },
  { key: "beneficiary", label: "مستفيد" },
];

interface StaticPageRow {
  id: number;
  slug: string;
  title: string;
  body: string;
  is_published: boolean;
}

export default function PlatformSettingsPage() {
  const toast = useToast();
  const { applyPublicSettings } = usePlatformSettings();
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState<PublicPlatformSettings | null>(null);
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<StaticPageRow[]>([]);
  const [edit, setEdit] = useState<StaticPageRow | null>(null);

  useEffect(() => {
    authFetch("/api/settings/")
      .then(async (r) => {
        if (!r.ok) throw new Error("fetch");
        return r.json();
      })
      .then((data) => {
        setForm({ ...data, pages: [] });
        const links = data.social_links || {};
        setTwitter(links.twitter || "");
        setInstagram(links.instagram || "");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    authFetch("/api/static-pages/")
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data) => setPages(Array.isArray(data) ? data : data.results || []))
      .catch(() => {});
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/settings/", {
        method: "PATCH",
        body: JSON.stringify({
          platform_name: form.platform_name,
          logo_url: form.logo_url,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          address: form.address,
          social_links: { twitter, instagram },
          show_map: form.show_map,
          show_services: form.show_services,
          show_volunteering: form.show_volunteering,
          roles_can_login: form.roles_can_login,
          sponsorship_payments_enabled: form.sponsorship_payments_enabled,
          sponsorship_gps_documentation: form.sponsorship_gps_documentation,
          sponsorship_collect_donor_data: form.sponsorship_collect_donor_data,
        }),
      });
      if (!res.ok) {
        toast.error({ title: extractErrorDetail(await res.json().catch(() => null)) });
        return;
      }
      const data = await res.json();
      setForm({ ...form, ...data });
      applyPublicSettings(data);
      toast.success({ title: "تم حفظ إعدادات المنصّة" });
    } finally {
      setSaving(false);
    }
  };

  const savePage = async () => {
    if (!edit) return;
    const res = await authFetch(`/api/static-pages/${edit.slug}/`, {
      method: "PATCH",
      body: JSON.stringify({ title: edit.title, body: edit.body, is_published: edit.is_published }),
    });
    if (!res.ok) {
      toast.error({ title: extractErrorDetail(await res.json().catch(() => null)) });
      return;
    }
    const data = await res.json();
    setPages((prev) => prev.map((p) => (p.slug === data.slug ? data : p)));
    setEdit(null);
    toast.success({ title: "تم حفظ الصفحة" });
  };

  if (loading) return <AdminShell><LoadingState title="جاري تحميل الإعدادات…" /></AdminShell>;
  if (error || !form) return <AdminShell><ErrorState title="تعذّر تحميل الإعدادات" /></AdminShell>;

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">إعدادات المنصّة</h1>
      <Tabs
        tabs={[
          { key: "general", label: "عام" },
          { key: "sponsorship", label: "الكفالات والدخول" },
          { key: "pages", label: "الصفحات الثابتة" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "general" && (
        <div className="mt-4 space-y-4">
          <Card>
            <h2 className="mb-3 text-lg font-bold text-primary">الهوية</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="اسم المنصّة" value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} />
              <Input label="رابط الشعار (https)" dir="ltr" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-bold text-primary">التواصل</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="البريد" dir="ltr" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              <Input label="الهاتف" dir="ltr" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              <Input label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Input label="تويتر (https)" dir="ltr" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
              <Input label="إنستغرام (https)" dir="ltr" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-bold text-primary">أدوات عامة</h2>
            <div className="space-y-2">
              {([
                ["show_map", "إظهار الخرائط"],
                ["show_services", "إظهار الخدمات"],
                ["show_volunteering", "إظهار التطوّع"],
              ] as [FlagKey, string][]).map(([k, label]) => (
                <Switch key={k} label={label} checked={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} />
              ))}
            </div>
          </Card>
          <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "جاري الحفظ…" : "حفظ الإعدادات"}</Button>
        </div>
      )}

      {tab === "sponsorship" && (
        <div className="mt-4 space-y-4">
          <Card>
            <h2 className="mb-3 text-lg font-bold text-primary">الكفالات</h2>
            <div className="space-y-3">
              <Switch
                label="تفعيل المدفوعات النقدية"
                checked={form.sponsorship_payments_enabled}
                onChange={(v) => setForm({ ...form, sponsorship_payments_enabled: v })}
              />
              <Switch
                label="توثيق GPS عند التسليم"
                checked={form.sponsorship_gps_documentation}
                onChange={(v) => setForm({ ...form, sponsorship_gps_documentation: v })}
              />
              <label className="block text-sm font-medium text-primary">
                سياسة بيانات المتبرّع
                <select
                  className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2"
                  value={form.sponsorship_collect_donor_data}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sponsorship_collect_donor_data: e.target.value as DonorDataPolicy,
                    })
                  }
                >
                  <option value="none">بدون بيانات</option>
                  <option value="name_optional">اسم اختياري</option>
                  <option value="full">بيانات كاملة</option>
                </select>
              </label>
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-bold text-primary">أدوار مسموح بدخولها</h2>
            <div className="space-y-2">
              {ROLE_LABELS.map(({ key, label }) => (
                <Switch
                  key={key}
                  label={label}
                  checked={Boolean(form.roles_can_login?.[key])}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      roles_can_login: { ...form.roles_can_login, [key]: v },
                    })
                  }
                />
              ))}
            </div>
          </Card>
          <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "جاري الحفظ…" : "حفظ الإعدادات"}</Button>
        </div>
      )}

      {tab === "pages" && (
        <Card className="mt-4">
          {pages.length === 0 && <EmptyState title="لا توجد صفحات" />}
          <ul className="space-y-3">
            {pages.map((p) => (
              <li key={p.slug} className="rounded-lg border border-surface-border p-3">
                {edit?.slug === p.slug ? (
                  <div className="space-y-2">
                    <Input label="العنوان" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                    <Textarea label="النص" rows={6} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                    <Checkbox label="منشورة" checked={edit.is_published} onChange={(e) => setEdit({ ...edit, is_published: e.target.checked })} />
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => void savePage()}>حفظ</Button>
                      <Button type="button" variant="secondary" onClick={() => setEdit(null)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-primary">{p.title}</div>
                      <div className="text-xs text-brand-gray">{p.is_published ? "منشورة" : "مسودة"}</div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setEdit(p)}>تحرير</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AdminShell>
  );
}
