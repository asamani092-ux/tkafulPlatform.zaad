import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import CustomDropdown from '../ui/CustomDropdown';
import { API_BASE_URL } from '../../config';

interface FormErrors {
  applicantName?: string;
  mobileNumber?: string;
  applicantRole?: string;
  mosqueName?: string;
  neighborhood?: string;
  locationLink?: string;
  worshippersCount?: string;
  donorExists?: string;
  donorName?: string;
  donorPhone?: string;
}

interface FormData {
  applicantName: string;
  mobileNumber: string;
  applicantRole: string;
  mosqueName: string;
  neighborhood: string;
  locationLink: string;
  worshippersCount: string;
  donorExists: string;
  donorName: string;
  donorPhone: string;
}

export default function WaterSupplyRequestPage() {
  const { success } = useToast();
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    mobileNumber: '',
    applicantRole: '',
    mosqueName: '',
    neighborhood: '',
    locationLink: '',
    worshippersCount: '',
    donorExists: '',
    donorName: '',
    donorPhone: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // If donorExists changes to "لا", clear donor fields
    if (name === 'donorExists' && value === 'لا') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        donorName: '',
        donorPhone: '',
      }));
      setErrors((prev) => ({
        ...prev,
        donorName: undefined,
        donorPhone: undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user starts typing
    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    if (!formData.applicantName.trim()) {
      newErrors.applicantName = 'اسم مقدم الطلب مطلوب';
    }

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'رقم الجوال مطلوب';
    } else if (!/^\d{9}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'يجب أن يكون رقم الجوال 9 أرقام فقط (بدون +966)';
    }

    if (!formData.applicantRole) {
      newErrors.applicantRole = 'الرجاء اختيار صفة مقدم الطلب';
    }

    if (!formData.mosqueName.trim()) {
      newErrors.mosqueName = 'اسم المسجد مطلوب';
    }

    if (!formData.neighborhood.trim()) {
      newErrors.neighborhood = 'اسم الحي مطلوب';
    }

    if (!formData.locationLink.trim()) {
      newErrors.locationLink = 'رابط الموقع مطلوب';
    } else if (!formData.locationLink.startsWith('http://') && !formData.locationLink.startsWith('https://')) {
      newErrors.locationLink = 'الرابط يجب أن يبدأ بـ http:// أو https://';
    }

    if (!formData.worshippersCount.trim()) {
      newErrors.worshippersCount = 'عدد المصلين مطلوب';
    } else if (isNaN(Number(formData.worshippersCount)) || Number(formData.worshippersCount) <= 0) {
      newErrors.worshippersCount = 'يجب إدخال رقم موجب';
    }

    if (!formData.donorExists) {
      newErrors.donorExists = 'الرجاء الإجابة على سؤال المتبرع';
    }

    // Conditional validation for donor fields
    if (formData.donorExists === 'نعم') {
      if (!formData.donorName.trim()) {
        newErrors.donorName = 'اسم المتبرع مطلوب';
      }

      if (!formData.donorPhone.trim()) {
        newErrors.donorPhone = 'رقم جوال المتبرع مطلوب';
      } else if (!/^\d{9}$/.test(formData.donorPhone)) {
        newErrors.donorPhone = 'يجب أن يكون رقم الجوال 9 أرقام فقط (بدون +966)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      {}
    );
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/public-water-supply-request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Show success toast
        success({
          title: 'تم إرسال طلبك بنجاح',
          description: 'شكراً لتقديمك لطلب سقيا الماء. سيتم التواصل معك قريباً.',
          duration: 3000,
        });

        // Reset form
        setFormData({
          applicantName: '',
          mobileNumber: '',
          applicantRole: '',
          mosqueName: '',
          neighborhood: '',
          locationLink: '',
          worshippersCount: '',
          donorExists: '',
          donorName: '',
          donorPhone: '',
        });
        setErrors({});
        setTouched({});
      } else {
        throw new Error('فشل في إرسال الطلب');
      }
    } catch {
      success({
        title: 'حدث خطأ',
        description: 'فشل في إرسال الطلب. يرجى المحاولة مرة أخرى.',
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Hero Section */}
      <section className="relative isolate text-white bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 py-16 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,.18), transparent 60%)',
          }}
        />

        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-slideUp">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
              طلب سقيا الماء
            </h1>
            <p className="mt-3 mx-auto max-w-2xl text-sm md:text-base text-white/85">
              يرجى تعبئة البيانات التالية لإرسال طلب سقيا الماء للمسجد.
            </p>
          </div>
        </div>

        {/* Wave */}
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
      </section>

      {/* Form Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Applicant Information */}
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">بيانات مقدم الطلب</h2>

              {/* Applicant Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  اسم مقدم الطلب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="أدخل اسمك الكامل"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                    errors.applicantName && touched.applicantName
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                  }`}
                />
                {errors.applicantName && touched.applicantName && (
                  <p className="text-red-500 text-sm mt-1">{errors.applicantName}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  رقم الجوال <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
                    +966
                  </span>
                  <input
                    type="text"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="5xxxxxxxx"
                    maxLength={9}
                    className={`w-full pr-16 pl-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                      errors.mobileNumber && touched.mobileNumber
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                    }`}
                  />
                </div>
                {errors.mobileNumber && touched.mobileNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.mobileNumber}</p>
                )}
              </div>

              {/* Applicant Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  صفة مقدم الطلب <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  name="applicantRole"
                  value={formData.applicantRole}
                  options={[
                    { value: 'إمام', label: 'إمام' },
                    { value: 'مؤذن', label: 'مؤذن' },
                    { value: 'غير ذلك', label: 'غير ذلك' },
                  ]}
                  placeholder="اختر الصفة"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  hasError={!!(errors.applicantRole && touched.applicantRole)}
                />
                {errors.applicantRole && touched.applicantRole && (
                  <p className="text-red-500 text-sm mt-1">{errors.applicantRole}</p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Section 2: Mosque Information */}
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">بيانات المسجد</h2>

              {/* Mosque Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  اسم المسجد <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mosqueName"
                  value={formData.mosqueName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="أدخل اسم المسجد"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                    errors.mosqueName && touched.mosqueName
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                  }`}
                />
                {errors.mosqueName && touched.mosqueName && (
                  <p className="text-red-500 text-sm mt-1">{errors.mosqueName}</p>
                )}
              </div>

              {/* Neighborhood */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  اسم الحي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="أدخل اسم الحي"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                    errors.neighborhood && touched.neighborhood
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                  }`}
                />
                {errors.neighborhood && touched.neighborhood && (
                  <p className="text-red-500 text-sm mt-1">{errors.neighborhood}</p>
                )}
              </div>

              {/* Location Link */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  رابط موقع المسجد <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="locationLink"
                  value={formData.locationLink}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="https://maps.google.com/..."
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                    errors.locationLink && touched.locationLink
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                  }`}
                />
                {errors.locationLink && touched.locationLink && (
                  <p className="text-red-500 text-sm mt-1">{errors.locationLink}</p>
                )}
              </div>

              {/* Number of Worshippers */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  عدد المصلين تقريباً <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="worshippersCount"
                  value={formData.worshippersCount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="مثال: 200"
                  min="1"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                    errors.worshippersCount && touched.worshippersCount
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                  }`}
                />
                {errors.worshippersCount && touched.worshippersCount && (
                  <p className="text-red-500 text-sm mt-1">{errors.worshippersCount}</p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Section 3: Donor Information */}
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">معلومات المتبرع</h2>

              {/* Donor Exists */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  هل يوجد متبرع للمسجد؟ <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  name="donorExists"
                  value={formData.donorExists}
                  options={[
                    { value: 'نعم', label: 'نعم' },
                    { value: 'لا', label: 'لا' },
                  ]}
                  placeholder="اختر الإجابة"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  hasError={!!(errors.donorExists && touched.donorExists)}
                />
                {errors.donorExists && touched.donorExists && (
                  <p className="text-red-500 text-sm mt-1">{errors.donorExists}</p>
                )}
              </div>

              {/* Conditional Donor Fields */}
              {formData.donorExists === 'نعم' && (
                <>
                  {/* Donor Name */}
                  <div className="animate-fadeIn">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      في حال كانت إجابتك 'نعم' هل من يمكن تزويدنا باسم المتبرع؟{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="donorName"
                      value={formData.donorName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="أدخل اسم المتبرع"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                        errors.donorName && touched.donorName
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                      }`}
                    />
                    {errors.donorName && touched.donorName && (
                      <p className="text-red-500 text-sm mt-1">{errors.donorName}</p>
                    )}
                  </div>

                  {/* Donor Phone */}
                  <div className="animate-fadeIn">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      في حال كانت إجابتك 'نعم' هل من يمكن تزويدنا برقم جوال المتبرع؟{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
                        +966
                      </span>
                      <input
                        type="text"
                        name="donorPhone"
                        value={formData.donorPhone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="5xxxxxxxx"
                        maxLength={9}
                        className={`w-full pr-16 pl-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 ${
                          errors.donorPhone && touched.donorPhone
                            ? 'border-red-400 focus:ring-red-200'
                            : 'border-gray-200 focus:ring-[#711F2C] focus:ring-opacity-20'
                        }`}
                      />
                    </div>
                    {errors.donorPhone && touched.donorPhone && (
                      <p className="text-red-500 text-sm mt-1">{errors.donorPhone}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 mt-8" />

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative overflow-hidden w-full rounded-lg bg-gradient-to-r from-[#711F2C] to-[#8B2338] text-white font-bold py-4 px-6
                           transition-all duration-300 focus-visible:ring-2 ring-[#711F2C] ring-offset-2
                           hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? 'جاري الإرسال...' : 'إرسال'}
                  {!isSubmitting && (
                    <ArrowLeft
                      size={18}
                      className="transition-transform duration-300 group-hover:-translate-x-1"
                    />
                  )}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent
                             group-hover:animate-btn-shine"
                />
              </button>
            </div>
          </form>
        </div>
      </section>

      <style>{`
        @keyframes btn-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-btn-shine {
          animation: btn-shine 900ms ease-in-out 1;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 300ms ease-in-out;
        }
      `}</style>
    </div>
  );
}
