import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../ui/Card";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";
import { fetchPublicMapDetail, fetchPublicMapsIndex } from "./api";
import GenericMapView from "./GenericMapView";
import type { PublicMapDetail, PublicMapIndexEntry, PublicMapItem } from "./types";

/**
 * الخريطة الموحّدة /map — تجمّع كل الطبقات العامة لكل خرائط المشاريع النشطة
 * مع فلترة بالمشروع. تعقيد الدمج O(M·N) على العناصر المعروضة.
 */
export default function MapsAggregator() {
  const [index, setIndex] = useState<PublicMapIndexEntry[]>([]);
  const [details, setDetails] = useState<PublicMapDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchPublicMapsIndex()
      .then(async (maps) => {
        setIndex(maps);
        const all = await Promise.all(maps.map((m) => fetchPublicMapDetail(m.id)));
        setDetails(all);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const projects = useMemo(() => {
    const seen = new Map<string, { slug: string; name: string; brand_color: string }>();
    index.forEach((m) => seen.set(m.project.slug, m.project));
    return [...seen.values()];
  }, [index]);

  const visibleDetails = useMemo(
    () => (projectFilter ? details.filter((d) => d.project.slug === projectFilter) : details),
    [details, projectFilter],
  );

  const visibleItems: PublicMapItem[] = useMemo(
    () => visibleDetails.flatMap((d) => d.items),
    [visibleDetails],
  );

  const selectedEntry = useMemo(() => {
    for (const d of visibleDetails) {
      const item = d.items.find((i) => i.id === selectedItemId);
      if (item) return { detail: d, item };
    }
    return null;
  }, [visibleDetails, selectedItemId]);

  if (loading) return <LoadingState title="جاري تحميل خارطة المنصّة…" />;
  if (error) return <ErrorState title="تعذّر تحميل البيانات" message="تحقّق من اتصال الخادم وحاول مجدداً." />;
  if (!index.length) return <EmptyState title="لا توجد خرائط منشورة" message="ستظهر الخرائط بعد نشرها من إدارة المشاريع." />;

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-bold${active ? " bg-primary text-white" : " bg-surface border border-surface-border"}`;

  return (
    <div className="mx-auto max-w-page px-3 py-4 sm:px-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">خارطة المنصّة الموحّدة</h1>
        <p className="mt-1 text-sm text-brand-gray">كل الطبقات العامة لخرائط المشاريع النشطة — مع فلترة حسب المشروع</p>
      </header>

      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className={chipClass(!projectFilter)} onClick={() => setProjectFilter(null)}>كل المشاريع</button>
        {projects.map((p) => (
          <button key={p.slug} type="button" className={chipClass(projectFilter === p.slug)}
            onClick={() => setProjectFilter(projectFilter === p.slug ? null : p.slug)}>
            {p.name}
          </button>
        ))}
      </div>

      <GenericMapView maps={visibleDetails} visibleItems={visibleItems} selectedItemId={selectedItemId} onSelectItem={setSelectedItemId} />

      {selectedEntry && (
        <Card className="mt-4">
          <h2 className="mb-1 text-lg font-bold text-primary">{selectedEntry.item.name}</h2>
          <p className="mb-3 text-sm text-brand-gray">
            {selectedEntry.detail.project.name} — {selectedEntry.detail.title}
          </p>
          <Link to={`/projects/${selectedEntry.detail.project.slug}/map?map=${selectedEntry.detail.id}`}
            className="text-sm font-bold text-primary hover:underline">
            فتح خريطة المشروع ←
          </Link>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {index.map((m) => (
          <Link key={m.id} to={`/projects/${m.project.slug}/map?map=${m.id}`} className="block">
            <Card className="h-full">
              <h3 className="mb-1 text-base font-bold" style={{ color: m.project.brand_color }}>{m.title}</h3>
              <p className="mb-2 text-xs text-brand-gray">{m.project.name}</p>
              <p className="text-xs text-brand-gray">{m.items_count} عنصر</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
