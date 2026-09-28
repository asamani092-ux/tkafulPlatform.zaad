import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { API_BASE_URL } from "../../../config";

/** طلب إعادة تعيين كلمة المرور عبر البريد. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("أدخل بريداً إلكترونياً صالحاً");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/accounts/auth/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (typeof data.email === "string" && data.email) ||
            (Array.isArray(data.email) && data.email[0]) ||
            data.detail ||
            "تعذّر إرسال الطلب",
        );
        return;
      }
      setDone(true);
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <div className="mb-4 flex justify-center">
            <img src="/logo.png" alt="جمعية الزاد" style={{ height: 72, width: "auto" }} />
          </div>
          <h2 className="mb-2 text-center text-2xl font-bold text-primary">نسيت كلمة المرور</h2>
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-brand-gray">
                إن وُجد حساب بهذا البريد فستصلك رسالة لإعادة تعيين كلمة المرور.
              </p>
              <Link to="/signin" className="font-semibold text-primary hover:underline">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
              <p className="text-sm text-brand-gray">
                أدخل بريدك وسنرسل رابطاً لتعيين كلمة مرور جديدة.
              </p>
              <Input
                type="email"
                dir="ltr"
                label="البريد الإلكتروني"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                required
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "جاري الإرسال…" : "إرسال رابط إعادة التعيين"}
              </Button>
              <p className="text-center text-sm text-brand-gray">
                <Link to="/signin" className="font-semibold text-primary">
                  العودة لتسجيل الدخول
                </Link>
              </p>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
