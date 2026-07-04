import { X, Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { Project } from '../../types';
import Modal from './Modal';
import Badge from './Badge';
import Tag from './Tag';
import { API_BASE_URL } from '../../config';
import { useState } from 'react';

interface ProjectDialogProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

export default function ProjectDialog({ project, open, onClose }: ProjectDialogProps) {
  const { success, info, error } = useToast();
  const { isAuthenticated, access } = useAuth();
  const navigate = useNavigate();
  const [isApplying, setIsApplying] = useState(false);

  if (!project) return null;

  const details = project.details;
  const handleJoinProject = async () => {
    // التحقق من تسجيل الدخول
    if (!isAuthenticated) {
      // إغلاق الدايلوج
      onClose && onClose();
      // عرض رسالة تطلب تسجيل الدخول
      info({
        title: 'تسجيل الدخول مطلوب',
        description: 'يجب عليك تسجيل الدخول أولاً للمشاركة في هذا المشروع.',
        duration: 3000
      });
      // توجيه المستخدم إلى صفحة تسجيل الدخول بعد تأخير قصير
      setTimeout(() => {
        navigate('/signin');
      }, 500);
      return;
    }

    // إذا كان المستخدم مسجل دخول، أرسل الطلب للباك إند
    setIsApplying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/opportunities/${project.id}/apply/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'فشل في إرسال الطلب');
      }

      // إغلاق الدايلوج
      onClose && onClose();
      // عرض رسالة النجاح
      success({
        title: 'تم إرسال مشاركتك بنجاح',
        description: 'سيتم مراجعة طلبك من قبل المشرف وسيتم التواصل معك قريباً.',
        duration: 3000
      });
    } catch (err: any) {
      error({
        title: 'خطأ',
        description: err.message || 'حدث خطأ أثناء إرسال الطلب',
        duration: 3000
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} labelledById="project-title" lockTargetSelector="#app">
        {/* إطار المودال */}
        <div className="flex flex-col max-h-[80vh]">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
            <div className="px-6 md:px-8 py-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mt-2">
                  <Badge variant="warning">{project.category}</Badge>
                </div>
                <h1 id="project-title" className="text-2xl font-extrabold text-gray-900">
                  {project.title}
                </h1>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 hover:bg-gray-100 focus-visible:ring-2 ring-brand-600 transition-colors"
                aria-label="إغلاق"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="custom-scroll overflow-y-auto px-6 md:px-8 py-6">
            <p className="text-gray-700 leading-8">
              {details?.summary ?? project.desc}
            </p>

            <div className="border-t border-gray-100 mt-6" />

            {/* ما يشمله المشروع */}
            <section className="mt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#711F2C]" />
                ما يشمله المشروع
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(details?.includes ?? []).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-[#DFC775]" />
                    <span className="text-gray-700 text-sm leading-7">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-gray-100 mt-6" />

            {/* الفئات المستهدفة */}
            <section className="mt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#711F2C]" />
                الفئات المستهدفة
              </h2>
              <div className="flex flex-wrap gap-2">
                {(details?.audiences ?? []).map((aud, i) => (
                  <Tag key={i}>{aud}</Tag>
                ))}
              </div>
            </section>

            <div className="border-t border-gray-100 mt-6" />

            {/* متطلبات التنفيذ */}
            <section className="mt-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#711F2C]" />
                متطلبات التنفيذ
              </h2>
              <div className="space-y-3">
                {(details?.requirements ?? []).map((req, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-[#DFC775]" />
                    <span className="text-gray-700 text-sm leading-7">{req}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="sticky bottom-0 z-10 bg-white/90 backdrop-blur border-t border-gray-100">
            <div className="px-6 md:px-8 py-4 flex flex-col sm:flex-row gap-3">
              {/* زر شارك في المشروع (مع لمعة وأنيميشن مثل اعرف أكثر) */}
              <button
                onClick={handleJoinProject}
                disabled={isApplying}
                className="
                  group relative overflow-hidden w-full rounded-xl bg-[#711F2C] text-white font-semibold py-3
                  transition-all duration-300 focus-visible:ring-2 ring-[#711F2C] ring-offset-2
                  flex items-center justify-center gap-2
                  hover:bg-[#5a1823] hover:-translate-y-0.5 hover:shadow-lg
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                "
              >
                {isApplying ? 'جاري الإرسال...' : 'شارك في المشروع'}
                {!isApplying && (
                  <ArrowLeft
                    size={16}
                    className="transition-all duration-300 group-hover:-translate-x-1 group-hover:scale-[1.15] group-hover:stroke-[2.5]"
                    strokeWidth={2}
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent
                            group-hover:animate-btn-shine"
                />
              </button>


              {/* زر التبرع */}
              <button
                className="w-full rounded-xl border-2 border-[#DFC775] text-[#DFC775] hover:bg-[#FFF9EC] 
                           hover:text-[#711F2C] py-3 transition-all focus-visible:ring-2 ring-[#DFC775]
                           ring-offset-2 flex items-center justify-center gap-2 group"
              >
                تبرع للمشروع
                <Heart
                  size={16}
                  className="transition-transform duration-300 group-hover:scale-125 group-hover:text-[#711F2C]"
                />
              </button>
            </div>
          </footer>
        </div>

        {/* أنيميشن وسكرول بار */}
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
