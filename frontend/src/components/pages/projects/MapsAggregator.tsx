import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../ui/Card";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";
import { fetchPublicMapDetail, fetchPublicMapsIndex, fetchPublicMapSummary } from "./api";
import {
  applyDynamicFilters,
  mergeFields,
  sumMasked,
  displayFieldValue,
  type DynamicFilters,
} from "./filters";
import DynamicFilterBar from "./DynamicFilterBar";
import GenericMapView from "./GenericMapView";
import Select from "../../ui/Select";
import type { MapSummaryInfo, PublicMapDetail, PublicMapIndexEntry, PublicMapItem } from "./types";

/**
 * الخريطة الموحّدة /map — كل الطبقات العامة لخرائط المشاريع النشطة:
 * KPI مجمّعة + فلترة بالمشروع + فلاتر ديناميكية موحّدة.
 */
export default function MapsAggregator() {
  const [index, setIndex] = useState<PublicMapIndexEntry[]>([]);
  const [details, setDetails] = useState<PublicMapDetail[]>([]);
  const [summaries, setSummaries] = useState<Map<number, MapSummaryInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<DynamicFilters>({});
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchPublicMapsIndex()
      .then(async (maps) => {
        setIndex(maps);
        const [allDetails, allSummaries] = await Promise.all([
          Promise.all(maps.map((m) => fetchPublicMapDetail(m.id))),
          Promise.all(maps.map((m) => fetchPublicMapSummary(m.id).catch(() => null))),
        ]);
        setDetails(allDetails);
        setSummaries(
          new Map(
            maps.flatMap((m, i) => {
              const s = allSummaries[i];
              return s ? [[m.id, s] as [number, MapSummaryInfo]] : [];
            }),
          ),
        );
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

  const mergedFields = useMemo(
    () => mergeFields(visibleDetails.map((d) => d.fields)),
    [visibleDetails],
  );

  const visibleItems: PublicMapItem[] = useMemo(
    () => applyDynamicFilters(visibleDetails.flatMap((d) => d.items), filters),
    [visibleDetails, filters],
  );

  const kpis = useMemo(() => {
    const visible = visibleDetails
      .map((d) => summaries.get(d.id))
      .filter((s): s is MapSummaryInfo => !!s);
    const fulfilled = sumMasked(visible.map((s) => s.contributions_fulfilled));
    return {
      items: visibleItems.length,
      fulfilledDisplay: fulfilled.masked
        ? (fulfilled.total > 0 ? `${fulfilled.total}+` : "<5")
        : fulfilled.total,
      quantity: visible.reduce((acc, s) => acc + s.quantity_fulfilled, 0),
    };
  }, [visibleDetails, summaries, visibleItems.length]);

  const selectedEntry = useMemo(() => {
    for (const d of visibleDetails) {
      const item = d.items.find((i) => i.id === selectedItemId);
      if (item && visibleItems.some((v) => v.id === item.id)) return { detail: d, item };
    }
    return null;
  }, [visibleDetails, visibleItems, selectedItemId]);

  const selectedFieldByKey = useMemo(
    () => new Map((selectedEntry?.detail.fields || []).map((f) => [f.key, f])),
    [selectedEntry],
  );

  if (loading) return <LoadingState title="جاري تحميل خارطة المنصّة…" />;
  if (error) return <ErrorState title="تعذّر تحميل البيانات" message="تحقّق من اتصال الخادم وحاول مجدداً." />;
  if (!index.length) return <EmptyState title="لا توجد خرائط منشورة" message="ستظهر الخرائط بعد نشرها من إدارة المشاريع." />;

  return (
    <div className="mx-auto max-w-page px-3 py-4 sm:px-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">خارطة المنصّة الموحّدة</h1>
        <p className="mt-1 text-sm text-brand-gray">كل الطبقات العامة لخرائط المشاريع النشطة — بدون بيانات شخصية</p>
      </header>

      {/* KPI مجمّعة — الأعداد الحسّاسة تبقى مقنّعة (<5) */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Card><div className="text-center"><div className="text-lg font-extrabold text-primary sm:text-xl">{kpis.items}</div><div className="text-xs text-brand-gray">عنصر معروض</div></div></Card>
        <Card><div className="text-center"><div className="text-lg font-extrabold text-primary sm:text-xl">{kpis.fulfilledDisplay}</div><div className="text-xs text-brand-gray">كمية منفّذة (مجمّع)</div></div></Card>
        <Card><div className="text-center"><div className="text-lg font-extrabold text-primary sm:text-xl">{kpis.quantity.toLocaleString("en-US")}</div><div className="text-xs text-brand-gray">كمية موزّعة</div></div></Card>
      </div>

      <DynamicFilterBar
        fields={mergedFields}
        filters={filters}
        onChange={setFilters}
        leading={
          <Select
            id="filter-project"
            label="المشروع"
            value={projectFilter ?? "__all__"}
            onChange={(e) => setProjectFilter(e.target.value === "__all__" ? null : e.target.value)}
          >
            <option value="__all__">كل المشاريع</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </Select>
        }
      />

      <GenericMapView maps={visibleDetails} visibleItems={visibleItems} selectedItemId={selectedItemId} onSelectItem={setSelectedItemId} />

      {selectedEntry && (
        <Card className="mt-4">
          <h2 className="mb-1 text-lg font-bold text-primary">{selectedEntry.item.name}</h2>
          <p className="mb-3 text-sm text-brand-gray">
            {selectedEntry.detail.project.name} — {selectedEntry.detail.title}
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {Object.entries(selectedEntry.item.data).map(([key, value]) => {
              const field = selectedFieldByKey.get(key);
              if (!field || key === "boundary") return null;
              return (
                <div key={key}>
                  <span className="text-brand-gray">{field.label}:</span>{" "}
                  <strong>{displayFieldValue(field, value)}</strong>
                </div>
              );
            })}
          </div>
          <Link to={`/projects/${selectedEntry.detail.project.slug}/map?map=${selectedEntry.detail.id}`}
            className="text-sm font-bold text-primary hover:underline">
            فتح خريطة المشروع ←
          </Link>
        </Card>
      )}
    </div>
  );
}
