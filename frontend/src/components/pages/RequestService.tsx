import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { API_BASE_URL } from '../../config';

interface Service {
  id: number;
  title: string;
  desc: string;
  status: string;
  is_active: boolean;
}

export default function RequestService() {
  const location = useLocation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    service: '',
    beneficiary_name: '',
    beneficiary_contact: '',
    details: '',
  });

  useEffect(() => {
    fetchServices();
  }, []);

  // Pre-select service if passed from navigation
  useEffect(() => {
    const state = location.state as { serviceId?: string | number };
    if (state?.serviceId) {
      setFormData(prev => ({ ...prev, service: String(state.serviceId) }));
    }
  }, [location.state]);

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public-services/`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.results || data);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service || !formData.beneficiary_name || !formData.beneficiary_contact) {
      error({
        title: 'الرجاء ملء جميع الحقول المطلوبة',
        description: 'يجب إدخال نوع الخدمة والاسم ومعلومات التواصل',
        duration: 4000
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/public-service-request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success({
          title: 'تم إرسال طلبك بنجاح',
          description: 'سيتم مراجعة طلبك من قبل فريقنا والتواصل معك قريباً',
          duration: 5000
        });

        setFormData({
          service: '',
          beneficiary_name: '',
          beneficiary_contact: '',
          details: '',
        });
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      error({
        title: 'حدث خطأ',
        description: 'لم يتم إرسال الطلب، حاول مرة أخرى',
        duration: 4000
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-600 to-brand-500 text-white py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center animate-fadeIn">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              طلب خدمة
            </h1>
            <p className="text-lg md:text-xl text-brand-100 max-w-2xl mx-auto">
              نحن هنا لخدمتكم. يرجى ملء النموذج أدناه وسنقوم بمراجعة طلبكم في أقرب وقت
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto mt-5 p-6 bg-white shadow-md rounded-2xl space-y-4"
      >
        {/* Service Selection */}
        <div className="flex flex-col space-y-2">
          <label htmlFor="service" className="text-gray-700 font-medium">
            نوع الخدمة <span className="text-red-500">*</span>
          </label>
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
          ) : (
            <select
              id="service"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFC775] focus:border-[#DFC775]"
              required
            >
              <option value="">اختر الخدمة المطلوبة</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Beneficiary Name */}
        <div className="flex flex-col space-y-2">
          <label htmlFor="beneficiary_name" className="text-gray-700 font-medium">
            اسم المستفيد <span className="text-red-500">*</span>
          </label>
          <input
            id="beneficiary_name"
            type="text"
            value={formData.beneficiary_name}
            onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
            placeholder="مثال: مسجد النور، جمعية الخير، محمد أحمد..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFC775] focus:border-[#DFC775]"
            required
          />
        </div>

        {/* Contact Info */}
        <div className="flex flex-col space-y-2">
          <label htmlFor="beneficiary_contact" className="text-gray-700 font-medium">
            معلومات التواصل <span className="text-red-500">*</span>
          </label>
          <input
            id="beneficiary_contact"
            type="text"
            value={formData.beneficiary_contact}
            onChange={(e) => setFormData({ ...formData, beneficiary_contact: e.target.value })}
            placeholder="رقم الجوال أو البريد الإلكتروني"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFC775] focus:border-[#DFC775]"
            required
          />
        </div>

        {/* Details */}
        <div className="flex flex-col space-y-2">
          <label htmlFor="details" className="text-gray-700 font-medium">
            تفاصيل الطلب
          </label>
          <textarea
            id="details"
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            placeholder="اكتب تفاصيل إضافية عن احتياجاتك... مثال: نحتاج إلى 100 زجاجة ماء لتوزيعها على المصلين"
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFC775] focus:border-[#DFC775] resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="outlineGold"
          size="lg"
          className="w-full"
        >
          إرسال الطلب
        </Button>
      </form>
    </div>
  );
}
