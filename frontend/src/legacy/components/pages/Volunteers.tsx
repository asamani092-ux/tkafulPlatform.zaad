import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { Users, Clock, CheckCircle, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../contexts/AuthContext';


/* ============================
   AnimatedDonut (Spin + باقي الدائرة ذهبي)
   - بدون مسار رمادي: نرسم القطاعين فقط (رجال/نساء)
   - القطاعات تُعرض كاملة، ويُطبق دوران واحد (spin) عند الدخول
   - gapDegrees لفصل بسيط بين الطرفين
   - محتوى مركزي داخل الدائرة (العنوان + رجال/نساء)
============================ */
type DonutSeg = { value: number; color: string; label: string };

function AnimatedDonut({
  size = 300,
  strokeWidth = 22,
  segments,
  startAngle = -90,
  gapDegrees = 4,
  spinOnMount = true,
  spinDurationMs = 900,
  spinTurns = 1,
  centerTitle = 'إحصائية المتطوعين',
}: {
  size?: number;
  strokeWidth?: number;
  segments: DonutSeg[]; // مثال: [{value:52,color:'#711f2c',label:'رجال'},{value:48,color:'#DFC775',label:'نساء'}]
  startAngle?: number;
  gapDegrees?: number;
  spinOnMount?: boolean;
  spinDurationMs?: number;
  spinTurns?: number;
  centerTitle?: string;
}) {
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const total = useMemo(
    () => Math.max(0.0001, segments.reduce((s, x) => s + x.value, 0)),
    [segments]
  );

  // ترتيب مهم: خلي القطاع الأول (رجال) ثم الثاني (نساء بالذهبي) ليظهر باقي الدائرة ذهبياً
  const ordered = segments; // تأكد أن الترتيب: رجال ثم نساء

  // فجوة زاوية بسيطة تمنع تداخل الـrounded caps
  const totalGap = gapDegrees * ordered.length;
  const gapLen = (totalGap / 360) * circumference;
  const usableCirc = Math.max(0, circumference - gapLen);

  const lengths = useMemo(
    () => ordered.map((s) => (s.value / total) * usableCirc),
    [ordered, total, usableCirc]
  );

  const startOffsets = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (let i = 0; i < lengths.length; i++) {
      arr.push(acc);
      acc += lengths[i] + gapLen / ordered.length;
    }
    return arr;
  }, [lengths, gapLen, ordered.length]);

  // دوران عند الدخول فقط
  const [spinning, setSpinning] = useState(spinOnMount);
  useEffect(() => {
    if (!spinOnMount) return;
    const id = setTimeout(() => setSpinning(false), spinDurationMs);
    return () => clearTimeout(id);
  }, [spinOnMount, spinDurationMs]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerTitle}>
        <g
          className={spinning ? 'spin-once' : ''}
          style={{
            transformOrigin: '50% 50%',
            animationDuration: `${spinDurationMs}ms`,
            animationIterationCount: spinTurns,
          } as CSSProperties}
        >
          <g transform={`translate(${size / 2}, ${size / 2}) rotate(${startAngle})`}>
            {/* قطاعات كاملة فقط (لا مسار خلفي رمادي) */}
            {ordered.map((seg, i) => {
              const len = lengths[i] ?? 0;
              const start = startOffsets[i] ?? 0;

              return (
                <circle
                  key={seg.label}
                  r={radius}
                  cx={0}
                  cy={0}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-start}
                />
              );
            })}
          </g>
        </g>
      </svg>

      {/* المحتوى داخل الدائرة (الفراغ الأبيض) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center px-3">
          <div className="text-l md:text-2xl font-bold tracking-wide text-slate-800">{centerTitle}</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {ordered.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-full px-3.5 py-1.5 border border-slate-200 bg-white/90 shadow-sm"
                style={{ pointerEvents: 'auto' }}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span className="text-xs text-slate-700">{s.label}</span>
                <span className="text-sm font-semibold text-slate-900">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS للسبين واحترام تقليل الحركة */}
      <style>{`
        .spin-once {
          animation-name: spinOnceKeyframes;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }
        @keyframes spinOnceKeyframes {
          from { transform: rotate(-360deg); }
          to   { transform: rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .spin-once { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ============================
   Volunteers Page
============================ */
/* Simple shape for volunteers coming from backend */

type Volunteer = {
  id: number;
  gender?: string;
  total_hours?: number;
  participations_count?: number;
  participation_count?: number;
  successes_count?: number;
  success_count?: number;
  [key: string]: any;
};


export default function Volunteers() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // backend
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // English digits
  const toEn = (n: number) => n.toLocaleString('en-US');

  const BRAND_DARK = '#711f2c';
  const BRAND_GOLD = '#DFC775';

    // Load volunteers from backend (public endpoint)
    useEffect(() => {
      const fetchVolunteers = async () => {
        try {
          setIsLoading(true);
          setError(null);

          const res = await fetch(`${API_BASE_URL}/api/public-volunteers-stats/`);
          if (!res.ok) {
            throw new Error('Failed to load volunteers');
          }

          const data = await res.json();
          setVolunteers(data);
        } catch (err) {
          console.error(err);
          setError('حدث خطأ أثناء تحميل بيانات المتطوعين، حاول مرة أخرى.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchVolunteers();
    }, []);
  

  // تأكد أن القطاع الذهبي (نساء) هو الثاني عشان يكمل باقي الدائرة
  // === Derived stats from API data ===
  const totalVolunteers = volunteers.length;

  // gender distribution (supports Arabic & English)
  let maleCount = 0;
  let femaleCount = 0;

  volunteers.forEach((v) => {
    const g = (v.gender || '').toString().trim().toLowerCase();
    if (['m', 'male', 'ذكر'].includes(g)) maleCount += 1;
    else if (['f', 'female', 'أنثى', 'انثى'].includes(g)) femaleCount += 1;
  });

  const knownGender = maleCount + femaleCount;
  const malePercent =
    knownGender > 0 ? Math.round((maleCount / knownGender) * 100) : 52; // fallback to design
  const femalePercent = 100 - malePercent;

  const totalHours = volunteers.reduce(
    (sum, v: any) => sum + (v.total_hours ?? 0),
    0
  );
  const totalParticipations = volunteers.reduce(
    (sum, v: any) => sum + (v.participations_count ?? v.participation_count ?? 0),
    0
  );
  const totalSuccesses = volunteers.reduce(
    (sum, v: any) => sum + (v.successes_count ?? v.success_count ?? 0),
    0
  );

  // Make sure women (gold) segment is second
  const donutData: { segments: DonutSeg[] } = {
    segments: [
      { value: malePercent, color: BRAND_DARK, label: 'رجال' },
      { value: femalePercent, color: BRAND_GOLD, label: 'نساء' },
    ],
  };

  const stats = [
    { icon: Users, value: totalVolunteers, label: 'متطوع', accent: BRAND_DARK },
    { icon: Clock, value: totalHours, label: 'ساعة تطوعية', accent: BRAND_GOLD },
    { icon: CheckCircle, value: totalParticipations, label: 'مشاركات', accent: '#4caf50' },
    { icon: Award, value: totalSuccesses, label: 'نجاحات', accent: '#ff9800' },
  ];


  // ظهور scale خفيف للحاوية (لا يغيّر التخطيط)
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReveal(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="mb-24 bg-[#f7f7f7]">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-0">
        {/* Main Container */}
        <div
          className="
            rounded-3xl bg-white
            shadow-[0_14px_40px_rgba(0,0,0,.04)]
            p-6 md:p-8 relative
            transition-shadow duration-500
            hover:shadow-[0_18px_55px_rgba(0,0,0,.05)]
          "
        >
          {/* Top border glow */}
          <div className="absolute inset-x-6 top-0 h-[2px] bg-[#DFC775]/70 rounded-full pointer-events-none" />

          {/* First Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10 items-center">
            {/* Donut (مع تفاصيل داخلية) */}
            <div className="flex items-center justify-center">
              <div
                className={`
                  origin-center
                  ${reveal ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.985]'}
                  transition-[opacity,transform] duration-500 ease-out
                  motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:transform-none
                `}
              >
                <AnimatedDonut
                  size={300}
                  strokeWidth={22}
                  segments={donutData.segments}
                  gapDegrees={4}
                  spinOnMount
                  spinDurationMs={900}
                  spinTurns={1}
                  centerTitle="إحصائية المتطوعين"
                />
              </div>
            </div>

            {/* Bigger Stats Cards (يسار) */}
            <div className="grid grid-cols-2 gap-5">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="
                      flex items-center gap-5
                      bg-white/90
                      border border-[#f1f1f1]
                      rounded-2xl
                      p-5
                      shadow-sm
                      transition-all duration-300
                      hover:shadow-md hover:-translate-y-1
                      min-h-[110px]
                    "
                    style={{ animation: `fadeUp 0.45s ease-out ${i * 0.06}s both` } as CSSProperties}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
                      style={{ backgroundColor: `${stat.accent}15`, color: stat.accent }}
                    >
                      <Icon size={32} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-slate-900 leading-tight">
                        {toEn(stat.value)}
                      </span>
                      <span className="text-base text-slate-500">{stat.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA Buttons */}
          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="
                  rounded-full bg-[#711f2c]
                  hover:bg-[#5a1823]
                  text-white font-semibold
                  px-10 py-3.5
                  transition-all duration-200
                  focus-visible:ring-2 ring-[#711f2c] ring-offset-2 ring-offset-white
                  shadow-[0_10px_25px_rgba(113,31,44,.35)]
                  hover:shadow-lg
                "
              >
                تسجيل جديد كمتطوع
              </button>

              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="
                  rounded-full border-2 border-[#DFC775]
                  text-[#711f2c]
                  bg-white
                  hover:bg-[#fff8e3]
                  font-semibold
                  px-10 py-3.5
                  transition-all duration-200
                  focus-visible:ring-2 ring-[#DFC775] ring-offset-2 ring-offset-white
                  hover:shadow-lg
                "
              >
                تسجيل الدخول
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => navigate(user?.role === 'admin' ? '/Admin' : '/user/main')}
                className="
                  rounded-full bg-[#711f2c]
                  hover:bg-[#5a1823]
                  text-white font-semibold
                  px-10 py-3.5
                  transition-all duration-200
                  focus-visible:ring-2 ring-[#711f2c] ring-offset-2 ring-offset-white
                  shadow-[0_10px_25px_rgba(113,31,44,.35)]
                  hover:shadow-lg
                "
              >
                الذهاب إلى لوحة التحكم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* keyframes لظهور بطاقات الإحصائيات */}
      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
