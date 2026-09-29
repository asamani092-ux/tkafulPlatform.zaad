import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import HeroBand from "../ui/HeroBand";
import { LoadingState, ErrorState, EmptyState } from "../feedback/PageStates";

interface AggStats {
  total_volunteers: number;
  by_gender: { male: number; female: number };
  total_hours: number;
  total_participations: number;
  total_successes: number;
}

interface PlatformProjectCard {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand_color: string;
  status: string;
  tools: string[];
  tool_config?: Record<string, { show_opportunities?: boolean }>;
}

function volunteeringOpportunities(projects: PlatformProjectCard[]): PlatformProjectCard[] {
  return projects.filter(
    (p) =>
      p.tools?.includes("volunteering") &&
      p.tool_config?.volunteering?.show_opportunities !== false,
  );
}

export default function Volunteers() {
  const [data, setData] = useState<AggStats | null>(null);
  const [projects, setProjects] = useState<PlatformProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/public-volunteers-stats/`).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(`${API_BASE_URL}/api/platform/public/projects/`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([stats, pr]) => {
        setData(stats as AggStats);
        setProjects(Array.isArray(pr) ? pr : pr.results || []);
      })
      .catch(() => setError("تعذّر تحميل بيانات المتطوعين"))
      .finally(() => setLoading(false));
  }, []);

  const opportunities = useMemo(() => volunteeringOpportunities(projects), [projects]);

  const cards = data
    ? [
        { label: "إجمالي المتطوعين", value: data.total_volunteers },
        { label: "ساعات التطوّع", value: data.total_hours },
        { label: "المشاركات", value: data.total_participations },
        { label: "المهام المنجزة", value: data.total_successes },
        { label: "ذكور", value: data.by_gender.male },
        { label: "إناث", value: data.by_gender.female },
      ]
    : [];

  return (
    <div>
      <HeroBand title="المتطوعون" subtitle="مجتمع العطاء — إحصاءات المنصّة وفرص التطوّع المتاحة." />
      <main className="mx-auto max-w-page px-4 py-10">
        {loading && <LoadingState />}
        {error && !loading && <ErrorState title="خطأ" message={error} />}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {cards.map((c) => (
                <Card key={c.label}>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-primary">{c.value.toLocaleString("en-US")}</div>
                    <div className="mt-1 text-xs text-brand-gray">{c.label}</div>
                  </div>
                </Card>
              ))}
            </div>

            <section className="mt-12">
              <h2 className="mb-2 text-center text-2xl font-bold text-primary">فرص التطوّع</h2>
              <p className="mb-8 text-center text-sm text-brand-gray">
                مشاريع المنصّة التي فُعّل فيها أداة التطوّع — انضم عبر صفحة المشروع.
              </p>
              {opportunities.length === 0 ? (
                <EmptyState title="لا توجد فرص حالياً" message="ستُعرض المشاريع ذات أداة التطوّع هنا عند تفعيلها." />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {opportunities.map((p) => (
                    <Card key={p.id} className="flex h-full flex-col">
                      <div className="mb-2 flex items-center gap-2">
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: p.brand_color }} />
                        <h3 className="text-lg font-bold text-primary">{p.name}</h3>
                        <Badge variant="success">{p.status === "active" ? "نشط" : p.status || "نشط"}</Badge>
                      </div>
                      <p className="mb-4 flex-1 text-sm text-brand-gray">{p.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/projects/${p.slug}/volunteer`}>
                          <Button>تطوّع في المشروع</Button>
                        </Link>
                        <Link to={`/projects/${p.slug}`}>
                          <Button variant="secondary">صفحة المشروع</Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
