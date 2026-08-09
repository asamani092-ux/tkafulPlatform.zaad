import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";
import type { PlatformProject } from "../projects/types";

/** نطاق الكفالات — قائمة مشاريع الكفالات والانتقال لبوابة كل مشروع. */
export default function SponsorshipsHub() {
  const { access } = useAuth();
  const [projects, setProjects] = useState<PlatformProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!access) return;
    authFetch("/api/platform/projects/")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const arr: PlatformProject[] = Array.isArray(d) ? d : d.results || [];
        setProjects(arr.filter((p) => (p.tools || []).includes("sponsorships")));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [access]);

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">الكفالات</h1>
      <p className="mb-6 text-sm text-brand-gray">إدارة الطلبات والفواتير والتوثيق عبر بوابة كل مشروع.</p>
      {loading && <LoadingState title="جاري تحميل مشاريع الكفالات…" />}
      {error && <ErrorState title="تعذّر التحميل" message="تحقّق من الاتصال." />}
      {!loading && !error && projects.length === 0 && (
        <EmptyState title="لا توجد مشاريع كفالات مفعّلة" message="فعّل أداة الكفالات من نطاق المشاريع." />
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <Card key={p.id}>
            <div className="mb-2 flex items-center gap-2">
              <span style={{ width: 12, height: 12, borderRadius: 3, background: p.brand_color }} />
              <h2 className="font-bold text-primary">{p.name}</h2>
            </div>
            <p className="mb-4 text-sm text-brand-gray">{p.description}</p>
            <Link to={`/projects/${p.slug}/sponsorships`}>
              <Button>فتح بوابة الكفالات</Button>
            </Link>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
