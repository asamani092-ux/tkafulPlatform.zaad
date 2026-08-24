import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HandHeart, Map as MapIcon, Users, FileBarChart, LayoutGrid } from "lucide-react";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { fetchPublicProject } from "./api";
import { WATER_SUPPLY_FORM_ENABLED } from "../../../config";
import { TOOL_LABELS, type PublicProjectDetail } from "./types";
import { labelAr, PROJECT_STATUS_AR } from "../../../i18n/labels";

const TOOL_ICONS: Record<string, typeof MapIcon> = {
  map: MapIcon,
  sponsorships: HandHeart,
  volunteering: Users,
  services: LayoutGrid,
  reports: FileBarChart,
};

/** صفحة هبوط المشروع — هوية ثابتة + أدوات قابلة للتفعيل. */
export default function ProjectLanding() {
  const { slug = "" } = useParams();
  const [project, setProject] = useState<PublicProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchPublicProject(slug)
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingState title="جاري تحميل المشروع…" />;
  if (error || !project) return <ErrorState title="المشروع غير موجود" message="تأكد من الرابط أو عُد للصفحة الرئيسية." />;

  const toolLink = (tool: string): string | null => {
    switch (tool) {
      case "map":
        return project.maps.length ? `/projects/${project.slug}/map` : null;
      case "sponsorships":
        return `/projects/${project.slug}/sponsorships`;
      case "volunteering":
        return "/volunteers";
      case "services":
        if (project.slug === "saqya" && !WATER_SUPPLY_FORM_ENABLED) return null;
        return project.slug === "saqya"
          ? `/services/water-supply?project=${project.slug}`
          : "/services";
      default:
        return null;
    }
  };

  return (
    <div dir="rtl" className="bg-surface-muted">
      {/* شريط لون المشروع كتمييز فقط — لا خلفية مارون ممتلئة */}
      <div className="h-1.5 w-full" style={{ background: project.brand_color || "var(--brand-primary)" }} aria-hidden />
      <header className="border-b border-surface-border bg-surface px-4 py-14 text-center">
        <div className="mx-auto max-w-page">
          <h1 className="text-4xl font-extrabold text-primary">{project.name}</h1>
          {project.description && <p className="mt-3 text-lg text-brand-gray">{project.description}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-brand-gray">
            <Badge variant="success">{labelAr(PROJECT_STATUS_AR, project.status)}</Badge>
            {project.start_date && <span>البداية: {project.start_date}</span>}
            {project.end_date && <span>النهاية: {project.end_date}</span>}
            {project.donation_url && (
              <a href={project.donation_url} className="btn-primary inline-block px-4 py-2 text-sm font-bold"
                target="_blank" rel="noopener noreferrer">
                {project.donation_label || "تبرع الآن"}
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-page px-4 py-10">
        <h2 className="mb-6 text-2xl font-bold text-primary">أدوات المشروع</h2>
        {project.tools.length === 0 ? (
          <p className="text-brand-gray">لا توجد أدوات مفعّلة بعد.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.tools.map((tool) => {
              const Icon = TOOL_ICONS[tool] || LayoutGrid;
              const to = toolLink(tool);
              const body = (
                <Card className="h-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-bold text-primary">{TOOL_LABELS[tool] || tool}</h3>
                      {tool === "map" && project.maps.length > 0 && (
                        <p className="text-xs text-brand-gray">{project.maps.map((m) => m.title).join("، ")}</p>
                      )}
                      {!to && <p className="text-xs text-brand-gray">قريباً</p>}
                    </div>
                    <Icon className="text-secondary" size={28} />
                  </div>
                </Card>
              );
              return to ? (
                <Link key={tool} to={to} className="block">{body}</Link>
              ) : (
                <div key={tool}>{body}</div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
