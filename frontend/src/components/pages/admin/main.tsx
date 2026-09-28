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

type OverviewStats = {
  projects_active?: number;
  projects_draft?: number;
  dossiers_in_progress?: number;
  activities_delayed?: number;
  tasks_assigned_open?: number;
  volunteers_approved?: number;
  sponsorships_active?: number;
  pending_ops?: number;
};

/** نظرة عامة — مؤشرات تشغيلية فعلية للمنصّة قابلة للنقر. */
export default function AdminMain() {
  const { access } = useAuth();
  const [kpis, setKpis] = useState<KpiItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/platform/overview-stats/");
        if (!res.ok) throw new Error("overview");
        const data: OverviewStats = await res.json();
        if (cancelled) return;
        setKpis([
          {
            key: "projects_active",
            label: "مشاريع نشطة",
            hint: "مشاريع المنصة بحالة نشط",
            to: "/Admin/projects",
            value: data.projects_active ?? null,
          },
          {
            key: "projects_draft",
            label: "مشاريع مسودة",
            hint: "مشاريع بانتظار التفعيل",
            to: "/Admin/projects",
            value: data.projects_draft ?? null,
          },
          {
            key: "dossiers_in_progress",
            label: "ملفات قيد التنفيذ",
            hint: "ملفات مشاريع نشطة أو بانتظار الاعتماد",
            to: "/Admin/projects",
            value: data.dossiers_in_progress ?? null,
          },
          {
            key: "activities_delayed",
            label: "أنشطة متعثرة",
            hint: "أنشطة الخطة التنفيذية المتأخرة",
            to: "/Admin/projects",
            value: data.activities_delayed ?? null,
          },
          {
            key: "tasks_assigned_open",
            label: "مهام مسندة مفتوحة",
            hint: "مهام مسندة لفريق العمل ولم تُنجز",
            to: "/Admin/projects",
            value: data.tasks_assigned_open ?? null,
          },
          {
            key: "volunteers_approved",
            label: "متطوعون معتمدون",
            hint: "إجمالي المتطوعين المفعّلين",
            to: "/Admin/volunteers",
            value: data.volunteers_approved ?? null,
          },
          {
            key: "sponsorships_active",
            label: "كفالات نشطة",
            hint: "كفالات قيد التنفيذ أو التجهيز",
            to: "/Admin/projects",
            value: data.sponsorships_active ?? null,
          },
          {
            key: "pending_ops",
            label: "طلبات معلّقة",
            hint: "خدمة + اقتراحات + انضمام + تقديمات بانتظار المراجعة",
            to: "/Admin/requests/forms",
            value: data.pending_ops ?? null,
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
