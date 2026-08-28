import { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { passwordErrorsToAr } from "../../../utils/passwordErrors";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { EVENT_AR } from "../../../admin/notifications";

interface Pref {
  event_type: string;
  enabled: boolean;
}

export default function UserSettings() {
  const { success, error } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [prefs, setPrefs] = useState<Pref[]>([]);

  useEffect(() => {
    authFetch("/api/notifications/preferences/")
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => setPrefs(data.results || []))
      .catch(() => {});
  }, []);

  const togglePref = async (event_type: string, enabled: boolean) => {
    setPrefs((prev) => prev.map((p) => (p.event_type === event_type ? { ...p, enabled } : p)));
    const res = await authFetch("/api/notifications/preferences/", {
      method: "PUT",
      body: JSON.stringify({ event_type, enabled }),
    });
    if (!res.ok) {
      setPrefs((prev) => prev.map((p) => (p.event_type === event_type ? { ...p, enabled: !enabled } : p)));
      error({ title: "تعذّر حفظ التفضيل" });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { error({ title: "كلمة المرور قصيرة", description: "8 أحرف على الأقل" }); return; }
    if (newPassword !== confirm) { error({ title: "غير متطابقة", description: "تأكيد كلمة المرور لا يطابق" }); return; }
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/accounts/change-password/`, {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        error({
          title: "تعذّر التحديث",
          description: passwordErrorsToAr(
            (data as { detail?: unknown; new_password?: unknown }).detail
              ?? (data as { new_password?: unknown }).new_password
              ?? data,
          ),
        });
      }
      else { success({ title: "تم تحديث كلمة المرور بنجاح" }); setNewPassword(""); setConfirm(""); }
    } catch { error({ title: "خطأ في الاتصال" }); }
    setSubmitting(false);
  };

  return (
    <UserShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">الإعدادات</h1>
      <Card className="mb-4">
        <h2 className="mb-4 text-lg font-bold text-primary">تفضيلات الإشعارات</h2>
        <p className="mb-3 text-sm text-brand-gray">عطّل الفئة لكتم إشعاراتها داخل المنصّة.</p>
        <ul className="space-y-2">
          {prefs.map((p) => (
            <li key={p.event_type}>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-surface-border p-3">
                <span className="font-bold text-primary">{EVENT_AR[p.event_type] || p.event_type}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--tmkeen-primary)]"
                  checked={p.enabled}
                  onChange={(e) => void togglePref(p.event_type, e.target.checked)}
                />
              </label>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold text-primary">تغيير كلمة المرور</h2>
        <form onSubmit={submit} className="max-w-md space-y-4">
          <Input type="password" label="كلمة المرور الجديدة" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <Input type="password" label="تأكيد كلمة المرور" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <Button type="submit" disabled={submitting}>{submitting ? "جاري الحفظ…" : "تحديث كلمة المرور"}</Button>
        </form>
      </Card>
    </UserShell>
  );
}
