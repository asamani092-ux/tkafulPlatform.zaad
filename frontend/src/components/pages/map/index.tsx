import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";
import ImpactMapView, { MapLegend, ProductChips } from "./ImpactMapView";
import ContributionModal from "./ContributionModal";
import { getMapIcon } from "./icons";
import type { MapProjectPublic, MapRegion, MapMarker, MapKpi, MapProduct } from "./types";

/** خارطة الأثر متعددة المشاريع (تفقدهم/سقيا…) — عامة، بدون مصادقة، بيانات مجمّعة PDPL-safe. */
export default function ImpactMapPage() {
  const [projects, setProjects] = useState<MapProjectPublic[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [regions, setRegions] = useState<MapRegion[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [kpis, setKpis] = useState<MapKpi[]>([]);
  const [products, setProducts] = useState<MapProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // تحميل قائمة المشاريع مرة واحدة
  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE_URL}/api/map/projects/`)
      .then((r) => { if (!r.ok) throw new Error("fetch"); return r.json(); })
      .then((data: MapProjectPublic[]) => {
        setProjects(data);
        if (data.length) setActiveSlug(data[0].slug);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const activeProject = useMemo(
    () => projects.find((p) => p.slug === activeSlug) || null,
    [projects, activeSlug],
  );

  // تحميل بيانات المشروع النشط
  useEffect(() => {
    if (!activeSlug) return;
    setDataLoading(true);
    setSelectedSlug(null);
    setProductFilter(null);
    const reqs: Promise<Response>[] = [
      fetch(`${API_BASE_URL}/api/map/projects/${activeSlug}/regions/`),
      fetch(`${API_BASE_URL}/api/map/projects/${activeSlug}/markers/`),
      fetch(`${API_BASE_URL}/api/map/projects/${activeSlug}/kpis/`),
    ];
    const isNative = activeProject?.source_type === "native";
    if (isNative) reqs.push(fetch(`${API_BASE_URL}/api/map/products/`));

    Promise.all(reqs)
      .then(async (resps) => {
        if (resps.some((x) => !x.ok)) throw new Error("fetch");
        const [rd, md, kd, pd] = await Promise.all(resps.map((x) => x.json()));
        setRegions(rd);
        setMarkers(md);
        setKpis(kd);
        setProducts(isNative ? pd : []);
      })
      .catch(() => { setRegions([]); setMarkers([]); setKpis([]); setProducts([]); })
      .finally(() => setDataLoading(false));
  }, [activeSlug, activeProject]);

  const selected = useMemo(
    () => regions.find((r) => r.slug === selectedSlug) || null,
    [regions, selectedSlug],
  );

  const regionMarkers = useMemo(
    () => (selected ? markers.filter((m) => m.region_slug === selected.slug) : []),
    [markers, selected],
  );

  if (loading) return <LoadingState title="جاري تحميل الخارطة…" />;
  if (error) return <ErrorState title="تعذّر تحميل البيانات" message="تحقّق من اتصال الخادم وحاول مجدداً." />;
  if (!projects.length) return <EmptyState title="لا توجد مشاريع على الخارطة" message="سيتم عرض البيانات بعد تفعيل مشروع." />;

  const isNative = activeProject?.source_type === "native";

  return (
    <div className="mx-auto max-w-page px-3 py-4 sm:px-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">خارطة الأثر</h1>
        <p className="mt-1 text-sm text-brand-gray">شفافية أثر المشاريع على مستوى المناطق — بدون بيانات شخصية</p>
      </header>

      {/* مبدّل المشاريع */}
      <div className="mb-4 flex flex-wrap gap-2">
        {projects.map((p) => {
          const Icon = getMapIcon(p.icon_key);
          const active = p.slug === activeSlug;
          return (
            <button key={p.slug} type="button"
              onClick={() => setActiveSlug(p.slug)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition"
              style={active
                ? { background: p.color, color: "#fff", borderColor: p.color }
                : { background: "var(--tmkeen-surface)", color: p.color, border: `1.5px solid ${p.color}` }}>
              <Icon size={16} />
              {p.name}
            </button>
          );
        })}
      </div>

      {/* مؤشرات المشروع */}
      {kpis.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 sm:gap-3">
          {kpis.map((k) => {
            const Icon = getMapIcon(k.icon);
            return (
              <Card key={k.key}>
                <div className="text-center">
                  <Icon size={18} className="mx-auto mb-1" style={{ color: activeProject?.color }} />
                  <div className="text-lg font-extrabold text-primary sm:text-xl">
                    {typeof k.value === "number" ? k.value.toLocaleString("en-US") : k.value}{k.unit || ""}
                  </div>
                  <div className="text-xs text-brand-gray">{k.label}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isNative && products.length > 0 && (
        <ProductChips products={products} active={productFilter} onChange={setProductFilter} />
      )}

      {dataLoading ? (
        <LoadingState title="جاري تحميل بيانات المشروع…" />
      ) : (
        <>
          <ImpactMapView
            regions={regions}
            markers={markers}
            selectedSlug={selectedSlug}
            onSelectRegion={setSelectedSlug}
            projectColor={activeProject?.color}
          />
          {activeProject && <MapLegend layers={activeProject.layers} />}
        </>
      )}

      {activeProject?.cta_url && (
        <div className="mt-4">
          <a href={activeProject.cta_url} target="_blank" rel="noopener noreferrer">
            <Button>ساهم في {activeProject.name}</Button>
          </a>
        </div>
      )}

      {selected && (
        <Card className="mt-4">
          <h2 className="mb-2 text-lg font-bold text-primary">{selected.name}</h2>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><span className="text-brand-gray">أسر:</span> <strong>{selected.families_served}</strong></div>
            <div><span className="text-brand-gray">وحدات:</span> <strong>{selected.quantity_distributed}</strong></div>
            <div><span className="text-brand-gray">إنجاز:</span> <strong>{selected.completion_percent}%</strong></div>
            <div><span className="text-brand-gray">نقاط:</span> <strong>{selected.outlets_count}</strong></div>
          </div>
          {regionMarkers.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm">
              {regionMarkers.map((m) => (
                <li key={m.id} className="text-brand-gray">• {m.name}{m.working_hours ? ` — ${m.working_hours}` : ""}</li>
              ))}
            </ul>
          )}
          {isNative && (
            <Button onClick={() => setModalOpen(true)}>ساهم في هذه المنطقة</Button>
          )}
        </Card>
      )}

      {isNative && (
        <ContributionModal open={modalOpen} onClose={() => setModalOpen(false)} region={selected} products={products} defaultProductSlug={productFilter || undefined} />
      )}
    </div>
  );
}
