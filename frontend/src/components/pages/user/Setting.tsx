import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, KeyRound, UserRound } from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { passwordErrorsToAr } from "../../../utils/passwordErrors";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";

/**
 * إعدادات الحساب: تغيير كلمة المرور فقط.
 * تعديل البيانات الشخصية في /user/personal-info (معلوماتي) لتفادي التكرار.
 */
export default function UserSettings() {
  const { success, error } = useToast();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const closePassword = () => {
    setPasswordOpen(false);
    setNewPassword("");
    setConfirm("");
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      error({ title: "كلمة المرور قصيرة", description: "8 أحرف على الأقل" });
      return;
    }
    if (newPassword !== confirm) {
      error({ title: "غير متطابقة", description: "تأكيد كلمة المرور لا يطابق" });
      return;
    }
    setPasswordSubmitting(true);
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
      } else {
        success({ title: "تم تحديث كلمة المرور بنجاح" });
        closePassword();
      }
    } catch {
      error({ title: "خطأ في الاتصال" });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <UserShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">الإعدادات</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link to="/user/personal-info" className="block">
          <Card className="h-full transition hover:border-primary/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                  <UserRound size={22} aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-primary">المعلومات الشخصية</h2>
                  <p className="mt-1 text-sm text-brand-gray">عرض وتعديل بيانات الملف من صفحة معلوماتي</p>
                </div>
              </div>
              <ChevronLeft className="shrink-0 text-brand-gray" size={20} aria-hidden />
            </div>
          </Card>
        </Link>

        <Card
          className="cursor-pointer transition hover:border-primary/40"
          role="button"
          tabIndex={0}
          onClick={() => setPasswordOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setPasswordOpen(true);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                <KeyRound size={22} aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-primary">تغيير كلمة المرور</h2>
                <p className="mt-1 text-sm text-brand-gray">تعيين كلمة مرور جديدة لحسابك</p>
              </div>
            </div>
            <ChevronLeft className="shrink-0 text-brand-gray" size={20} aria-hidden />
          </div>
        </Card>
      </div>

      <Modal open={passwordOpen} onClose={closePassword} title="تغيير كلمة المرور">
        <form onSubmit={submitPassword} className="space-y-4">
          <Input
            type="password"
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            label="تأكيد كلمة المرور"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closePassword}>
              إلغاء
            </Button>
            <Button type="submit" disabled={passwordSubmitting}>
              {passwordSubmitting ? "جاري الحفظ…" : "تحديث كلمة المرور"}
            </Button>
          </div>
        </form>
      </Modal>
    </UserShell>
  );
}
