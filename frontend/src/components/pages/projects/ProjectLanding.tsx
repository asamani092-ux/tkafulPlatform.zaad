import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HandHeart, Map as MapIcon, Users, FileBarChart, LayoutGrid } from "lucide-react";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { API_BASE_URL } from "../../../config";
import { fetchPublicProject } from "./api";
import { TOOL_LABELS, type PublicProjectDetail } from "./types";
import { donationInContext, resolveToolLink, visibleTools } from "./toolLinks";

const TOOL_ICONS: Record<string, typeof MapIcon> = {
  map: MapIcon,
  sponsorships: HandHeart,
  volunteering: Users,
  services: LayoutGrid,
  reports: FileBarChart,
};

/** صفحة هبوط المشروع — هوية ثابتة + أدوات قابلة للتفعيل + إحصاءات عامة مموّهة. */
export default function ProjectLanding() {
  const { slug = "" } = useParams();
  const [project, setProject] = useState<PublicProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [publicStats, setPublicStats] = useState<Record<string, number | string> | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchPublicProject(slug)
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/saqya/public-stats/?project=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPublicStats(d))
      .catch(() => {});
  }, [slug]);

  if (loading) return <LoadingState title="جاري تحميل المشروع…" />;
  if (error || !project) return <ErrorState title="المشروع غير موجود" message="تأكد من الرابط أو عُد للصفحة الرئيسية." />;

  const linkCtx = { slug: project.slug, mapsCount: project.maps.length, toolConfig: project.tool_config };
  const shownTools = visibleTools(project.tools, linkCtx);
  const showDonation = donationInContext(project.donation_url, project.tools, project.tool_config);

  return (
    <div dir="rtl" className="bg-surface-muted">
      <div className="h-1.5 w-full" style={{ background: project.brand_color || "var(--brand-primary)" }} aria-hidden />
      <header className="border-b border-surface-border bg-surface px-4 py-14 text-center">
        <div className="mx-auto max-w-page">
          <h1 className="text-4xl font-extrabold text-primary">{project.name}</h1>
          {project.description && <p className="mt-3 text-lg text-brand-gray">{project.description}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-brand-gray">
            <Badge variant="success">{project.status === "active" ? "نشط" : project.status}</Badge>
            {project.start_date && <span>البداية: {project.start_date}</span>}
            {project.end_date && <span>النهاية: {project.end_date}</span>}
            {showDonation && (
              <a
                href={project.donation_url}
                className="btn-primary inline-block px-4 py-2 text-sm font-bold"
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.donation_label || "التبرّع عبر المتجر الخارجي"}
              </a>
            )}
          </div>
          {publicStats && (
            <p className="mt-4 text-sm text-brand-gray">
              كفالات: {publicStats.total} · متاحة: {publicStats.available} · مكفولة: {publicStats.sponsored}
            </p>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-page px-4 py-10">
        <h2 className="mb-6 text-2xl font-bold text-primary">أدوات المشروع</h2>
        {shownTools.length === 0 ? (
          <p className="text-brand-gray">لا توجد أدوات مفعّلة بعد.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shownTools.map((tool) => {
              const Icon = TOOL_ICONS[tool] || LayoutGrid;
              const to = resolveToolLink(tool, linkCtx) as string;
              return (
                <Link key={tool} to={to} className="block">
                  <Card className="h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="mb-1 text-lg font-bold text-primary">{TOOL_LABELS[tool] || tool}</h3>
                        {tool === "map" && project.maps.length > 0 && (
                          <p className="text-xs text-brand-gray">{project.maps.map((m) => m.title).join("، ")}</p>
                        )}
                      </div>
                      <Icon className="text-secondary" size={28} />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
