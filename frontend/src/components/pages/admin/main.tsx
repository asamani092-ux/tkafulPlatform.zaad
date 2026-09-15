import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import { LoadingState, ErrorState } from "../../feedback/PageStates";

interface KpiItem {
  key: string;
  label: string;
  hint: string;
  to: string;
  value: number | null;
}

async function countList(url: string): Promise<number | null> {
  try {
    const res = await authFetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) return data.length;
    if (typeof data.count === "number") return data.count;
    if (Array.isArray(data.results)) return data.results.length;
    if (typeof data.total_volunteers === "number") return data.total_volunteers;
    if (typeof data.active_projects === "number") return data.active_projects;
    return null;
  } catch {
    return null;
  }
}

/** نظرة عامة — مؤشرات تشغيلية قابلة للنقر (ليست دليل نطاقات). */
export default function AdminMain() {
  const { access } = useAuth();
  const [kpis, setKpis] = useState<KpiItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    (async () => {
      try {
        const [
          activeProjects,
          pendingService,
          suggestions,
          volunteers,
          joinReqs,
          projectApps,
          maps,
          users,
        ] = await Promise.all([
          countList("/api/stats/"),
          countList("/api/service-requests/?status=PENDING"),
          countList("/api/suggestions/"),
          countList("/api/volunteer-stats/"),
          countList("/api/volunteer-requests/"),
          countList("/api/admin/applications/?status=" + encodeURIComponent("قيد المراجعة")),
          countList("/api/maps/"),
          countList("/api/accounts/users/"),
        ]);

        if (cancelled) return;
        setKpis([
          {
            key: "projects",
            label: "مشاريع نشطة",
            hint: "مشاريع التطوع الفعّالة حالياً",
            to: "/Admin/projects",
            value: activeProjects,
          },
          {
            key: "pending_requests",
            label: "طلبات معلّقة",
            hint: "طلبات خدمة + اقتراحات بانتظار المراجعة",
            to: "/Admin/requests/forms",
            value:
              pendingService != null || suggestions != null
                ? (pendingService || 0) + (suggestions || 0)
                : null,
          },
          {
            key: "volunteers",
            label: "متطوعون معتمدون",
            hint: "إجمالي المتطوعين المفعّلين",
            to: "/Admin/volunteers",
            value: volunteers,
          },
          {
            key: "joins",
            label: "طلبات انضمام",
            hint: "طلبات الانضمام كمتطوع بانتظار القرار",
            to: "/Admin/volunteers/join-requests",
            value: joinReqs,
          },
          {
            key: "apps",
            label: "طلبات تطوع لمشاريع",
            hint: "تقديمات على فرص المشاريع قيد المراجعة",
            to: "/Admin/volunteers/applications",
            value: projectApps,
          },
          {
            key: "maps",
            label: "الخرائط",
            hint: "خرائط مُدارة في المنصّة",
            to: "/Admin/maps",
            value: maps,
          },
          {
            key: "users",
            label: "إدارة المستخدمين",
            hint: "حسابات المنصّة المسجّلة",
            to: "/Admin/users",
            value: users,
          },
        ]);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [access]);

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">نظرة عامة</h1>
      <p className="mb-6 text-sm text-brand-gray">مؤشرات تشغيلية للمنصّة — اضغط البطاقة للانتقال للتفاصيل.</p>

      {error && <ErrorState title="تعذّر تحميل المؤشرات" message="تحقّق من الاتصال ثم أعد المحاولة." />}
      {!kpis && !error && <LoadingState title="جاري تحميل المؤشرات…" />}

      {kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((k) => (
            <Link key={k.key} to={k.to} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-primary">{k.label}</h2>
                    <p className="mt-1 text-xs text-brand-gray">{k.hint}</p>
                  </div>
                  <div className="text-3xl font-extrabold text-primary tabular-nums">
                    {k.value == null ? "—" : k.value.toLocaleString("en-US")}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
