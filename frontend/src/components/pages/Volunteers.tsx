import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import HeroBand from "../ui/HeroBand";
import { LoadingState, ErrorState } from "../feedback/PageStates";

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

  return (
    <div>
      <HeroBand title="المتطوعون" subtitle="مجتمع العطاء وأثره في أرقام." />
      <main className="mx-auto max-w-page px-4 py-10">
        {loading && <LoadingState />}
        {error && !loading && <ErrorState title="خطأ" message={error} />}
        {!loading && !error && data && (
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
        )}
      </main>
    </div>
  );
}
