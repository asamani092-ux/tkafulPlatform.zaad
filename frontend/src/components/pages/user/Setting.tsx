import { useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

export default function UserSettings() {
  const { success, error } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const data = await res.json();
      if (!res.ok) { error({ title: "تعذّر التحديث", description: Array.isArray(data.detail) ? data.detail.join(" • ") : data.detail || "حاول مرة أخرى" }); }
      else { success({ title: "تم تحديث كلمة المرور بنجاح" }); setNewPassword(""); setConfirm(""); }
    } catch { error({ title: "خطأ في الاتصال" }); }
    setSubmitting(false);
  };

  return (
    <UserShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">الإعدادات</h1>
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
