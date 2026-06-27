import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../../ui/Sidebar';

export default function UserSettings() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate('/user/main');
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <SidebarLayout>
      <div
        dir="rtl"
        className="min-h-[calc(100vh-2rem)] px-4 py-8 flex items-center justify-center"
      >
        <div className="w-full max-w-md rounded-2xl border border-[#ead5c8] bg-[#fff7f0] p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[#5a2d38]">
            الإعدادات قادمة قريبًا
          </h1>

          <p className="mt-3 text-sm text-[#5f5557]">
            نعمل على تجهيز هذه الصفحة. سيتم تحويلك للرئيسية.
          </p>

          <button
            type="button"
            onClick={() => navigate('/user/main')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#8d2e46] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a263b]"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}
