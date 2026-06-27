import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HandHeart } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import Card from '../../ui/Card';
import Input from '../../forms/Input';
import Button from '../../ui/Button';
import { API_BASE_URL } from '../../../config';

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'البريد الإلكتروني مطلوب';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'يرجى إدخال بريد إلكتروني صحيح';

    if (!formData.password) newErrors.password = 'كلمة السر مطلوبة';
    else if (formData.password.length < 6)
      newErrors.password = 'كلمة السر يجب أن تكون 6 أحرف على الأقل';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Step 1: Get JWT tokens
      const res = await fetch(`${API_BASE_URL}/api/accounts/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as any).detail || 'البريد الإلكتروني أو كلمة السر غير صحيحة';
        setErrors({ form: msg });
        setIsSubmitting(false);
        return;
      }

      const tokenData = await res.json();

      // Step 2: Fetch user profile data
      const profileRes = await fetch(`${API_BASE_URL}/api/accounts/me/`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access}`
        }
      });

      if (!profileRes.ok) {
        setErrors({ form: 'فشل في تحميل بيانات المستخدم' });
        setIsSubmitting(false);
        return;
      }

      const userData = await profileRes.json();

      // Step 3: Create user object for AuthContext
      const user = {
        name: userData.profile?.name || userData.username,
        email: userData.email,
        role: userData.profile?.role || 'user'
      };

      // Step 4: Save to AuthContext
      login(user, tokenData.access, tokenData.refresh);

      // Step 5: Redirect based on role
      if (user.role === 'admin') {
        navigate('/Admin');
      } else {
        navigate('/');
      }

    } catch (err) {
      console.error(err);
      setErrors({
        form: 'حدث خطأ غير متوقع، حاول مرة أخرى.',
      });
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <header className="relative isolate text-white bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 pb-8 md:pb-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,.18), transparent 60%)',
          }}
        />
        <div className="max-w-6xl mx-auto px-4 pt-12 md:pt-16">
          <div className="text-center animate-slideUp motion-reduce:animate-none">
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium ring-1 ring-inset ring-white/20 mb-4">
              <span>أهلاً بعودتك</span>
              <HandHeart size={20} style={{ color: '#DFC775' }} aria-hidden="true" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
              نورتنا من جديد ✨
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-white/85 md:text-lg leading-relaxed">
              سجل دخولك وأكمل رحلتك في صناعة الأثر. نحن سعداء بوجودك معنا!
            </p>
          </div>
        </div>

        <div className="absolute -bottom-px left-0 right-0 h-10" aria-hidden>
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{ transform: 'scaleY(-1)' }}
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              opacity=".25"
              fill="#f7f7f7"
            />
            <path
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
              opacity=".5"
              fill="#f7f7f7"
            />
            <path
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
              fill="#fffcfcff"
            />
          </svg>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-10 md:mt-12 px-4 mb-12">
        <Card className="rounded-3xl shadow-soft p-6 md:p-8 border border-gray-100 relative animate-fadeIn motion-reduce:animate-none">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <Input
              type="email"
              label="البريد الإلكتروني"
              placeholder="ادخل بريدك الإلكتروني"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              required
            />

            <Input
              type="password"
              label="كلمة السر"
              placeholder="ادخل كلمة السر"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={errors.password}
              required
            />

            <div className="flex w-full items-center">
              <label
                htmlFor="rememberMe"
                className="ml-auto flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-brand-700 transition-colors select-none"
              >
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  className="h-5 w-5 appearance-none rounded-md border border-gray-300 bg-white
                            checked:bg-[#DFC775] checked:border-[#DFC775]
                            focus:ring-2 focus:ring-[#DFC775]/40 focus:ring-offset-1 transition-all duration-150"
                  style={{
                    backgroundImage: formData.rememberMe
                      ? "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"white\" stroke-width=\"3\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 13l4 4L19 7\" /></svg>')"
                      : 'none',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: '70%',
                  }}
                />
                تذكرني
              </label>
            </div>

            {errors.form && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.form}
              </div>
            )}

            <Button
              type="submit"
              variant="outlineGold"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-0.2">
            <p className="text-sm text-gray-600">
              ليس لديك حساب؟{' '}
              <Link
                to="/signup"
                className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                تسجيل جديد ←
              </Link>
            </p>

            <Link
              to="/admin/signin"
              className="font-medium hover:underline transition-colors"
              style={{ color: '#DFC775' }}
            >
              هل أنت مشرف؟ سجّل دخولك من هنا
            </Link>

            <p className="text-xs text-gray-500 pt-2">
              تذكّر: لا تشارك كلمة السر مع أي جهة. نحن هنا لمساعدتك دائمًا 💛
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
