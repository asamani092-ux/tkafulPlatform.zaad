import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Button from "../ui/Button";
import HeroBand from "../ui/HeroBand";
import { LoadingState, EmptyState, ErrorState } from "../feedback/PageStates";

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

/** قائمة المشاريع العامة — بطاقة موحّدة مع الصفحة الرئيسية. */
export default function Projects() {
  const [projects, setProjects] = useState<PlatformProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/platform/public/projects/`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setProjects(Array.isArray(d) ? d : d.results || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface-muted">
      <HeroBand title="المشاريع" subtitle="استكشف مشاريع المنصّة وافتح صفحة كل مشروع بأدواته المفعّلة." />
      <main className="mx-auto max-w-page px-4 py-12">
        {loading && <LoadingState title="جاري تحميل المشاريع…" />}
        {error && <ErrorState title="تعذّر التحميل" message="حدث خطأ أثناء تحميل المشاريع." />}
        {!loading && !error && projects.length === 0 && (
          <EmptyState title="لا توجد مشاريع" message="ستظهر المشاريع النشطة هنا." />
        )}
        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.slug} className="flex h-full flex-col">
                <Link to={`/projects/${p.slug}`} className="block flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "var(--radius-sm, 4px)",
                        background: p.brand_color || "var(--brand-primary)",
                        display: "inline-block",
                      }}
                    />
                    <h3 className="text-lg font-bold text-primary">{p.name}</h3>
                  </div>
                  <p className="mb-3 text-sm text-brand-gray">{p.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {(p.tools || []).map((t) => (
                      <span key={t} className="rounded border border-surface-border bg-surface px-2 py-0.5 text-xs font-bold text-brand-gray">
                        {TOOL_AR[t] || t}
                      </span>
                    ))}
                  </div>
                </Link>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/projects/${p.slug}`}><Button variant="secondary">التفاصيل</Button></Link>
                  {p.donation_url ? (
                    <a href={p.donation_url} target="_blank" rel="noopener noreferrer">
                      <Button>{p.donation_label || "تبرع الآن"}</Button>
                    </a>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
