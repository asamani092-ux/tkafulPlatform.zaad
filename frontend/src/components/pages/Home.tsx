import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HandHeart, Lightbulb, Droplets } from "lucide-react";
import { API_BASE_URL } from "../../config";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import { displayPlatformName } from "../../admin/publicNav";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import KpiCard from "../ui/KpiCard";
import { LoadingState } from "../feedback/PageStates";

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
  donation_url?: string;
  donation_label?: string;
  status: string;
  tools: string[];
}

const TOOL_AR: Record<string, string> = {
  map: "خريطة",
  sponsorships: "كفالات",
  volunteering: "تطوع",
  services: "خدمات",
  reports: "تقارير",
};

/** الصفحة الرئيسية — رأس فاتح وفق نظام الزاد المعتمد (لا هيرو مارون ممتلئ). */
export default function Home() {
  const { settings } = usePlatformSettings();
  const brandName = displayPlatformName(settings.platform_name);
  const [stats, setStats] = useState<Stats>({ beneficiaries: 0, potential_projects: 0, donations: 0 });
  const [services, setServices] = useState<BeneficiaryService[]>([]);
  const [platformProjects, setPlatformProjects] = useState<PlatformProjectCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/public-home-stats/`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_BASE_URL}/api/beneficiary-services/`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_BASE_URL}/api/platform/public/projects/?home=1&limit=6`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([st, sv, pr]) => {
      if (st) setStats(st);
      if (sv) setServices(sv.results || sv);
      if (pr) setPlatformProjects(Array.isArray(pr) ? pr : pr.results || []);
    }).finally(() => setLoading(false));
  }, []);

  const display = [
    { label: "مستفيد", value: stats.beneficiaries },
    { label: "مشروع", value: stats.potential_projects || platformProjects.length },
    { label: "متبرع", value: Math.floor((stats.donations || 0) / 100) },
  ];

  return (
    <div className="bg-surface-muted">
      <header className="border-b border-surface-border bg-surface px-4 py-14 text-center">
        <div className="mx-auto max-w-page">
          <h1 className="text-4xl font-extrabold text-primary md:text-5xl">{brandName}</h1>
          <p className="mt-3 text-lg text-brand-gray">
            منصّة واحدة للعمل الخيري والتطوعي — مشاريع، كفالات، خرائط أثر، وخدمات مجتمعية.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {display.map((s) => (
              <KpiCard key={s.label} label={s.label} value={`${Number(s.value || 0).toLocaleString("en-US")} +`} />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/projects" className="btn-primary inline-flex">استكشف المشاريع</Link>
            {settings.show_map && (
              <Link to="/map" className="btn-register inline-flex" style={{ color: "var(--text-brand)" }}>خارطة الأثر</Link>
            )}
            {settings.show_volunteering && (
              <Link to="/volunteers" className="btn-register inline-flex" style={{ color: "var(--text-brand)" }}>تطوّع معنا</Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-page px-4 py-12">
        <h2 className="mb-2 text-center text-3xl font-bold text-primary">المشاريع النشطة</h2>
        <p className="mb-8 text-center text-sm text-brand-gray">
          مشاريع مختارة للعرض — للاطلاع على الكل استخدم «استكشف المشاريع».
        </p>
        {loading && <LoadingState title="جاري التحميل…" />}
        {!loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {platformProjects.map((p) => (
              <Card key={p.id} className="flex h-full flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: p.brand_color }} />
                    <h3 className="text-lg font-bold text-primary">{p.name}</h3>
                  </div>
                  <Badge variant="success">{p.status === "active" ? "نشط" : (p.status || "نشط")}</Badge>
                </div>
                <p className="mb-3 flex-1 text-sm text-brand-gray">{p.description}</p>
                <div className="mb-4 flex flex-wrap gap-1">
                  {(p.tools || []).map((t) => (
                    <span key={t} className="rounded border border-surface-border bg-surface px-2 py-0.5 text-xs font-bold text-brand-gray">
                      {TOOL_AR[t] || t}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/projects/${p.slug}`}><Button>صفحة المشروع</Button></Link>
                  {p.donation_url ? (
                    <a href={p.donation_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary">{p.donation_label || "تبرع الآن"}</Button>
                    </a>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
        {!loading && platformProjects.length > 0 && (
          <div className="mt-8 text-center">
            <Link to="/projects" className="text-sm font-bold text-primary hover:underline">
              عرض كل المشاريع ←
            </Link>
          </div>
        )}
      </section>

      {(settings.show_volunteering || settings.show_services) && (
      <section className="mx-auto max-w-page px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {settings.show_volunteering && (
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">تطوّع معنا</h3>
                <p className="text-sm text-brand-gray">انضم للمتطوعين وساهم في تنفيذ المشاريع.</p>
              </div>
              <HandHeart className="text-secondary" size={32} />
            </div>
            <Link to="/volunteers"><Button>المتطوعون</Button></Link>
          </Card>
          )}
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">اقترح مبادرة</h3>
                <p className="text-sm text-brand-gray">شاركنا فكرة تصل لنطاق الطلبات في لوحة الإدارة.</p>
              </div>
              <Lightbulb className="text-secondary" size={32} />
            </div>
            <Link to="/suggest"><Button variant="secondary">شارك اقتراحك</Button></Link>
          </Card>
          {settings.show_services && (
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">طلب سقيا الماء</h3>
                <p className="text-sm text-brand-gray">نموذج مرتبط بمشروع السقيا ويظهر في نطاق الطلبات.</p>
              </div>
              <Droplets className="text-secondary" size={32} />
            </div>
            <Link to="/services/water-supply?project=saqya"><Button variant="secondary">قدّم طلباً</Button></Link>
          </Card>
          )}
        </div>
      </section>
      )}

      {settings.show_services && (
      <section className="bg-surface-muted py-12">
        <div className="mx-auto max-w-page px-4">
          <h2 className="mb-8 text-center text-3xl font-bold text-primary">الخدمات</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.length > 0 ? services.map((s) => (
              <Card key={s.id}>
                <h3 className="mb-2 text-lg font-bold text-primary">{s.title}</h3>
                <p className="mb-4 text-sm text-brand-gray">{s.desc}</p>
                <Link to="/request-service"><Button variant="secondary">اطلب الخدمة</Button></Link>
              </Card>
            )) : <p className="text-center text-brand-gray">لا توجد خدمات حالياً.</p>}
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
