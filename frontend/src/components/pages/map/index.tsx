import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";
import ImpactMapView, { MapLegend, ProductChips } from "./ImpactMapView";
import ContributionModal from "./ContributionModal";
import type { MapSummary, MapRegion, MapProduct, MapOutlet } from "./types";

/** خارطة تفقدهم — شفافية التوزيع (عامة، بدون مصادقة). */
export default function ImpactMapPage() {
  const [summary, setSummary] = useState<MapSummary | null>(null);
  const [regions, setRegions] = useState<MapRegion[]>([]);
  const [products, setProducts] = useState<MapProduct[]>([]);
  const [outlets, setOutlets] = useState<MapOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`${API_BASE_URL}/api/map/summary/`),
      fetch(`${API_BASE_URL}/api/map/regions/`),
      fetch(`${API_BASE_URL}/api/map/products/`),
      fetch(`${API_BASE_URL}/api/map/outlets/`),
    ])
      .then(async ([s, r, p, o]) => {
        if (!s.ok || !r.ok || !p.ok || !o.ok) throw new Error("fetch");
        const [sd, rd, pd, od] = await Promise.all([s.json(), r.json(), p.json(), o.json()]);
        setSummary(sd);
        setRegions(rd);
        setProducts(pd);
        setOutlets(od);
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

  if (loading) return <LoadingState title="جاري تحميل الخارطة…" />;
  if (error) return <ErrorState title="تعذّر تحميل البيانات" message="تحقّق من اتصال الخادم وحاول مجدداً." />;
  if (!regions.length) return <EmptyState title="لا توجد مناطق نشطة" message="سيتم عرض البيانات بعد تفعيل المناطق." />;

  return (
    <div className="mx-auto max-w-page px-3 py-4 sm:px-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">خارطة تفقدهم</h1>
        <p className="mt-1 text-sm text-brand-gray">شفافية توزيع المنتجات على مستوى المناطق — بدون بيانات شخصية</p>
      </header>

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <Card><div className="text-center"><div className="text-lg font-extrabold text-primary sm:text-xl">{summary.families_served.toLocaleString("en-US")}</div><div className="text-xs text-brand-gray">أسرة مُخدَّمة</div></div></Card>
          <Card><div className="text-center"><div className="text-lg font-extrabold text-primary sm:text-xl">{summary.products_distributed.toLocaleString("en-US")}</div><div className="text-xs text-brand-gray">منتجات موزّعة</div></div></Card>
          <Card className="col-span-2 sm:col-span-1"><div className="text-center"><div className="text-lg font-extrabold text-primary sm:text-xl">{summary.completion_percent}%</div><div className="text-xs text-brand-gray">نسبة الإنجاز</div></div></Card>
        </div>
      )}

      <ProductChips products={products} active={productFilter} onChange={setProductFilter} />
      <ImpactMapView regions={regions} outlets={outlets} selectedSlug={selectedSlug} productFilter={productFilter} onSelectRegion={setSelectedSlug} />
      <MapLegend />

      {selected && (
        <Card className="mt-4">
          <h2 className="mb-2 text-lg font-bold text-primary">{selected.name}</h2>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><span className="text-brand-gray">أسر:</span> <strong>{selected.families_served}</strong></div>
            <div><span className="text-brand-gray">منتجات:</span> <strong>{selected.quantity_distributed}</strong></div>
            <div><span className="text-brand-gray">إنجاز:</span> <strong>{selected.completion_percent}%</strong></div>
            <div><span className="text-brand-gray">منافذ:</span> <strong>{selected.outlets_count}</strong></div>
          </div>
          {regionOutlets.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm">
              {regionOutlets.map((o) => (
                <li key={o.id} className="text-brand-gray">• {o.name} — {o.working_hours}</li>
              ))}
            </ul>
          )}
          <Button onClick={() => setModalOpen(true)}>ساهم في هذه المنطقة</Button>
        </Card>
      )}

      <ContributionModal open={modalOpen} onClose={() => setModalOpen(false)} region={selected} products={products} defaultProductSlug={productFilter || undefined} />
    </div>
  );
}
