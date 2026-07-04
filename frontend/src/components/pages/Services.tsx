import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import HeroBand from "../ui/HeroBand";

interface Service {
  id: number;
  title: string;
  desc: string;
  status: string;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-services/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setServices(d.results || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <HeroBand title="الخدمات" subtitle="فرص تطوعية وخدمات يمكنك المشاركة فيها لصنع الأثر." />
      <main className="mx-auto max-w-page px-4 py-10">
        {loading ? (
          <p className="text-center text-brand-gray">جاري التحميل…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.length === 0 ? (
              <p className="col-span-full text-center text-brand-gray">لا توجد خدمات حالياً.</p>
            ) : (
              services.map((s) => (
                <Card key={s.id}>
                  <div className="mb-2"><Badge variant="primary">{s.status}</Badge></div>
                  <h3 className="mb-2 text-lg font-bold text-primary">{s.title}</h3>
                  <p className="mb-4 text-sm text-brand-gray">{s.desc}</p>
                  <Link to="/signin"><Button variant="secondary">تطوّع الآن</Button></Link>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
