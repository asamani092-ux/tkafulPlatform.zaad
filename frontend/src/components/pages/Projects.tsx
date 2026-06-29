import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Tabs from "../ui/Tabs";
import HeroBand from "../ui/HeroBand";

interface Project {
  id: number;
  title: string;
  desc: string;
  description?: string;
  category: string;
  beneficiaries: number;
  location: string;
  status_display: string;
}

const FILTERS = [
  { key: "All", label: "الكل" },
  { key: "أساسي", label: "أساسي" },
  { key: "مجتمعي", label: "مجتمعي" },
  { key: "مؤسسي", label: "مؤسسي" },
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-projects/`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: Project[]) => setProjects(d))
      .catch(() => setError("حدث خطأ أثناء تحميل المشاريع"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === "All" ? projects : projects.filter((p) => p.category === filter)),
    [filter, projects]
  );

  return (
    <div>
      <HeroBand title="المشاريع" subtitle="اكتشف مشاريعنا المتنوعة واختر ما يناسب اهتماماتك للمشاركة في صنع الأثر." />
      <main className="mx-auto max-w-page px-4 py-10">
        <div className="mb-6">
          <Tabs tabs={FILTERS} active={filter} onChange={setFilter} />
        </div>
        {loading && <p className="text-center text-brand-gray">جاري التحميل…</p>}
        {error && <p className="text-center" style={{ color: "var(--tmkeen-danger)" }}>{error}</p>}
        {!loading && !error && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 ? (
              <p className="col-span-full text-center text-brand-gray">لا توجد مشاريع.</p>
            ) : (
              filtered.map((p) => (
                <Card key={p.id}>
                  <div className="mb-2 flex items-center justify-between">
                    {p.category && <Badge variant="primary">{p.category}</Badge>}
                    {p.status_display && <Badge variant="success">{p.status_display}</Badge>}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-primary">{p.title}</h3>
                  <p className="mb-3 text-sm text-brand-gray">{p.description || p.desc}</p>
                  <div className="flex justify-between text-xs text-brand-gray">
                    {p.location && <span>{p.location}</span>}
                    <span>{p.beneficiaries} مستفيد</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
