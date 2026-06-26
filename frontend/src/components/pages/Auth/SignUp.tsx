import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus2, CalendarDays, ShieldCheck } from 'lucide-react';
import Card from '../../ui/Card';
import Input from '../../forms/Input';
import Select from '../../forms/Select';
import Chip from '../../ui/Chip';
import TagInput from '../../forms/TagInput';
import Button from '../../ui/Button';
import {
  isValidEmail,
  validatePassword,
  isValidSaudiPhone,
  isValidSaudiNationalId,
} from '../../../utils/validation';
import { API_BASE_URL } from '../../../config';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    region: '',
    city: '',
    educationLevel: '',
    availableDays: [] as string[],
    skills: [] as string[],
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const educationOptions = [
    { value: 'bachelor', label: 'بكالوريوس' },
    { value: 'diploma', label: 'دبلوم' },
    { value: 'highschool', label: 'ثانوي' },
    { value: 'middle', label: 'متوسط' },
    { value: 'elementary', label: 'ابتدائي' },
  ];
  const dayOptions = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
 
 //تعديل لحل مشكلة الرقم ورقم الهوية
  const digitsOnly = (value: string) => value.replace(/\D/g, '');
  // Keep only digits for numeric fields
const cleanNationalId = (value: string) => digitsOnly(value).slice(0, 10); // max 10 digits
const cleanPhone = (value: string) => digitsOnly(value).slice(0, 9);       // max 9 digits (5XXXXXXXX)


  const validateForm = () => {
    const newErrors: Record<string, string> = {};
  
    
    const nationalDigits = digitsOnly(formData.nationalId);
    if (!nationalDigits) {
      newErrors.nationalId = 'رقم الهوية مطلوب';
    } else if (!isValidSaudiNationalId(nationalDigits)) {
      newErrors.nationalId = 'رقم الهوية يجب أن يكون 10 أرقام صحيحة';
    }
  
    
    if (!formData.email) newErrors.email = 'البريد الإلكتروني مطلوب';
    else if (!isValidEmail(formData.email))
      newErrors.email = 'يرجى إدخال بريد إلكتروني صحيح';
  
    
    const phoneDigits = digitsOnly(formData.phone);
    if (!phoneDigits) {
      newErrors.phone = 'رقم الجوال مطلوب';
    } else if (!isValidSaudiPhone(phoneDigits)) {
      newErrors.phone = 'رقم الجوال يجب أن يبدأ بـ 5 ويحتوي على 9 أرقام';
    }
  
    if (!formData.password) newErrors.password = 'كلمة السر مطلوبة';
    else {
      const pv = validatePassword(formData.password);
      if (!pv.isValid) newErrors.password = pv.error || 'كلمة السر غير صحيحة';
    }
// انتهى التعديل
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'كلمة السر غير متطابقة';

    if (!formData.age) newErrors.age = 'العمر مطلوب';
    else if (parseInt(formData.age) < 18 || parseInt(formData.age) > 65)
      newErrors.age = 'العمر يجب أن يكون بين 18 و 65';

    if (!formData.gender) newErrors.gender = 'الجنس مطلوب';
    if (!formData.region) newErrors.region = 'المنطقة مطلوبة';
    if (!formData.city) newErrors.city = 'المدينة مطلوبة';
    if (!formData.educationLevel) newErrors.educationLevel = 'المستوى التعليمي مطلوب';
    if (formData.availableDays.length === 0)
      newErrors.availableDays = 'يرجى اختيار يوم واحد على الأقل';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'يجب الموافقة على الشروط والأحكام';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
  
    setIsSubmitting(true);
  
    try {
      const payload = {
        // USER
        email: formData.email.trim(),
        password: formData.password,
      
        // PROFILE (must match RegisterSerializer EXACTLY)
        name: formData.fullName,
        gender: formData.gender,
        age: Number(formData.age),
        city: formData.city,
        phone: formData.phone.replace(/\D/g, ""),
        qualification: formData.educationLevel,
        available_days: formData.availableDays,
        skills: formData.skills,
      };
      
  
      const res = await fetch(`${API_BASE_URL}/api/accounts/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
  
      const data = await res.json();

      if (!res.ok) {
        alert(JSON.stringify(data, null, 2));
        setIsSubmitting(false);
        return;
      }

      alert("تم إنشاء الحساب بنجاح! سيتم توجيهك لتسجيل الدخول.");

      // Redirect to signin page after successful registration
      setTimeout(() => {
        navigate('/signin');
      }, 1000);

    } catch (err: any) {
      console.error("Registration error:", err);
      alert(err.message || "حدث خطأ أثناء إنشاء الحساب");
      setIsSubmitting(false);
    }
  };
  
  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleDayToggle = (day: string) => {
    const newDays = formData.availableDays.includes(day)
      ? formData.availableDays.filter((d) => d !== day)
      : [...formData.availableDays, day];
    handleInputChange('availableDays', newDays);
  };

  const formatNationalId = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + '*'.repeat(Math.min(digits.length - 2, 6)) + digits.slice(-2);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 1) return `+966 ${digits}`;
    if (digits.length <= 4) return `+966 ${digits.slice(1)}`;
    if (digits.length <= 7) return `+966 ${digits.slice(1, 4)} ${digits.slice(4)}`;
    return `+966 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="relative isolate text-white bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,.18), transparent 60%)',
          }}
        />
        <div className="max-w-6xl mx-auto px-4 pt-12 md:pt-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium ring-1 ring-inset ring-white/20 mb-4">
              <span>أهلاً بانضمامك</span>
              <UserPlus2 size={20} className="text-[#DFC775]" aria-hidden="true" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
              انضم إلينا ✨
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-white/85 md:text-lg leading-relaxed">
              سجّل البيانات التالية لتكون جزءًا من صناعة الأثر.
            </p>
          </div>
        </div>
        {/* الموجة */}
        <div className="absolute -bottom-px left-0 right-0 h-10" aria-hidden>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform: 'scaleY(-1)' }}>
            <path opacity=".25" fill="#f7f7f7" d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" />
            <path opacity=".5" fill="#f7f7f7" d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" />
            <path fill="#fffcfcff" d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" />
          </svg>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto mt-8 md:mt-12 mb-8 px-4">
        <Card className="rounded-3xl shadow-soft p-6 md:p-8 border border-gray-100 animate-fadeIn">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">تسجيل متطوع جديد</h2>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="الاسم كامل" placeholder="الاسم كامل" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} error={errors.fullName} required />
              {/* FIX: Remove masking + keep original style + allow normal typing/pasting */}
              <Input label="رقم الهوية" placeholder="11******" value={formData.nationalId} onChange={(e) => handleInputChange('nationalId', e.target.value.replace(/\D/g, '').slice(0,10))} error={errors.nationalId} required />


              {/* LTR للحقلين لسهولة الإدخال */}
              <Input type="email" label="البريد الإلكتروني" placeholder="example@mail.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} error={errors.email} inputProps={{ dir: 'ltr', autoComplete: 'email' }} required />
              {/* FIX: Remove auto-formatting that changed numbers + allow clean digits only */}
              <Input label="رقم الجوال" placeholder="+966 5X XXX XX" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(-9))} error={errors.phone} inputProps={{ dir: 'ltr', inputMode: 'tel' }} required />


              <Input type="password" label="كلمة السر" placeholder="••••••••" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} error={errors.password} required />
              <Input type="password" label="تأكيد كلمة السر" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} error={errors.confirmPassword} required />

              <Input type="number" label="العمر" placeholder="العمر" value={formData.age} onChange={(e) => handleInputChange('age', e.target.value)} error={errors.age} inputProps={{ min: 18, max: 65 }} required />

              {/* الجنس */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <span>الجنس</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['ذكر', 'أنثى'].map((gender) => (
                    <Chip key={gender} selected={formData.gender === gender} onClick={() => handleInputChange('gender', gender)}>
                      {gender}
                    </Chip>
                  ))}
                </div>
                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
              </div>

              <Input label="المنطقة" placeholder="المنطقة" value={formData.region} onChange={(e) => handleInputChange('region', e.target.value)} error={errors.region} required />
              <Input label="المدينة" placeholder="المدينة" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} error={errors.city} required />
              <Select label="المستوى التعليمي" placeholder="اختر المستوى التعليمي" options={educationOptions} value={formData.educationLevel} onChange={(e) => handleInputChange('educationLevel', e.target.value)} error={errors.educationLevel} required />
            </div>

            {/* الأيام المتاحة */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <CalendarDays size={18} className="text-[#DFC775]" aria-hidden="true" />
                <span>
                  الأيام المتاحة <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((day) => (
                  <Chip key={day} selected={formData.availableDays.includes(day)} onClick={() => handleDayToggle(day)}>
                    {day}
                  </Chip>
                ))}
              </div>
              {errors.availableDays && <p className="mt-1 text-sm text-red-600">{errors.availableDays}</p>}
            </div>

            {/* المهارات (ألوان باستيل داخل الحقل) */}
           <TagInput
            label="المهارات"
            tags={formData.skills}
            onTagsChange={(skills) => handleInputChange('skills', skills)}
            placeholder="اضغط Enter لإضافة مهارة"
            getTagClassName={(tag, i) => {
              const pastel = [
                'bg-[#FDE2E4] text-gray-800', // وردي فاتح
                'bg-[#E2ECE9] text-gray-800', // أخضر باهت
                'bg-[#FFF1E6] text-gray-800', // خوخي فاتح
                'bg-[#DDEBF8] text-gray-800', // أزرق فاتح
                'bg-[#F0E6FA] text-gray-800', // بنفسجي باهت
                'bg-[#E7F8E9] text-gray-800', // أخضر فاتح جداً
                'bg-[#FFF7D6] text-gray-800', // أصفر باستيل
                'bg-[#FFE5EC] text-gray-800', // زهري ناعم
                'bg-[#E5F4FF] text-gray-800', // سماوي
                'bg-[#FCEFE3] text-gray-800', // برتقالي كريمي
                'bg-[#E8EAF6] text-gray-800', // أزرق بنفسجي
                'bg-[#E3FCEC] text-gray-800', // نعناعي
                'bg-[#FFF0F6] text-gray-800', // وردي بارد
                'bg-[#F5F0FF] text-gray-800', // بنفسجي فاتح جداً
                'bg-[#EAF4F4] text-gray-800', // فيروزي خفيف
                'bg-[#FFF8E7] text-gray-800', // عاجي
                'bg-[#E7EBFF] text-gray-800', // أزرق بنفسجي ناعم
                'bg-[#E6FFF7] text-gray-800', // أخضر مائي
                'bg-[#FAE3E3] text-gray-800', // وردي باهت
                'bg-[#FFF4E6] text-gray-800', // برتقالي فاتح جداً
              ];
              return pastel[i % pastel.length];
            }}
          />
            {/* الشروط */}
            <div className="flex w-full items-start justify-end">
              <label htmlFor="agreeToTerms" className="ml-auto flex flex-row-reverse items-start gap-2 cursor-pointer text-sm text-gray-700 hover:text-brand-700 select-none">
                <span className="flex items-center gap-1">
                  أوافق على الشروط والأحكام لمنصة تكافل.
                  <span className="text-red-500">*</span>
                </span>
                <span className="inline-flex items-center justify-center">
                  <ShieldCheck size={18} className="text-[#DFC775]" aria-hidden="true" />
                </span>
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  className="h-5 w-5 appearance-none rounded-md border border-gray-300 bg-white
                             checked:bg-[#DFC775] checked:border-[#DFC775]
                             focus:ring-2 focus:ring-[#DFC775]/40 focus:ring-offset-1 transition-all duration-150"
                  style={{
                    backgroundImage: formData.agreeToTerms
                      ? "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"white\" stroke-width=\"3\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 13l4 4L19 7\" /></svg>')"
                      : 'none',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: '70%',
                  }}
                />
              </label>
            </div>
            {errors.agreeToTerms && <p className="text-sm text-red-600">{errors.agreeToTerms}</p>}

            {/* زر الإنشاء */}
            <div className="flex justify-center">
              <Button type="submit" variant="outlineGold" className="w-full md:w-auto" disabled={isSubmitting}>
                {isSubmitting ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link to="/signin" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
                تسجيل الدخول ←
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
