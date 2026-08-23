import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { authFetch } from "../../../lib/api";
import { API_BASE_URL } from "../../../config";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { ADMIN_DOMAINS } from "../../../admin/domains";
import { visibleDomainsForUser } from "../../../admin/access";
import { useMembershipsContext } from "../../../contexts/MembershipsContext";

interface DomainCounts {
  projects: number | null;
  volunteers: number | null;
  requests: number | null;
  sponsorships: number | null;
  maps: number | null;
  staff: number | null;
  reports: number | null;
}

async function countList(url: string, access: string | null): Promise<number | null> {
  try {
    const res = access
      ? await authFetch(url)
      : await fetch(`${API_BASE_URL}${url}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) return data.length;
    if (typeof data.count === "number") return data.count;
    if (Array.isArray(data.results)) return data.results.length;
    if (Array.isArray(data.memberships)) return data.memberships.length;
    if (Array.isArray(data.maps)) return data.maps.length;
    if (Array.isArray(data.sections)) return data.sections.length;
    return null;
  } catch {
    return null;
  }
}

/** نظرة عامة — بطاقة KPI واحدة لكل نطاق عمل. */
export default function AdminMain() {
  const { access } = useAuth();
  const { access } = useMembershipsContext();
  const [counts, setCounts] = useState<DomainCounts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    (async () => {
      try {
        const [projects, volunteers, requests, maps, staff, suggestions] = await Promise.all([
          countList("/api/platform/projects/", access),
          countList("/api/volunteers/", access),
          countList("/api/service-requests/?status=PENDING", access),
          countList("/api/maps/", access),
          countList("/api/dashboard/executive/", access),
          countList("/api/suggestions/", access),
        ]);
        // كفالات: عدد المشاريع التي تفعّل أداة الكفالات
        let sponsorships: number | null = null;
        try {
          const pr = await authFetch("/api/platform/projects/");
          if (pr.ok) {
            const list = await pr.json();
            const arr = Array.isArray(list) ? list : list.results || [];
            sponsorships = arr.filter((p: { tools?: string[] }) => (p.tools || []).includes("sponsorships")).length;
          }
        } catch { /* ignore */ }

        if (!cancelled) {
          setCounts({
            projects,
            volunteers,
            requests: requests != null || suggestions != null
              ? (requests || 0) + (suggestions || 0)
              : null,
            sponsorships,
            maps,
            staff,
            reports: null,
          });
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [access]);

  const visible = visibleDomainsForUser(access);

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">نظرة عامة</h1>
      <p className="mb-6 text-sm text-brand-gray">ملخص سريع لكل نطاق عمل — التفاصيل داخل النطاق.</p>

      {error && <ErrorState title="تعذّر تحميل الملخص" message="تحقّق من الاتصال ثم أعد المحاولة." />}
      {!counts && !error && <LoadingState title="جاري تحميل الملخص…" />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((d) => {
          const key = d.id as keyof DomainCounts;
          const n = counts ? counts[key] : null;
          return (
            <Link key={d.id} to={d.to} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-primary">{d.label}</h2>
                    <p className="mt-1 text-xs text-brand-gray">{d.blurb}</p>
                  </div>
                  <div className="text-3xl font-extrabold text-primary tabular-nums">
                    {n == null ? "—" : n.toLocaleString("en-US")}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
