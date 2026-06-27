import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../config";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import HeroBand from "../../ui/HeroBand";

export default function AdminSignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.email) e.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "يرجى إدخال بريد إلكتروني صحيح";
    if (!formData.password) e.password = "كلمة السر مطلوبة";
    else if (formData.password.length < 6) e.password = "كلمة السر يجب أن تكون 6 أحرف على الأقل";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(`${API_BASE_URL}/api/accounts/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.email, password: formData.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ form: (data as { detail?: string }).detail || "فشل تسجيل الدخول، تأكد من البيانات" });
        setIsSubmitting(false);
        return;
      }
      const tokenData = await res.json();
      const userRes = await fetch(`${API_BASE_URL}/api/accounts/me/`, {
        headers: { Authorization: `Bearer ${tokenData.access}` },
      });
      if (!userRes.ok) {
        setErrors({ form: "فشل في جلب بيانات المستخدم" });
        setIsSubmitting(false);
        return;
      }
      const userData = await userRes.json();
      if (userData.profile?.role !== "admin") {
        setErrors({ form: "غير مصرح لك بالدخول كمشرف" });
        setIsSubmitting(false);
        return;
      }
      login({ name: userData.profile?.name || userData.email, email: userData.email, role: "admin" }, tokenData.access, tokenData.refresh);
      navigate("/Admin");
    } catch {
      setErrors({ form: "حدث خطأ غير متوقع، حاول مرة أخرى." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <HeroBand title="أهلاً بعودتك إلى لوحة التحكم" subtitle="بوجودك تكتمل المنظومة ونمضي نحو التمكين." />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <h2 className="mb-6 text-center text-2xl font-bold text-primary">تسجيل دخول المشرف</h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input type="email" dir="ltr" label="البريد الإلكتروني" placeholder="admin@takaful.com"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={errors.email} required />
            <Input type="password" label="كلمة السر" placeholder="••••••••"
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} error={errors.password} required />
            {errors.form && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--tmkeen-danger-bg)", color: "var(--tmkeen-danger)" }}>
                {errors.form}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "جاري تسجيل الدخول..." : "تسجيل دخول المشرف"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-brand-gray">
            <p>لست مشرفًا؟ <Link to="/signin" className="font-semibold text-primary">تسجيل دخول عادي</Link></p>
          </div>
        </Card>
      </main>
    </div>
  );
}
