import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../config";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

/** يقبل مسارات داخلية آمنة فقط (يبدأ بـ / وليس //) لتفادي التحويل المفتوح. */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  const path = decodeURIComponent(raw);
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return null;
}

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "", otp: "" });
  const [otpRequired, setOtpRequired] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.email) e.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "يرجى إدخال بريد إلكتروني صحيح";
    if (!formData.password) e.password = "كلمة السر مطلوبة";
    else if (formData.password.length < 6) e.password = "كلمة السر يجب أن تكون 6 أحرف على الأقل";
    if (otpRequired && !formData.otp) e.otp = "رمز التحقق مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finishLogin = async (tokenData: { access: string; refresh: string }) => {
    const profileRes = await fetch(`${API_BASE_URL}/api/accounts/me/`, {
      headers: { Authorization: `Bearer ${tokenData.access}` },
    });
    if (!profileRes.ok) {
      setErrors({ form: "فشل في تحميل بيانات المستخدم" });
      setIsSubmitting(false);
      return;
    }
    const userData = await profileRes.json();
    const role = userData.profile?.role || "user";
    login({ name: userData.profile?.name || userData.username, email: userData.email, role }, tokenData.access, tokenData.refresh);
    if (next) {
      navigate(next, { replace: true });
      return;
    }
    if (role === "admin") navigate("/Admin");
    else if (role === "manager" || role === "employee") navigate("/Admin/staff");
    else if (role === "donor" || role === "supplier" || role === "representative") navigate("/projects");
    else if (role === "beneficiary") navigate("/user/main");
    else {
      try {
        const membershipsRes = await fetch(`${API_BASE_URL}/api/platform/my-memberships/`, {
          headers: { Authorization: `Bearer ${tokenData.access}` },
        });
        const memberships = membershipsRes.ok ? (await membershipsRes.json()).memberships || [] : [];
        navigate(memberships.length > 0 ? "/Admin/projects" : "/user/main");
      } catch {
        navigate("/user/main");
      }
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      if (!otpRequired) {
        const res = await fetch(`${API_BASE_URL}/api/accounts/auth/otp/request/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        if (!res.ok) {
          setErrors({ form: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
          setIsSubmitting(false);
          return;
        }
        setOtpRequired(true);
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/accounts/auth/otp/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          otp: formData.otp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ form: data.detail || "رمز التحقق غير صحيح أو منتهٍ" });
        setIsSubmitting(false);
        return;
      }
      const tokenData = await res.json();
      await finishLogin(tokenData);
    } catch {
      setErrors({ form: "حدث خطأ غير متوقع، حاول مرة أخرى." });
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <div className="mb-4 flex justify-center">
            <img src="/logo.png" alt="جمعية الزاد" style={{ height: 72, width: "auto" }} />
          </div>
          <h2 className="mb-6 text-center text-2xl font-bold text-primary">الدخول الموحّد — تكافل وأثر</h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input type="email" dir="ltr" label="البريد الإلكتروني" placeholder="example@mail.com"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={errors.email} required disabled={otpRequired} />
            <Input type="password" label="كلمة السر" placeholder="••••••••"
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} error={errors.password} required disabled={otpRequired} />
            {otpRequired && (
              <Input dir="ltr" label="رمز التحقق المرسل إلى بريدك" placeholder="000000"
                value={formData.otp} onChange={(e) => setFormData({ ...formData, otp: e.target.value })} error={errors.otp} required />
            )}
            {errors.form && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--tmkeen-danger-bg)", color: "var(--tmkeen-danger)" }}>
                {errors.form}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "جاري المعالجة..." : otpRequired ? "تأكيد الرمز وتسجيل الدخول" : "متابعة"}
            </Button>
            {otpRequired && (
              <button
                type="button"
                className="w-full text-sm text-brand-gray hover:underline"
                onClick={() => { setOtpRequired(false); setFormData({ ...formData, otp: "" }); }}
              >
                تعديل البريد أو كلمة المرور
              </button>
            )}
          </form>
          <div className="mt-4 space-y-1 text-center text-sm text-brand-gray">
            <p>ليس لديك حساب؟ <Link to="/signup" className="font-semibold text-primary">تسجيل جديد</Link></p>
          </div>
        </Card>
      </main>
    </div>
  );
}
