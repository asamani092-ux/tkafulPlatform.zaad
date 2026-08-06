import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import HeroBand from "../ui/HeroBand";
import KpiCard from "../ui/KpiCard";
import AvatarGroup from "../ui/AvatarGroup";
import Breadcrumb from "../ui/Breadcrumb";
import { LoadingState, ErrorState, EmptyState } from "../feedback/PageStates";

interface AggStats {
  total_volunteers: number;
  by_gender: { male: number; female: number };
  total_hours: number;
  total_participations: number;
  total_successes: number;
}

export default function Volunteers() {
  const [data, setData] = useState<AggStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-volunteers-stats/`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: AggStats) => setData(d))
      .catch(() => setError("تعذّر تحميل إحصاءات المتطوعين"))
      .finally(() => setLoading(false));
  }, []);

  const cards = data ? [
    { label: "إجمالي المتطوعين", value: data.total_volunteers },
    { label: "ساعات التطوّع", value: data.total_hours },
    { label: "المشاركات", value: data.total_participations },
    { label: "المهام المنجزة", value: data.total_successes },
    { label: "ذكور", value: data.by_gender.male },
    { label: "إناث", value: data.by_gender.female },
  ] : [];

  const avatars = Array.from({ length: Math.min(6, data?.total_volunteers || 0) }, (_, i) => ({
    name: `متطوّع ${i + 1}`,
  }));

  return (
    <div>
      <HeroBand title="المتطوعون" subtitle="مجتمع العطاء وأثره في أرقام." />
      <main className="mx-auto max-w-page px-4 py-10">
        <Breadcrumb items={[{ label: "الرئيسية", href: "/" }, { label: "المتطوعون" }]} />
        {loading && <LoadingState />}
        {error && !loading && <ErrorState title="خطأ" message={error} />}
        {!loading && !error && !data && <EmptyState title="لا توجد إحصاءات بعد" />}
        {!loading && !error && data && (
          <>
            {avatars.length > 0 && (
              <div className="mb-6 flex items-center gap-3">
                <AvatarGroup people={avatars} max={5} />
                <span className="text-sm text-brand-gray">مجتمع المتطوعين النشط</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {cards.map((c) => (
                <KpiCard key={c.label} label={c.label} value={c.value.toLocaleString("en-US")} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
