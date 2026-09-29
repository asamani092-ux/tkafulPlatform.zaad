import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import Card from "../../ui/Card";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";
import ImpactMapView from "./ImpactMapView";
import type { MapOutlet, MapRegion, MapSummary } from "./types";
import { PRIORITY_LABELS } from "./types";

/**
 * خارطة الأثر القديمة (Leaflet + /api/map/*) — احتياط عند غياب خرائط المشاريع المنشورة
 * أو عند فشل Google Maps في العارض الموحّد.
 */
export default function LegacyImpactMapPage() {
  const [regions, setRegions] = useState<MapRegion[]>([]);
  const [outlets, setOutlets] = useState<MapOutlet[]>([]);
  const [summary, setSummary] = useState<MapSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`${API_BASE_URL}/api/map/regions/`).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`${API_BASE_URL}/api/map/outlets/`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE_URL}/api/map/summary/`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([rd, od, sd]) => {
        setRegions(Array.isArray(rd) ? rd : []);
        setOutlets(Array.isArray(od) ? od : []);
        setSummary(sd);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => regions.find((r) => r.slug === selectedSlug) || null,
    [regions, selectedSlug],
  );

  const regionOutlets = useMemo(
    () => (selected ? outlets.filter((o) => o.region_slug === selected.slug) : []),
    [outlets, selected],
  );

  if (loading) return <LoadingState title="جاري تحميل خارطة الأثر…" />;
  if (error) return <ErrorState title="تعذّر تحميل البيانات" message="تحقّق من اتصال الخادم وحاول مجدداً." />;
  if (!regions.length) {
    return (
      <EmptyState
        title="لا توجد بيانات على الخريطة"
        message="شغّل seed_impact_map على الخادم أو انشر خرائط المشاريع من الإدارة."
      />
    );
  }

  const kpis = summary
    ? [
        { label: "أسر مستفيدة", value: summary.families_served },
        { label: "وحدات موزّعة", value: summary.products_distributed },
        { label: "نسبة الإنجاز", value: `${summary.completion_percent}%` },
        { label: "مناطق نشطة", value: summary.regions_active },
        { label: "منافذ", value: summary.outlets_active },
      ]
    : [];

  return (
    <div className="mx-auto max-w-page px-3 py-4 sm:px-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">خارطة الأثر</h1>
        <p className="mt-1 text-sm text-brand-gray">
          عرض تفقدهم (مناطق الرياض) — طبقة احتياطية عند غياب خرائط المشاريع أو مفتاح Google Maps
        </p>
      </header>

      {kpis.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {kpis.map((k) => (
            <Card key={k.label}>
              <div className="text-center">
                <div className="text-lg font-extrabold text-primary sm:text-xl">
                  {typeof k.value === "number" ? k.value.toLocaleString("en-US") : k.value}
                </div>
                <div className="text-xs text-brand-gray">{k.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ImpactMapView
        regions={regions}
        outlets={outlets}
        selectedSlug={selectedSlug}
        onSelectRegion={setSelectedSlug}
      />

      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-brand-gray">
        {(Object.keys(PRIORITY_LABELS) as Array<keyof typeof PRIORITY_LABELS>).map((p) => (
          <span key={p} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: p === "high" ? "#dc2626" : p === "medium" ? "#f97316" : "#16a34a" }}
            />
            {PRIORITY_LABELS[p]}
          </span>
        ))}
      </div>

      {selected && (
        <Card className="mt-4">
          <h2 className="mb-2 text-lg font-bold text-primary">{selected.name}</h2>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <span className="text-brand-gray">أسر:</span> <strong>{selected.families_served}</strong>
            </div>
            <div>
              <span className="text-brand-gray">وحدات:</span> <strong>{selected.quantity_distributed}</strong>
            </div>
            <div>
              <span className="text-brand-gray">إنجاز:</span> <strong>{selected.completion_percent}%</strong>
            </div>
            <div>
              <span className="text-brand-gray">منافذ:</span> <strong>{selected.outlets_count}</strong>
            </div>
          </div>
          {regionOutlets.length > 0 && (
            <ul className="space-y-1 text-sm text-brand-gray">
              {regionOutlets.map((m) => (
                <li key={m.id}>
                  • {m.name}
                  {m.working_hours ? ` — ${m.working_hours}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
