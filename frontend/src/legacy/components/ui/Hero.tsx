import { useEffect, useState } from 'react';
import { Lightbulb, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCounter from './StatCounter';
import Card from './Card';
import { API_BASE_URL } from '../../config';

interface Stats {
  beneficiaries: number;
  potential_projects: number;
  donations: number;
}

export default function Hero() {
  const [stats, setStats] = useState<Stats>({
    beneficiaries: 67000,
    potential_projects: 2150,
    donations: 1500000,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/public-home-stats/`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching home stats:', error);
      }
    };

    fetchStats();
  }, []);

  const displayStats = [
    { label: 'مستفيد', value: stats.beneficiaries },
    { label: 'مشروع محتمل', value: stats.potential_projects },
    { label: 'متبرع', value: Math.floor(stats.donations / 100) },
  ];

  return (
    <section className="relative isolate text-white bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 py-20 md:py-28">
      {/* تأثير الإضاءة */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,.18), transparent 60%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="animate-slideUp">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
            منصة تكافل وأثر
          </h1>

          {/* النص الفرعي */}
          <div className="mt-4 mx-auto max-w-2xl">
            <div className="flex items-center justify-center gap-2 text-base md:text-lg mb-2">
              <span style={{ color: '#DFC775' }}>حيث يلتقي العطاء بالأثر</span>
              <Lightbulb
                className="shrink-0"
                style={{ color: '#DFC775' }}
                aria-hidden="true"
              />
            </div>
            <div className="text-base md:text-lg text-white/85">
              انضم إلى مجتمع من المتكافلين واصنع أثرًا يدوم
            </div>
          </div>
        </div>

        {/* الكروت */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
          {displayStats.map((stat, index) => (
            <Card
              key={index}
              className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg px-6 py-6 md:py-7 text-center animate-fadeIn transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-sm">
                <StatCounter value={stat.value} />
              </div>
              <div className="mt-1 text-sm md:text-base text-white/85">
                {stat.label}
              </div>
            </Card>
          ))}
        </div>

        {/* الزر */}
        <div className="mt-8 md:mt-10">
          <Link
            to="/about"
            className="
              group relative inline-flex items-center justify-center rounded-full px-8 py-3
              bg-[#DFC775] text-gray-900 font-semibold shadow-sm
              transition-all duration-300
              focus-visible:ring-2 ring-offset-2 ring-brand-600
              hover:bg-[#D1B45F] hover:shadow-lg motion-safe:hover:-translate-y-0.5
            "
          >
            {/* السهم */}
            <ArrowLeft
              className="
                absolute left-5 w-4 h-4 opacity-0 transform -translate-x-2
                transition-all duration-300
                group-hover:opacity-100 group-hover:translate-x-0
              "
            />

            {/* النص */}
            <span
              className="
                transition-transform duration-300
                group-hover:translate-x-2
              "
            >
              اعرف أكثر
            </span>
          </Link>
        </div>
      </div>

      {/* الموجة الزخرفية */}
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
  );
}
