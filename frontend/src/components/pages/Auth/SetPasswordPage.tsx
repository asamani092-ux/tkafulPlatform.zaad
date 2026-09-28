import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { API_BASE_URL } from "../../../config";

/** صفحة عامة لتعيين كلمة المرور من دعوة البريد. */
export default function SetPasswordPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/accounts/auth/invite/${encodeURIComponent(token)}/`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail || "الرابط غير صالح أو منتهٍ");
          return;
        }
        setEmail(data.email || "");
        setName(data.name || "");
      } catch {
        setError("تعذّر التحقق من الرابط");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== password2) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/accounts/auth/invite/${encodeURIComponent(token)}/accept/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const pwd = data.password;
        setError(Array.isArray(pwd) ? pwd.join(" ") : data.detail || "تعذّر تعيين كلمة المرور");
        return;
      }
      setDone(true);
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState title="جاري التحقق من الدعوة…" />;
  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16" dir="rtl">
        <Card>
          <h1 className="mb-2 text-xl font-extrabold text-primary">تم تعيين كلمة المرور</h1>
          <p className="mb-4 text-sm text-brand-gray">يمكنك الآن تسجيل الدخول بحسابك.</p>
          <Link to="/signin" className="font-bold text-primary hover:underline">
            الانتقال لتسجيل الدخول
          </Link>
        </Card>
      </div>
    );
  }
  if (error && !email) {
    return (
      <div className="mx-auto max-w-md px-4 py-16" dir="rtl">
        <ErrorState title="دعوة غير صالحة" message={error} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16" dir="rtl">
      <Card>
        <h1 className="mb-1 text-xl font-extrabold text-primary">تعيين / إعادة كلمة المرور</h1>
        <p className="mb-4 text-sm text-brand-gray">
          {name || "مرحباً"} · {email}
        </p>
        <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <Input
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
          <Input
            label="تأكيد كلمة المرور"
            type="password"
            value={password2}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword2(e.target.value)}
            required
          />
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "جاري الحفظ…" : "حفظ ودخول"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
