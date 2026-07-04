import React, { useState, useEffect } from 'react';
import SidebarLayout from '../../ui/Sidebar';
import {
  MapPin,
  Clock3,
  Users,
  CalendarClock,
  Search,
  Sparkles,
  Hourglass,
  MoreHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../feedback/Toast';
import type { ToastProps } from '../../feedback/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import { API_BASE_URL } from '../../../config';

type TaskStatus = 'جديدة' | 'قيد التنفيذ' | 'معلقة';

type Task = {
  id: number;
  status: TaskStatus;
  title: string;
  org: string;
  description: string;
  date: string;
  duration: string;
  location: string;
};

type OpportunityUrgency = 'مستعجلة' | 'شبه مستعجلة' | 'عادية';

type Opportunity = {
  id: number;
  title: string;
  org: string;
  category: string;
  location: string;
  urgency: OpportunityUrgency;
  duration: string;
  people: string;
  logoUrl: string;
};

const initialTasks: Task[] = [
  {
    id: 1,
    status: 'جديدة',
    title: 'تطوير صفحة تعريفية لحملة الأيتام',
    org: 'جمعية تمكين الشباب',
    description:
      'بناء واجهة تفاعلية لبوابة تسجيل المتطوعين وربطها بقاعدة بيانات.',
    date: '٧ ربيع الآخر',
    duration: 'أسبوعان',
    location: 'مقر الجمعية',
  },
  {
    id: 2,
    status: 'قيد التنفيذ',
    title: 'نظام متابعة المتطوعين',
    org: 'جمعية تمكين الشباب',
    description: 'تصميم Dashboard يعرض ساعات التطوع ومجالات مشاركة الأعضاء.',
    date: '٢٢ ربيع الأول',
    duration: '٣ أسابيع',
    location: 'مقر الجمعية',
  },
  {
    id: 3,
    status: 'معلقة',
    title: 'منصة تفاعلية للدورات التدريبية',
    org: 'جمعية الثقافة والفنون',
    description:
      'تطوير موقع يعرض الدورات القادمة مع إمكانية التسجيل الإلكتروني.',
    date: '٢٢ صفر',
    duration: 'شهر',
    location: 'مقر الجمعية',
  },
  {
    id: 4,
    status: 'قيد التنفيذ',
    title: 'تطوير صفحة تعريفية لحملة الأيتام',
    org: 'جمعية رعاية الأيتام',
    description:
      'إنشاء موقع بسيط يوضح تفاصيل حملة كفالة الأيتام مع زر تبرع إلكتروني.',
    date: '٢٨ ربيع الأول',
    duration: 'أسبوع',
    location: 'مقر الجمعية',
  },
];

const opportunities: Opportunity[] = [
  {
    id: 1,
    title: 'إنشاء نظام لإدارة طلبات الأسر المستفيدة.',
    org: 'جمعية الزاد',
    category: 'تطوير الأنظمة',
    location: 'مقر الجمعية',
    urgency: 'مستعجلة',
    duration: 'أسبوعين',
    people: '٣ أشخاص',
    logoUrl: 'https://c.animaapp.com/2u79Z8fE/img/image-15@2x.png',
  },
  {
    id: 2,
    title: 'إنشاء نظام لإدارة طلبات الأسر المستفيدة.',
    org: 'جمعية العطاء التنموية',
    category: 'تطوير المواقع',
    location: 'المقر - عنيزة',
    urgency: 'شبه مستعجلة',
    duration: '١٠ أيام',
    people: 'شخصين',
    logoUrl: 'https://c.animaapp.com/2u79Z8fE/img/image-17@2x.png',
  },
  {
    id: 3,
    title: 'إنشاء نظام لإدارة طلبات الأسر المستفيدة.',
    org: 'مؤسسة سبل الخير',
    category: 'تصميم الواجهات',
    location: 'المقر - عنيزة',
    urgency: 'عادية',
    duration: '٣ أسابيع',
    people: 'شخص واحد',
    logoUrl: 'https://c.animaapp.com/2u79Z8fE/img/image-15-1@2x.png',
  },
];

function statusClasses(status: TaskStatus) {
  switch (status) {
    case 'جديدة':
      return 'bg-[#e5f6ea] text-[#496a51] border-[#b7ddc1]';
    case 'قيد التنفيذ':
      return 'bg-[#e2f0fb] text-[#495b6a] border-[#b9d4f2]';
    case 'معلقة':
      return 'bg-[#f7eee1] text-[#6a5c49] border-[#e2c9a2]';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function primaryActionLabel(status: TaskStatus) {
  if (status === 'جديدة') return 'إبدأ الآن';
  if (status === 'قيد التنفيذ') return 'استئناف';
  return 'استئناف';
}

function statusIcon(
  status: TaskStatus
): { Icon: React.ElementType; color: string } {
  switch (status) {
    case 'جديدة':
      return { Icon: Sparkles, color: '#E4B106' };
    case 'قيد التنفيذ':
      return { Icon: Hourglass, color: '#C17A2B' };
    case 'معلقة':
      return { Icon: MoreHorizontal, color: '#6A5C49' };
    default:
      return { Icon: Sparkles, color: '#999999' };
  }
}

function urgencyClasses(urgency: OpportunityUrgency) {
  switch (urgency) {
    case 'مستعجلة':
      return 'bg-[#fde1e1] text-[#c54030] border-[#f4b1a7]';
    case 'شبه مستعجلة':
      return 'bg-[#f8e8c8] text-[#735727] border-[#e4c48d]';
    case 'عادية':
      return 'bg-[#e8f3ea] text-[#496a51] border-[#bcd8c2]';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

type InfoItemProps = {
  icon: React.ElementType;
  children: React.ReactNode;
  reverse?: boolean;
};

function InfoItem({ icon: Icon, children, reverse = false }: InfoItemProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${reverse ? 'flex-row-reverse' : ''
        } cursor-default`}
    >
      <Icon className="w-3 h-3 relative top-[1px]" />
      <span>{children}</span>
    </span>
  );
}

type TaskCardProps = {
  task: Task;
  onWithdraw: (task: Task) => void;
  onOpen: (task: Task) => void;
};

function TaskCard({ task, onWithdraw, onOpen }: TaskCardProps) {
  const badgeClasses = statusClasses(task.status);
  const primaryAction = primaryActionLabel(task.status);
  const { Icon: StatusIcon, color: statusColor } = statusIcon(task.status);
  const isPending = task.status === 'معلقة';

  return (
    <div
      dir="rtl"
      className="rounded-[18px] bg-[#fdf5ee] px-5 py-4 shadow-[0_6px_14px_#0000000c] border border-[#f0e1d6]
                 flex flex-col gap-2 select-none cursor-default"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">
          {isPending ? (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#fff7ea] border border-[#e2c9a2]">
              <StatusIcon
                className="w-3.5 h-3.5"
                style={{ color: statusColor }}
              />
            </span>
          ) : (
            <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
          )}

          <p className="text-[15px] font-bold leading-snug bg-gradient-to-l from-[#e4b106] via-[#d37a30] to-[#8d2e46] bg-clip-text text-transparent">
            {task.title}
          </p>
        </div>

        <span
          className={`inline-flex items-center justify-center px-4 py-[3px] rounded-full border text-[11px] font-normal ${badgeClasses}`}
        >
          {task.status}
        </span>
      </div>

      <p className="text-[13px] font-semibold text-[#4e4a4b] text-right">
        {task.org}
      </p>

      <p className="text-[11px] text-[#4e4a4b] leading-relaxed text-right">
        {task.description}
      </p>

      <div className="flex items-center justify-between w-full mt-2 text-[11px]">
        <div className="flex items-center gap-3 text-[#7c7570]">
          <InfoItem icon={Clock3}>{task.duration}</InfoItem>
          <InfoItem icon={MapPin}>{task.location}</InfoItem>
          <InfoItem icon={CalendarClock}>{task.date}</InfoItem>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group cursor-default">
            <button
              type="button"
              disabled={isPending}
              onClick={() => !isPending && onOpen(task)}
              className={
                `px-4 py-1 rounded-md text-white text-[11px] font-semibold 
                 bg-[linear-gradient(90deg,rgba(184,71,85,1)_0%,rgba(228,177,6,1)_100%)]
                 transition ` +
                (isPending
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:brightness-110 cursor-pointer')
              }
            >
              {primaryAction}
            </button>

            {isPending && (
              <div
                className="absolute -top-12 right-1 z-10 opacity-0 group-hover:opacity-100
                           bg-[#4e4a4b] text-white text-[10px] rounded-lg px-3 py-1
                           whitespace-nowrap shadow-lg transition-opacity duration-150
                           pointer-events-none select-none"
              >
                هذه المهمة معلّقة حاليًا، يمكنك التواصل
                <br />
                مع الجهة المنظمة للمزيد من التفاصيل.
              </div>
            )}
          </div>

          <button
            type="button"
            className="px-3 py-1 rounded-md border border-[#c9b7a0] text-[#4e4a4b] text-[11px] font-semibold bg-[#fefcf9] hover:bg-gray-50 transition cursor-pointer select-none"
            onClick={() => onWithdraw(task)}
          >
            انسحاب
          </button>
        </div>
      </div>
    </div>
  );
}

type OpportunityCardProps = {
  opportunity: Opportunity;
  onApply: () => void;
};

function OpportunityCard({ opportunity, onApply }: OpportunityCardProps) {
  const urgencyBadge = urgencyClasses(opportunity.urgency);

  return (
    <div
      className="rounded-2xl bg-[#faf6f7] border border-[#e6d2d7] px-3 py-2 shadow-[0_4px_12px_#0000000d]
                 select-none cursor-default"
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        <div className="w-[105px] h-[72px] rounded-[10px] border border-[#e6d2d7] bg-white flex items-center justify-center overflow-hidden shrink-0">
          <img
            src={opportunity.logoUrl}
            alt={opportunity.org}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <div className="flex-1 flex flex-col gap-1 text-right">
          <div className="flex items-center w-full mt-1">
            <p className="text-[15px] font-medium text-[#4e4a4b] leading-snug flex-1 ml-2">
              {opportunity.title}
            </p>
            <span
              className={`px-3 py-[1px] rounded-full border text-[10px] font-normal shrink-0 ${urgencyBadge} ms-auto`}
            >
              {opportunity.urgency}
            </span>
          </div>

          <p className="text-[13px] text-[#a54c62cc] font-medium mt-1">
            {opportunity.category}
          </p>

          <p className="text-[11px] text-[#6e6d6d]">{opportunity.org}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#6e6d6d]">
        <div className="flex flex-wrap items-center gap-3">
          <InfoItem icon={Users}>{opportunity.people}</InfoItem>
          <InfoItem icon={Clock3}>{opportunity.duration}</InfoItem>
          <InfoItem icon={MapPin}>{opportunity.location}</InfoItem>
        </div>

        <button
          type="button"
          onClick={onApply}
          className="px-3 py-1.5 rounded-[8px] bg-[#a54c63] text-white text-[12px] font-medium hover:brightness-110 transition cursor-pointer select-none"
        >
          التقدم الآن
        </button>
      </div>
    </div>
  );
}

function HadithCard() {
  return (
    <div
      className="bg-gradient-to-r from-[#f5e6d3] to-[#e3d1d8] rounded-2xl p-6 flex items-center gap-4 border border-[#e3d1d8]
                 select-none cursor-default"
      dir="rtl"
    >
      <div className="text-4xl">🌱</div>
      <div className="flex-1">
        <p className="text-gray-800 leading-relaxed text-sm">
          قال النبي ﷺ : " إِنْ قَامَتِ السَّاعَةُ وَفِي يَدِ أَحَدِكُمْ فَسِيلَةً،
          فَإِنِ اسْتَطَاعَ أَنْ لَا تَقُومَ حَتَّى يَغْرِسَهَا فَلْيَغْرِسَهَا ".
        </p>
      </div>
    </div>
  );
}

function StatsSection() {
  const { access } = useAuth();
  const [stats, setStats] = useState({
    volunteer_hours: 0,
    rating: 0,
    completed_tasks: 0,
    points: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/my-stats/`, {
          headers: {
            'Authorization': `Bearer ${access}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching volunteer stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (access) {
      fetchStats();
    }
  }, [access]);

  if (loading) {
    return (
      <section
        className="relative max-w-[540px] w-full rounded-[25px] py-3 px-4 text-[#4e4a4b]
                   bg-[linear-gradient(0deg,rgba(250,246,247,0.8)_0%,rgba(250,246,247,0.8)_100%),linear-gradient(177deg,rgba(152,66,88,1)_0%,rgba(165,86,78,1)_33%,rgba(228,180,32,1)_100%)]
                   shadow-[-1px_5px_11px_#00000008,-3px_20px_20px_#00000008,-7px_45px_28px_#00000005,-12px_81px_33px_transparent,-18px_126px_36px_transparent]
                   select-none cursor-default"
        dir="rtl"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8d2e46]"></div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative max-w-[540px] w-full rounded-[25px] py-3 px-4 text-[#4e4a4b]
                 bg-[linear-gradient(0deg,rgba(250,246,247,0.8)_0%,rgba(250,246,247,0.8)_100%),linear-gradient(177deg,rgba(152,66,88,1)_0%,rgba(165,86,78,1)_33%,rgba(228,180,32,1)_100%)]
                 shadow-[-1px_5px_11px_#00000008,-3px_20px_20px_#00000008,-7px_45px_28px_#00000005,-12px_81px_33px_transparent,-18px_126px_36px_transparent]
                 select-none cursor-default"
      dir="rtl"
    >
      <div className="flex items-center justify-center mb-3 gap-2">
        <h2 className="font-bold text-[#2e2b2c] text-[22px] md:text-[24px]">
          إحصائيات المتطوع
        </h2>
        <img
          className="w-8 h-8 md:w-9 md:h-9"
          alt="Carbon badge"
          src="https://c.animaapp.com/2u79Z8fE/img/carbon-badge.svg"
        />
      </div>

      <div className="mb-4 h-px w-[88%] mx-auto bg-white/60" />

      <div className="mb-6 flex justify-between textcenter gap-6">
        <div className="flex-1 flex flex-col items-center gap-1">
          <img
            className="w-7 h-7 md:w-8 md:h-8"
            alt="clock"
            src="https://c.animaapp.com/2u79Z8fE/img/mdi-light-clock.svg"
          />
          <p className="font-bold text-[#8d2e46] text-3xl md:text-4xl">{stats.volunteer_hours}</p>
          <p className="mt-1 font-medium text-[#4e4a4b] text-[14px] md:text-[15px]">
            ساعة تطوعية
          </p>
        </div>

        <div className="w-px bg-white/60 self-stretch hidden md:block" />

        <div className="flex-1 flex flex-col items-center gap-1">
          <img
            className="w-7 h-7 md:w-8 md:h-8"
            alt="rating"
            src="https://c.animaapp.com/2u79Z8fE/img/solar-star-outline.svg"
          />
          <p className="font-bold text-[#8d2e46] text-3xl md:text-4xl">{stats.rating.toFixed(1)}</p>
          <p className="mt-1 font-medium text-[#4e4a4b] text-[14px] md:text-[15px]">
            التقييم
          </p>
        </div>

        <div className="w-px bg-white/60 self-stretch hidden md:block" />

        <div className="flex-1 flex flex-col items-center gap-1">
          <img
            className="w-7 h-7 md:w-8 md:h-8"
            alt="done"
            src="https://c.animaapp.com/2u79Z8fE/img/lets-icons-done-ring-round.svg"
          />
          <p className="font-bold text-[#8d2e46] text-3xl md:text-4xl">{stats.completed_tasks}</p>
          <p className="mt-1 font-medium text-[#4e4a4b] text-[14px] md:text-[15px]">
            مهام منجزة
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end w-full">
        <span className="font-medium text-[15px] md:text-[16px] text-[#4e4a4b]">
          نقاط المتطوع
        </span>
        <div className="w-[90px] h-[30px] rounded-[8px] bg-[linear-gradient(90deg,rgba(141,46,70,0.9)_0%,rgba(228,177,6,0.9)_100%)] flex items-center justify-center">
          <span className="font-semibold text-[#8d2e46] text-[16px] md:text-[18px]">
            {stats.points} نقطة
          </span>
        </div>
      </div>
    </section>
  );
}

function SearchBox() {
  return (
    <div className="w-full" dir="rtl">
      <div className="relative">
        <input
          type="text"
          placeholder="... البحث"
          className="w-full bg-[#f5e6d3] rounded-full py-4 pr-5 pl-14
                     text-gray-700 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-[#c5a89c] transition shadow-inner"
        />
        <Search className="absolute top-1/2 -translate-y-1/2 left-6 w-5 h-5 text-gray-500 pointer-events-none" />
      </div>
    </div>
  );
}

function OpportunitiesSection() {
  const navigate = useNavigate();
  const { access } = useAuth();

  const [showApplyPopup, setShowApplyPopup] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/opportunities/`, {
          headers: {
            'Authorization': `Bearer ${access}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Map backend data to frontend format
          const mappedOpportunities = (data.results || []).map((project: any) => ({
            id: project.id,
            title: project.title || project.desc || 'فرصة تطوعية',
            org: project.organization || 'منظمة تكافل',
            category: project.category || 'تطوير',
            location: project.location || 'غير محدد',
            urgency: 'عادية' as OpportunityUrgency,
            duration: `${project.estimated_hours || 20} ساعة`,
            people: `${project.beneficiaries || 1} شخص`,
            logoUrl: 'https://c.animaapp.com/2u79Z8fE/img/image-15@2x.png'
          }));
          setOpportunities(mappedOpportunities);
        }
      } catch (error) {
        console.error('Error fetching opportunities:', error);
      } finally {
        setLoading(false);
      }
    };

    if (access) {
      fetchOpportunities();
    } else {
      setLoading(false);
    }
  }, [access]);

  const handleMoreClick = () => {
    navigate('/');
  };

  const handleApplyClick = (op: Opportunity) => {
    setSelectedOpportunity(op);
    setShowApplyPopup(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedOpportunity) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user/opportunities/${selectedOpportunity.id}/apply/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowApplyPopup(false);
        addToast({
          type: 'success',
          title: 'تم تقديم طلبك بنجاح',
          description: `تم استلام طلبك في: ${selectedOpportunity.title}`,
          duration: 4500,
        });
      } else {
        setShowApplyPopup(false);
        addToast({
          type: 'error',
          title: 'خطأ',
          description: data.message || 'حدث خطأ أثناء تقديم الطلب',
          duration: 4500,
        });
      }
    } catch (error) {
      console.error('Error applying to opportunity:', error);
      setShowApplyPopup(false);
      addToast({
        type: 'error',
        title: 'خطأ',
        description: 'حدث خطأ أثناء تقديم الطلب',
        duration: 4500,
      });
    }

    setSelectedOpportunity(null);
  };

  const handleCancelApply = () => {
    setShowApplyPopup(false);
    setSelectedOpportunity(null);
  };

  return (
    <>
      <div className="fixed top-4 left-4 z-40 space-y-2" dir="rtl">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>

      <section
        className="rounded-[25px] shadow-[-1px_5px_11px_#00000008,-3px_20px_20px_#00000008,-7px_45px_28px_#00000005,-12px_81px_33px_transparent,-18px_126px_36px_transparent]
                   bg-[linear-gradient(0deg,rgba(250,246,247,0.8)_0%,rgba(250,246,247,0.8)_100%),linear-gradient(223deg,rgba(152,66,88,1)_0%,rgba(165,86,78,1)_33%,rgba(228,180,32,1)_100%)]
                   p-6 select-none cursor-default"
        dir="rtl"
      >
        <header className="mb-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-[#2e2b2c] text-[22px]">
              فرص تطوعية مقترحة
            </h2>
            <img
              className="w-10 h-10"
              alt="Icon"
              src="https://c.animaapp.com/2u79Z8fE/img/icon-@2x.png"
            />
          </div>
          <div className="h-px bg-white mx-auto" style={{ width: '60%' }} />
        </header>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8d2e46]"></div>
            </div>
          ) : opportunities.length > 0 ? (
            opportunities.map((op) => (
              <OpportunityCard
                key={op.id}
                opportunity={op}
                onApply={() => handleApplyClick(op)}
              />
            ))
          ) : (
            <div className="text-center text-[#4e4a4b] py-8">
              لا توجد فرص تطوعية متاحة حاليًا
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="font-medium text-[#4e4a4b] text-[15px] cursor-pointer select-none"
            onClick={handleMoreClick}
          >
            المزيد
          </button>
        </div>
      </section>

      {showApplyPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          onClick={handleCancelApply}
        >
          <div
            className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-sm sm:max-w-md mx-4 shadow-2xl border-4 border-[#C49FA3]"
            style={{ direction: 'rtl' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-[#8D2E46] mb-4 text-center">
              تأكيد التقدم
            </h2>

            <p className="text-center text-[#6F1A28] mb-6 text-sm">
              هل أنت متأكد من رغبتك في التقدم لهذه الفرصة؟
              <br />
              <span className="font-semibold">
                {selectedOpportunity?.title}
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleConfirmApply}
                className="px-6 py-2 bg-gradient-to-r from-[#a83451ff] to-[#E4B106] 
                           text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer select-none"
              >
                نعم، تأكيد التقدم
              </button>

              <button
                onClick={handleCancelApply}
                className="px-6 py-2 border-2 border-[#86676A] 
                           text-[#86676A] rounded-lg text-sm font-medium 
                           hover:bg-gray-50 transition-colors cursor-pointer select-none"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type TasksSectionProps = {
  onMoreClick: () => void;
};

function TasksSection({ onMoreClick }: TasksSectionProps) {
  const navigate = useNavigate();
  const { access } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [showWithdrawPopup, setShowWithdrawPopup] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/my-tasks/`, {
          headers: {
            'Authorization': `Bearer ${access}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Map backend data to frontend format
          const mappedTasks = (data.results || [])
            .filter((task: any) => task.status !== 'مكتملة')  // Exclude completed for main page
            .map((task: any) => {
              // Map backend status to frontend status
              let status: TaskStatus = 'قيد التنفيذ';
              if (task.status === 'في الانتظار') status = 'جديدة';
              else if (task.status === 'معلقة') status = 'معلقة';
              else if (task.status === 'قيد التنفيذ') status = 'قيد التنفيذ';

              // Format date
              const createdDate = new Date(task.created_at);
              const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long'
              }).format(createdDate);

              return {
                id: task.id,
                status: status,
                title: task.title,
                org: task.project_name || 'منظمة تكافل',
                description: task.description || 'لا يوجد وصف',
                date: hijriDate,
                duration: `${task.hours || 20} ساعة`,
                location: 'مقر الجمعية'
              };
            });
          setTasks(mappedTasks);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    if (access) {
      fetchTasks();
    }
  }, [access]);

  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleWithdrawClick = (task: Task) => {
    setSelectedTask(task);
    setShowWithdrawPopup(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!selectedTask) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user/tasks/${selectedTask.id}/withdraw/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
        setShowWithdrawPopup(false);

        addToast({
          type: 'success',
          title: 'تم الانسحاب بنجاح',
          description: `تم انسحابك من المهمة: ${selectedTask.title}`,
          duration: 4500,
        });
      } else {
        setShowWithdrawPopup(false);
        addToast({
          type: 'error',
          title: 'خطأ',
          description: data.error || 'حدث خطأ أثناء الانسحاب من المهمة',
          duration: 4500,
        });
      }
    } catch (error) {
      console.error('Error withdrawing from task:', error);
      setShowWithdrawPopup(false);
      addToast({
        type: 'error',
        title: 'خطأ',
        description: 'حدث خطأ أثناء الانسحاب من المهمة',
        duration: 4500,
      });
    }

    setSelectedTask(null);
  };

  const handleCancelWithdraw = () => {
    setShowWithdrawPopup(false);
    setSelectedTask(null);
  };

  const handleOpenTask = (task: Task) => {
    navigate('/user/tasks', {
      state: { selectedTaskId: task.id },
    });
  };

  return (
    <>
      <div className="fixed top-4 left-4 z-40 space-y-2" dir="rtl">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>

      <section
        className="rounded-[25px]
                   shadow-[-5px_8px_19px_#00000008,-18px_30px_35px_#00000008,-41px_68px_48px_#00000005,-72px_122px_57px_transparent,-113px_190px_62px_transparent]
                   bg-[linear-gradient(0deg,rgba(246,226,229,1)_0%,rgba(248,231,203,1)_100%)]
                   p-6 select-none cursor-default"
        dir="rtl"
      >
        <header className="mb-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] md:text-[22px] font-bold text-[#2e2b2c]">
              المهام الحالية
            </h2>
            <img
              className="w-7 h-7"
              alt="tasks"
              src="https://c.animaapp.com/2u79Z8fE/img/vector-9.svg"
            />
          </div>
          <div className="h-px bg-[#e2c9d3] mx-auto w-[80%]" />
        </header>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8d2e46]"></div>
            </div>
          ) : tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onWithdraw={handleWithdrawClick}
                onOpen={handleOpenTask}
              />
            ))
          ) : (
            <div className="mt-2 rounded-2xl bg-white/70 border border-[#e2c9d3] px-4 py-5 text-center text-sm text-[#7c7570] flex flex-col gap-2">
              <p className="font-semibold text-[#4e4a4b]">
                لا توجد مهام مُسندة لك حاليًا 🌿
              </p>
              <p className="text-[12px] leading-relaxed">
                قد تكون مستخدمًا جديدًا أو لم يتم إسناد مهام لك بعد.
                يمكنك متابعة الفرص التطوعية والتقديم عليها من خلال
                التقديم على المشاريع والخدمات في الصفحة الرئيسية في تكافل.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className="text-[14px] font-medium text-[#4e4a4b] cursor-pointer select-none"
            onClick={onMoreClick}
          >
            عرض المزيد
          </button>
        </div>
      </section>

      {showWithdrawPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          onClick={handleCancelWithdraw}
        >
          <div
            className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-sm sm:max-w-md mx-4 shadow-2xl border-4 border-[#E2C9A2]"
            style={{ direction: 'rtl' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-[#8D2E46] mb-4 text-center">
              تأكيد الانسحاب
            </h2>

            <p className="text-center text-[#6F1A28] mb-6 text-sm">
              هل أنت متأكد من رغبتك في الانسحاب من هذه المهمة؟
              <br />
              <span className="font-semibold">
                {selectedTask?.title}
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleConfirmWithdraw}
                className="px-6 py-2 bg-gradient-to-r from-[#a83451ff] to-[#E4B106] 
                           text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer select-none"
              >
                نعم، تأكيد الانسحاب
              </button>

              <button
                onClick={handleCancelWithdraw}
                className="px-6 py-2 border-2 border-[#86676A] 
                           text-[#86676A] rounded-lg text-sm font-medium 
                           hover:bg-gray-50 transition-colors cursor-pointer select-none"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function UserMain() {
  const navigate = useNavigate();

  const handleTasksMore = () => {
    navigate('/user/tasks');
  };

  return (
    <SidebarLayout>
      <div className="h-full overflow-x-hidden" dir="rtl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <HadithCard />
          <SearchBox />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4 items-center">
            <StatsSection />
            <OpportunitiesSection />
          </div>

          <div className="flex flex-col gap-4">
            <TasksSection onMoreClick={handleTasksMore} />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
