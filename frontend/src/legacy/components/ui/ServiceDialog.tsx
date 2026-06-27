import { X, Star, Heart, ArrowRight, MapPin, CalendarDays, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { Service } from '../../types';
import Modal from './Modal';
import Badge from './Badge';
import Tag from './Tag';
import ProgressBar from './ProgressBar';
import * as LucideIcons from 'lucide-react';

interface ServiceDialogProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
}

export default function ServiceDialog({ service, open, onClose }: ServiceDialogProps) {
  const { success, info } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  if (!service) return null;

  const details = service.details;
  const handleJoinService = () => {
    // التحقق من تسجيل الدخول
    if (!isAuthenticated) {
      // إغلاق الدايلوج
      onClose && onClose();
      // عرض رسالة تطلب تسجيل الدخول
      info({
        title: 'تسجيل الدخول مطلوب',
        description: 'يجب عليك تسجيل الدخول أولاً للمشاركة في هذه الخدمة.',
        duration: 3000
      });
      // توجيه المستخدم إلى صفحة تسجيل الدخول بعد تأخير قصير
    setTimeout(() => {
        navigate('/signin');
      }, 500);
      return;
    }

    // إذا كان المستخدم مسجل دخول
    // إغلاق الدايلوج
    onClose && onClose();
    // عرض رسالة النجاح
    success({
      title: 'تم إرسال مشاركتك بنجاح',
      description: 'سيتم التواصل معك عبر البريد الإلكتروني في حال القبول.',
      duration: 2000
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'متاحة':
        return 'success';
      case 'قادمة':
        return 'info';
      case 'مكتملة':
        return 'default';
      default:
        return 'default';
    }
  };

  // ✅ نجيب الأيقونة من كارد الخدمة
  const IconComponent = service.icon ? (LucideIcons as any)[service.icon] : null;

  return (
    <>
      <Modal open={open} onClose={onClose} labelledById="service-title" lockTargetSelector="#app">
        <div className="p-6 md:p-8 flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 animate-slideUp">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {IconComponent && (
                  <IconComponent size={34} className="text-[#DFC775] flex-shrink-0" />
                )}
                <h1 id="service-title" className="text-2xl md:text-2xl font-extrabold text-gray-900">
                  {service.title}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                {service.category && <Badge variant="default">{service.category}</Badge>}
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100 focus-visible:ring-2 ring-brand-600 transition-colors"
              aria-label="إغلاق"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="custom-scroll overflow-y-auto">
          {/* Service Summary */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">وصف الخدمة</h2>
              <p className="text-gray-700 leading-8">{details?.summary ?? service.desc}</p>
          </div>

            {/* Meta */}
            {details?.meta && (
              <div className="mb-6">
                <div className="flex flex-wrap justify-right items-center gap-x-8 gap-y-3 text-sm text-gray-600 text-center">
                {details.meta.map((meta, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-center gap-2 min-w-[140px]"
                    >
                      {meta.icon === 'MapPin' && (
                        <MapPin size={18} className="text-gray-500" aria-hidden="true" />
                      )}
                      {meta.icon === 'CalendarDays' && (
                        <CalendarDays size={18} className="text-gray-500" aria-hidden="true" />
                      )}
                      {meta.icon === 'Building' && (
                        <Building size={18} className="text-gray-500" aria-hidden="true" />
                      )}
                      <span className="text-gray-700 font-medium">{meta.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

            <div className="border-t border-gray-100 mt-6" />

            {/* الفئات المستهدفة */}
            {details?.audiences && (
            <section className="mt-8 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900 mb-3">الفئات المستهدفة</h2>
              <div className="flex flex-wrap gap-2">
                  {details.audiences.map((aud, i) => (
                    <Tag key={i}>{aud}</Tag>
                ))}
              </div>
            </section>
          )}

            <div className="border-t border-gray-100 mt-6" />

            {/* المتطلبات */}
            {details?.requirements && (
            <section className="mt-8 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900 mb-3">متطلبات التنفيذ</h2>
              <div className="space-y-3">
                  {details.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Star size={16} className="text-[#DFC775] mt-1" />
                      <span className="text-gray-700 text-sm">{req}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

            <div className="border-t border-gray-100 mt-6" />

            {/* المتطوعين */}
            {details?.volunteers && (
            <section className="mt-8 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900 mb-3">عدد المتطوعين</h2>
                <ProgressBar current={details.volunteers.current} total={details.volunteers.need} />
            </section>
          )}
          </div>

          {/* Footer */}
          <footer className="sticky bottom-0 mt-8 pt-6 border-t border-gray-100 bg-white/90 backdrop-blur">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* زر شارك في الخدمة */}
              <button 
                onClick={handleJoinService}
                className="group relative overflow-hidden w-full rounded-full bg-[#711F2C] text-white font-semibold py-3
                           transition-all duration-300 focus-visible:ring-2 ring-[#711F2C] ring-offset-2
                           flex items-center justify-center gap-2
                           hover:bg-[#5a1823] hover:-translate-y-0.5 hover:shadow-lg"
              >
                شارك في الخدمة
                <LucideIcons.ArrowLeft 
                  size={16}
                  className="transition-all duration-300 group-hover:-translate-x-1 group-hover:scale-[1.15] group-hover:stroke-[2.5]"
                  strokeWidth={2} 
                />
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent
                             group-hover:animate-btn-shine"
                />
              </button>

              {/* زر تبرع للخدمة */}
              <button
                className="w-full rounded-full border-2 border-[#DFC775] text-[#DFC775] hover:bg-[#FFF9EC] 
                           hover:text-[#711F2C] py-3 transition-all focus-visible:ring-2 ring-[#DFC775]
                           ring-offset-2 flex items-center justify-center gap-2 group"
              >
                تبرع للخدمة
                <Heart
                  size={16}
                  className="transition-transform duration-300 group-hover:scale-125 group-hover:text-[#711F2C]"
                />
              </button>
            </div>
          </footer>
        </div>

        {/* Animation Styles */}
        <style>{`
          @keyframes btn-shine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-btn-shine {
            animation: btn-shine 900ms ease-in-out 1;
          }

          .custom-scroll {
            scrollbar-width: thin;
            scrollbar-color: #711F2C #ffffff;
          }
          .custom-scroll::-webkit-scrollbar {
            width: 10px;
          }
          .custom-scroll::-webkit-scrollbar-track {
            background: #ffffff;
            border-radius: 9999px;
          }
          .custom-scroll::-webkit-scrollbar-thumb {
            background: #711F2C;
            border-radius: 9999px;
          }
          .custom-scroll::-webkit-scrollbar-thumb:hover {
            background: #711F2C;
          }
        `}</style>
      </Modal>
    </>
  );
}
