import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";
import { fetchPublicMapDetail, fetchPublicMapsIndex, fetchPublicMapSummary } from "./api";
import { applyDynamicFilters, type DynamicFilters } from "./filters";
import DynamicFilterBar from "./DynamicFilterBar";
import GenericMapView from "./GenericMapView";
import MapContributionModal from "./MapContributionModal";
import type { MapSummaryInfo, PublicMapDetail, PublicMapIndexEntry } from "./types";

/** خريطة المشروع — عارض مبني على مخطط MapItemField (فلاتر ديناميكية + تعهد عام). */
export default function ProjectMapPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [index, setIndex] = useState<PublicMapIndexEntry[]>([]);
  const [detail, setDetail] = useState<PublicMapDetail | null>(null);
  const [summary, setSummary] = useState<MapSummaryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<DynamicFilters>({});
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const requestedMapId = Number(searchParams.get("map")) || null;

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchPublicMapsIndex(slug)
      .then(async (maps) => {
        setIndex(maps);
        const target = maps.find((m) => m.id === requestedMapId) || maps[0];
        if (!target) {
          setDetail(null);
          return;
        }
        const [d, s] = await Promise.all([
          fetchPublicMapDetail(target.id),
          fetchPublicMapSummary(target.id).catch(() => null),
        ]);
        setDetail(d);
        setSummary(s);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, requestedMapId]);

  const visibleItems = useMemo(
    () => (detail ? applyDynamicFilters(detail.items, filters) : []),
    [detail, filters],
  );
  const selectedItem = useMemo(
    () => visibleItems.find((i) => i.id === selectedItemId) || null,
    [visibleItems, selectedItemId],
  );
  const publicFieldByKey = useMemo(
    () => new Map((detail?.fields || []).map((f) => [f.key, f])),
    [detail],
  );

  if (loading) return <LoadingState title="جاري تحميل الخريطة…" />;
  if (error) return <ErrorState title="تعذّر تحميل البيانات" message="تحقّق من اتصال الخادم وحاول مجدداً." />;
  if (!detail) return <EmptyState title="لا توجد خريطة منشورة لهذا المشروع" message="سيتم عرض الخريطة بعد نشرها." />;

  return (
    <div className="mx-auto max-w-page px-3 py-4 sm:px-4" dir="rtl">
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: detail.project.brand_color }}>
            {detail.title}
          </h1>
          <Link to={`/projects/${detail.project.slug}`} className="text-xs font-bold text-brand-gray hover:text-primary">
            ← {detail.project.name}
          </Link>
        </div>
        {detail.description && <p className="mt-1 text-sm text-brand-gray">{detail.description}</p>}
      </header>

      {index.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {index.map((m) => (
            <button key={m.id} type="button"
              className={`rounded-full px-3 py-1 text-xs font-bold${m.id === detail.id ? " bg-primary text-white" : " bg-surface border border-surface-border"}`}
              onClick={() => setSearchParams({ map: String(m.id) })}>
              {m.title}
            </button>
          ))}
        </div>
      )}

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Card><div className="text-center"><div className="text-lg font-extrabold text-primary">{summary.items_active}</div><div className="text-xs text-brand-gray">عنصر معروض</div></div></Card>
          <Card><div className="text-center"><div className="text-lg font-extrabold text-primary">{summary.contributions_fulfilled}</div><div className="text-xs text-brand-gray">تعهد منفّذ</div></div></Card>
          <Card><div className="text-center"><div className="text-lg font-extrabold text-primary">{summary.quantity_fulfilled}</div><div className="text-xs text-brand-gray">كمية موزّعة</div></div></Card>
          <Card><div className="text-center"><div className="text-lg font-extrabold text-primary">{summary.contributions_pending}</div><div className="text-xs text-brand-gray">تعهد قيد المراجعة</div></div></Card>
        </div>
      )}

      <DynamicFilterBar fields={detail.fields} filters={filters} onChange={setFilters} />
      <GenericMapView maps={[detail]} visibleItems={visibleItems} selectedItemId={selectedItemId} onSelectItem={setSelectedItemId} />

      {selectedItem && (
        <Card className="mt-4">
          <h2 className="mb-2 text-lg font-bold text-primary">{selectedItem.name}</h2>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {Object.entries(selectedItem.data).map(([key, value]) => {
              const field = publicFieldByKey.get(key);
              if (!field || key === "boundary") return null;
              return (
                <div key={key}>
                  <span className="text-brand-gray">{field.label}:</span>{" "}
                  <strong>{typeof value === "boolean" ? (value ? "نعم" : "لا") : String(value)}</strong>
                </div>
              );
            })}
          </div>
          <Button onClick={() => setModalOpen(true)}>ساهم هنا</Button>
        </Card>
      )}

      <MapContributionModal open={modalOpen} onClose={() => setModalOpen(false)} mapId={detail.id}
        item={selectedItem} fields={detail.fields} />
    </div>
  );
}
