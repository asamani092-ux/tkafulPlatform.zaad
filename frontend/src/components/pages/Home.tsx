import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HandHeart, Lightbulb } from "lucide-react";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Button from "../ui/Button";

interface Stats {
  beneficiaries: number;
  potential_projects: number;
  donations: number;
}
interface BeneficiaryService {
  id: number;
  title: string;
  desc: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ beneficiaries: 0, potential_projects: 0, donations: 0 });
  const [services, setServices] = useState<BeneficiaryService[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-home-stats/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    fetch(`${API_BASE_URL}/api/beneficiary-services/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setServices(d.results || d)).catch(() => {});
  }, []);

  const display = [
    { label: "مستفيد", value: stats.beneficiaries },
    { label: "مشروع محتمل", value: stats.potential_projects },
    { label: "متبرع", value: Math.floor((stats.donations || 0) / 100) },
  ];

  return (
    <div>
      {/* Hero */}
      <header className="px-4 py-16 text-center text-white" style={{ background: "linear-gradient(to left, var(--tmkeen-primary), var(--tmkeen-secondary))" }}>
        <div className="mx-auto max-w-page">
          <h1 className="text-4xl font-extrabold md:text-5xl">منصة تكافل وأثر</h1>
          <p className="mt-3 text-lg" style={{ opacity: 0.9 }}>حيث يلتقي العطاء بالأثر — انضم إلى مجتمع المتكافلين واصنع أثرًا يدوم</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {display.map((s) => (
              <div key={s.label} className="rounded-xl border px-6 py-6" style={{ background: "rgba(255,255,255,.12)", borderColor: "rgba(255,255,255,.25)" }}>
                <div className="text-3xl font-extrabold">{s.value.toLocaleString("en-US")} +</div>
                <div className="mt-1 text-sm" style={{ opacity: 0.9 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <Link to="/about" className="btn-register mt-8 inline-flex">اعرف أكثر</Link>
        </div>
      </header>

      <section className="mx-auto max-w-page px-4 py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">شارك في مشروع تكافلي</h3>
                <p className="text-sm text-brand-gray">اكتشف مشاريعنا المتنوعة واختر ما يناسب اهتماماتك للمشاركة في صنع الأثر.</p>
              </div>
              <HandHeart className="text-secondary" size={32} />
            </div>
            <Link to="/projects"><Button>المشاريع</Button></Link>
          </Card>
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">اقترح مبادرة تكافلية</h3>
                <p className="text-sm text-brand-gray">شاركنا أفكارك لمبادرات جديدة تُحدث أثرًا إيجابيًا في المجتمع.</p>
              </div>
              <Lightbulb className="text-secondary" size={32} />
            </div>
            <Link to="/suggest"><Button variant="secondary">شارك اقتراحك</Button></Link>
          </Card>
        </div>
      </section>

      <section className="bg-surface-muted py-12">
        <div className="mx-auto max-w-page px-4">
          <h2 className="mb-8 text-center text-3xl font-bold text-primary">خدماتنا الأساسية المؤثّرة</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.length > 0 ? services.map((s) => (
              <Card key={s.id}>
                <h3 className="mb-2 text-lg font-bold text-primary">{s.title}</h3>
                <p className="mb-4 text-sm text-brand-gray">{s.desc}</p>
                <Link to={`/request-service`}><Button variant="secondary">اطلب الخدمة</Button></Link>
              </Card>
            )) : <p className="text-center text-brand-gray">لا توجد خدمات حالياً.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
