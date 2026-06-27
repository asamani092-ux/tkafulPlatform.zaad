import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { isValidEmail, validatePassword, isValidSaudiPhone, isValidSaudiNationalId } from "../../../utils/validation";
import { API_BASE_URL } from "../../../config";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import HeroBand from "../../ui/HeroBand";

const educationOptions = [
  { value: "bachelor", label: "بكالوريوس" },
  { value: "diploma", label: "دبلوم" },
  { value: "highschool", label: "ثانوي" },
  { value: "middle", label: "متوسط" },
  { value: "elementary", label: "ابتدائي" },
];
const dayOptions = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors"
      style={{
        borderColor: selected ? "var(--tmkeen-primary)" : "var(--tmkeen-surface-border)",
        background: selected ? "var(--tmkeen-primary)" : "var(--tmkeen-surface)",
        color: selected ? "#fff" : "var(--tmkeen-brand-gray)",
      }}
    >
      {children}
    </button>
  );
}

export default function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error } = useToast();
  const [skillInput, setSkillInput] = useState("");
  const [formData, setFormData] = useState({
    fullName: "", nationalId: "", email: "", phone: "", password: "", confirmPassword: "",
    age: "", gender: "", region: "", city: "", educationLevel: "",
    availableDays: [] as string[], skills: [] as string[], agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const digitsOnly = (v: string) => v.replace(/\D/g, "");

  const set = (field: string, value: string | boolean | string[]) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    const nid = digitsOnly(formData.nationalId);
    if (!nid) e.nationalId = "رقم الهوية مطلوب";
    else if (!isValidSaudiNationalId(nid)) e.nationalId = "رقم الهوية يجب أن يكون 10 أرقام صحيحة";
    if (!formData.email) e.email = "البريد الإلكتروني مطلوب";
    else if (!isValidEmail(formData.email)) e.email = "يرجى إدخال بريد إلكتروني صحيح";
    const phone = digitsOnly(formData.phone);
    if (!phone) e.phone = "رقم الجوال مطلوب";
    else if (!isValidSaudiPhone(phone)) e.phone = "رقم الجوال يجب أن يبدأ بـ 5 ويحتوي على 9 أرقام";
    if (!formData.password) e.password = "كلمة السر مطلوبة";
    else { const pv = validatePassword(formData.password); if (!pv.isValid) e.password = pv.error || "كلمة السر غير صحيحة"; }
    if (formData.password !== formData.confirmPassword) e.confirmPassword = "كلمة السر غير متطابقة";
    if (!formData.age) e.age = "العمر مطلوب";
    else if (parseInt(formData.age) < 18 || parseInt(formData.age) > 65) e.age = "العمر يجب أن يكون بين 18 و 65";
    if (!formData.gender) e.gender = "الجنس مطلوب";
    if (!formData.region) e.region = "المنطقة مطلوبة";
    if (!formData.city) e.city = "المدينة مطلوبة";
    if (!formData.educationLevel) e.educationLevel = "المستوى التعليمي مطلوب";
    if (formData.availableDays.length === 0) e.availableDays = "يرجى اختيار يوم واحد على الأقل";
    if (!formData.agreeToTerms) e.agreeToTerms = "يجب الموافقة على الشروط والأحكام";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        name: formData.fullName,
        gender: formData.gender,
        age: Number(formData.age),
        city: formData.city,
        phone: digitsOnly(formData.phone),
        qualification: formData.educationLevel,
        available_days: formData.availableDays,
        skills: formData.skills,
      };
      const res = await fetch(`${API_BASE_URL}/api/accounts/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        error({ title: "تعذّر إنشاء الحساب", description: typeof data === "object" ? Object.values(data).flat().join(" • ") : "حاول مرة أخرى" });
        setIsSubmitting(false);
        return;
      }
      // تسجيل دخول تلقائي إن رجع توكن، وإلا التوجيه لصفحة الدخول
      if (data.access && data.refresh) {
        login({ name: payload.name, email: payload.email, role: data.user?.profile?.role || "user" }, data.access, data.refresh);
        success({ title: "تم إنشاء الحساب بنجاح", description: "مرحبًا بك في منصة تكافل." });
        navigate("/");
      } else {
        success({ title: "تم إنشاء الحساب بنجاح", description: "سيتم توجيهك لتسجيل الدخول." });
        setTimeout(() => navigate("/signin"), 800);
      }
    } catch {
      error({ title: "حدث خطأ", description: "تعذّر إنشاء الحساب، حاول لاحقًا." });
      setIsSubmitting(false);
    }
  };

  const toggleDay = (d: string) => {
    set("availableDays", formData.availableDays.includes(d) ? formData.availableDays.filter((x) => x !== d) : [...formData.availableDays, d]);
  };
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !formData.skills.includes(s)) set("skills", [...formData.skills, s]);
    setSkillInput("");
  };

  return (
    <div>
      <HeroBand title="انضم إلينا" subtitle="سجّل البيانات التالية لتكون جزءًا من صناعة الأثر." />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Card>
          <h2 className="mb-6 text-center text-2xl font-bold text-primary">تسجيل متطوع جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="الاسم كامل" value={formData.fullName} onChange={(e) => set("fullName", e.target.value)} error={errors.fullName} />
              <Input label="رقم الهوية" placeholder="10 أرقام" value={formData.nationalId} onChange={(e) => set("nationalId", digitsOnly(e.target.value).slice(0, 10))} error={errors.nationalId} />
              <Input type="email" dir="ltr" label="البريد الإلكتروني" placeholder="example@mail.com" value={formData.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
              <Input dir="ltr" inputMode="tel" label="رقم الجوال" placeholder="5XXXXXXXX" value={formData.phone} onChange={(e) => set("phone", digitsOnly(e.target.value).slice(-9))} error={errors.phone} />
              <Input type="password" label="كلمة السر" placeholder="••••••••" value={formData.password} onChange={(e) => set("password", e.target.value)} error={errors.password} />
              <Input type="password" label="تأكيد كلمة السر" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} error={errors.confirmPassword} />
              <Input type="number" label="العمر" value={formData.age} onChange={(e) => set("age", e.target.value)} error={errors.age} min={18} max={65} />
              <div>
                <label className="label-field">الجنس</label>
                <div className="flex gap-2">
                  {["ذكر", "أنثى"].map((g) => <Chip key={g} selected={formData.gender === g} onClick={() => set("gender", g)}>{g}</Chip>)}
                </div>
                {errors.gender && <p style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{errors.gender}</p>}
              </div>
              <Input label="المنطقة" value={formData.region} onChange={(e) => set("region", e.target.value)} error={errors.region} />
              <Input label="المدينة" value={formData.city} onChange={(e) => set("city", e.target.value)} error={errors.city} />
              <Select label="المستوى التعليمي" value={formData.educationLevel} onChange={(e) => set("educationLevel", e.target.value)} error={errors.educationLevel}>
                <option value="">اختر المستوى التعليمي</option>
                {educationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>

            <div>
              <label className="label-field">الأيام المتاحة</label>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((d) => <Chip key={d} selected={formData.availableDays.includes(d)} onClick={() => toggleDay(d)}>{d}</Chip>)}
              </div>
              {errors.availableDays && <p style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{errors.availableDays}</p>}
            </div>

            <div>
              <label className="label-field">المهارات</label>
              <div className="flex gap-2">
                <input className="input-field" placeholder="اكتب مهارة ثم أضف" value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
                <Button type="button" variant="secondary" onClick={addSkill}>إضافة</Button>
              </div>
              {formData.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.skills.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}
                </div>
              )}
            </div>

            <label className="flex items-center justify-end gap-2 text-sm text-brand-gray">
              <span>أوافق على الشروط والأحكام لمنصة تكافل.</span>
              <input type="checkbox" checked={formData.agreeToTerms} onChange={(e) => set("agreeToTerms", e.target.checked)} />
            </label>
            {errors.agreeToTerms && <p style={{ color: "var(--tmkeen-danger)", fontSize: "0.8rem" }}>{errors.agreeToTerms}</p>}

            <div className="flex justify-center">
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
              </Button>
            </div>
          </form>
          <p className="mt-4 text-center text-sm text-brand-gray">
            لديك حساب بالفعل؟ <Link to="/signin" className="font-semibold text-primary">تسجيل الدخول</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
