import { useState, useMemo, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Service } from '../../types';
import Icon from '../ui/Icon';
import Chip from '../ui/Chip';
import ServiceCard from '../ui/ServiceCard';
import ServiceDialog from '../ui/ServiceDialog';
import { API_BASE_URL } from '../../config';


const filters = [
  { id: 'All', label: 'الكل' },
  { id: 'متاحة', label: 'الخدمات المتاحة' },
  { id: 'قادمة', label: 'الخدمات القادمة' },
  { id: 'مكتملة', label: 'الخدمات المكتملة' },
];

const WATER_SUPPLY_KEYWORDS = ['water supply', 'سقيا ماء', 'سقيا', 'الماء', 'مشروع السقيا'];

const normalizeText = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, ' ');

const isWaterSupplyService = (title: string) => {
  const normalizedTitle = normalizeText(title);
  return WATER_SUPPLY_KEYWORDS.some((keyword) => normalizedTitle.includes(normalizeText(keyword)));
};

const serviceSteps = [
  {
    num: 1,
    label: 'اختر نوع الكفالة',
    desc: 'تصفح الخدمات المتاحة التي تريد دعمها',
    icon: 'Lightbulb',
    above: true,
  },
  {
    num: 2,
    label: 'مراجعة واعتماد',
    desc: 'يقوم الفريق المسؤول بمراجعة طلبك واعتماده خلال 24 ساعة',
    icon: 'ClipboardList',
    above: false,
  },
  {
    num: 3,
    label: 'التحضير والتوصيل',
    desc: 'يتم تكليف أفضل المتطوعين لتحضير وتوصيل الخدمة للمستفيدين',
    icon: 'HandHeart',
    above: true,
  },
  {
    num: 4,
    label: 'التوثيق الميداني',
    desc: 'يقوم المندوب بتوثيق عملية التسليم بالصور والفيديوهات',
    icon: 'CheckCircle2',
    above: false,
  },
  {
    num: 5,
    label: 'تقرير التنفيذ',
    desc: 'تستلم تقريراً مفصلاً عن التنفيذ مع الصور والتوثيق كامل',
    icon: 'CheckCircle2',
    above: true,
  },
];

function Services() {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [activeService, setActiveService] = useState<Service | null>(null);
  const navigate = useNavigate();

    // Backend data state
    const [servicesData, setServicesData] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
      const fetchServices = async () => {
        try {
          setLoading(true);
          setError(null);

          const res = await fetch(`${API_BASE_URL}/api/public-services/`);
          if (!res.ok) {
            throw new Error('فشل في تحميل الخدمات');
          }

          const data = await res.json();
          setServicesData(data.results || data);
        } catch (err) {
          console.error(err);
          setError('حدث خطأ أثناء تحميل الخدمات');
        } finally {
          setLoading(false);
        }
      };

      fetchServices();
    }, []);
  
  

    const filteredServices = useMemo(
      () =>
        selectedFilter === 'All'
          ? servicesData
          : servicesData.filter((service) => service.status === selectedFilter),
      [selectedFilter, servicesData]
    );
  

  const servicesList = useMemo(
    () =>
      filteredServices.map((service, index) => (
        <div
          key={service.id}
          className="animate-fadeIn"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <ServiceCard
            service={service}
            onDetails={setActiveService}
            onRequestService={(selectedService: Service) =>
              navigate(isWaterSupplyService(selectedService.title) ? '/services/water-supply' : '/request-service')
            }
            onVolunteer={() => navigate('/volunteers')}
          />
        </div>
      )),
    [filteredServices, navigate]
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
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
              الخدمات
            </h1>
            <p className="mt-4 mx-auto flex items-center justify-center gap-2 max-w-2xl text-base md:text-lg text-white/85">
              اكتشف خدماتنا المتنوعة وانضم إلى مبادراتنا التكافلية
              <Icon
                name="Lightbulb"
                size={22}
                style={{ color: '#DFC775' }}
                aria-hidden="true"
                className="shrink-0"
              />
            </p>
          </div>
        </div>

        {/* الموجة الزخرفية تحت الهيرو */}
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

      {/* Service Timeline */}
      <section className="py-12 md:py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative" dir="rtl">
            <div className="md:hidden relative space-y-5">
              <div className="absolute right-1/2 top-3 bottom-3 w-1 -translate-x-1/2 rounded-full bg-brand-600/80" aria-hidden />
              {serviceSteps.map(({ num, label, desc, icon }) => (
                <div key={num} className="relative flex flex-col items-center gap-3">
                  <div className="z-10 w-8 h-8 rounded-full border-2 border-brand-600 bg-white shadow-sm ring-2 ring-white flex items-center justify-center">
                    <Icon name={icon} size={14} className="text-brand-600" />
                  </div>
                  <div className="w-full rounded-xl border border-gray-100 bg-white p-3 text-right shadow-sm">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{num}. {label}</p>
                    <p className="mt-2 text-xs text-gray-600 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <div
                className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600 shadow-sm"
                aria-hidden
              />
              <div className="relative flex justify-between items-center gap-2 md:gap-4">
                {serviceSteps.map(({ num, label, desc, icon, above }) => (
                  <div
                    key={num}
                    className="flex flex-1 flex-col items-center justify-center min-w-0"
                  >
                    {above ? (
                      <div className="text-center px-0.5 mb-2 space-y-0.5">
                        <p className="text-xs md:text-sm font-bold text-gray-900 leading-tight">
                          {num}. {label}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500 leading-snug max-w-[140px] md:max-w-[160px] mx-auto">
                          {desc}
                        </p>
                      </div>
                    ) : (
                      <span className="h-20 md:h-24 shrink-0" aria-hidden />
                    )}
                    <div
                      className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-brand-600 bg-white shadow-md ring-2 ring-white flex items-center justify-center"
                      aria-hidden
                    >
                      <Icon
                        name={icon}
                        size={18}
                        className="text-brand-600"
                      />
                    </div>
                    {above ? (
                      <span className="h-20 md:h-24 shrink-0" aria-hidden />
                    ) : (
                      <div className="text-center px-0.5 mt-2 space-y-0.5">
                        <p className="text-xs md:text-sm font-bold text-gray-900 leading-tight">
                          {num}. {label}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500 leading-snug max-w-[140px] md:max-w-[160px] mx-auto">
                          {desc}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Chips */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Request Service Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => navigate('/request-service')}
              className="bg-[#6F1A28] text-white px-6 py-3 rounded-full font-bold text-lg hover:bg-[#8d2e46] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Icon name="Package" size={20} />
              هل تحتاج خدمة؟ اطلبها الآن
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {filters.map((filter) => (
              <Chip
                key={filter.id}
                selected={selectedFilter === filter.id}
                onClick={() => setSelectedFilter(filter.id)}
              >
                {filter.label}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicesList}
              </div>

              {filteredServices.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">لا توجد خدمات في هذه الفئة</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <ServiceDialog
        service={activeService}
        open={!!activeService}
        onClose={() => setActiveService(null)}
      />
    </div>
  );
}

export default memo(Services);
