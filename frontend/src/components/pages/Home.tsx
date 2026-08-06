import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HandHeart, Lightbulb } from "lucide-react";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Button from "../ui/Button";
import KpiCard from "../ui/KpiCard";

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
interface PlatformProjectCard {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand_color: string;
  tools: string[];
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ beneficiaries: 0, potential_projects: 0, donations: 0 });
  const [services, setServices] = useState<BeneficiaryService[]>([]);
  const [platformProjects, setPlatformProjects] = useState<PlatformProjectCard[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-home-stats/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    fetch(`${API_BASE_URL}/api/beneficiary-services/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setServices(d.results || d)).catch(() => {});
    fetch(`${API_BASE_URL}/api/platform/public/projects/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setPlatformProjects(d)).catch(() => {});
  }, []);

  const display = [
    { label: "مستفيد", value: stats.beneficiaries },
    { label: "مشروع محتمل", value: stats.potential_projects },
    { label: "متبرع", value: Math.floor((stats.donations || 0) / 100) },
  ];

  return (
    <div className="bg-surface-muted">
      {/* رأس فاتح + عنوان بنص العلامة — وفق Typography Scale للنموذج */}
      <header className="border-b border-surface-border bg-surface px-4 py-14 text-center">
        <div className="mx-auto max-w-page">
          <h1 className="text-4xl font-extrabold text-primary md:text-5xl">منصة تكافل وأثر</h1>
          <p className="mt-3 text-lg text-brand-gray">
            حيث يلتقي العطاء بالأثر — انضم إلى مجتمع المتكافلين واصنع أثرًا يدوم
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {display.map((s) => (
              <KpiCard key={s.label} label={s.label} value={`${s.value.toLocaleString("en-US")} +`} />
            ))}
          </div>
          <Link to="/about" className="btn-register mt-8 inline-flex">اعرف أكثر</Link>
        </div>
      </header>

      {platformProjects.length > 0 && (
        <section className="mx-auto max-w-page px-4 py-12">
          <h2 className="mb-8 text-center text-3xl font-bold text-primary">مشاريع المنصّة</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {platformProjects.map((p) => (
              <Link key={p.slug} to={`/projects/${p.slug}`} className="block">
                <Card className="h-full">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "var(--radius-sm)",
                        background: p.brand_color || "var(--brand-primary)",
                        display: "inline-block",
                      }}
                    />
                    <h3 className="text-lg font-bold text-primary">{p.name}</h3>
                  </div>
                  <p className="mb-3 text-sm text-brand-gray">{p.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.tools.map((t) => (
                      <span key={t} className="rounded-full border border-surface-border bg-surface px-2 py-0.5 text-xs font-bold text-brand-gray">
                        {{ map: "خريطة", sponsorships: "كفالات", volunteering: "تطوع", services: "خدمات", reports: "تقارير" }[t] || t}
                      </span>
                    ))}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-page px-4 py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">شارك في مشروع تكافلي</h3>
                <p className="text-sm text-brand-gray">اكتشف مشاريعنا المتنوعة واختر ما يناسب اهتماماتك للمشاركة في صنع الأثر.</p>
              </div>
              <HandHeart className="text-secondary" size={32} aria-hidden />
            </div>
            <Link to="/projects"><Button>المشاريع</Button></Link>
          </Card>
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">اقترح مبادرة تكافلية</h3>
                <p className="text-sm text-brand-gray">شاركنا أفكارك لمبادرات جديدة تُحدث أثرًا إيجابيًا في المجتمع.</p>
              </div>
              <Lightbulb className="text-secondary" size={32} aria-hidden />
            </div>
            <Link to="/suggest"><Button variant="secondary">شارك اقتراحك</Button></Link>
          </Card>
        </div>
      </section>

      <section className="bg-surface py-12">
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
