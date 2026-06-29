import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import HeroBand from "../ui/HeroBand";

interface VolStat {
  id: number;
  gender: string;
  total_hours: number;
  participations_count: number;
  successes_count: number;
}

export default function Volunteers() {
  const [data, setData] = useState<VolStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-volunteers-stats/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agg = useMemo(() => {
    const totalHours = data.reduce((s, v) => s + (v.total_hours || 0), 0);
    const participations = data.reduce((s, v) => s + (v.participations_count || 0), 0);
    const successes = data.reduce((s, v) => s + (v.successes_count || 0), 0);
    const males = data.filter((v) => v.gender === "ذكر").length;
    const females = data.filter((v) => v.gender === "أنثى").length;
    return { count: data.length, totalHours, participations, successes, males, females };
  }, [data]);

  const cards = [
    { label: "إجمالي المتطوعين", value: agg.count },
    { label: "ساعات التطوّع", value: agg.totalHours },
    { label: "المشاركات", value: agg.participations },
    { label: "المهام المنجزة", value: agg.successes },
    { label: "ذكور", value: agg.males },
    { label: "إناث", value: agg.females },
  ];

  return (
    <div>
      <HeroBand title="المتطوعون" subtitle="مجتمع العطاء وأثره في أرقام." />
      <main className="mx-auto max-w-page px-4 py-10">
        {loading ? (
          <p className="text-center text-brand-gray">جاري التحميل…</p>
        ) : (
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
