import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import { LoadingState, EmptyState, ErrorState } from "../../feedback/PageStates";

interface WaterRow {
  id: number;
  mosque_name?: string;
  applicant_name?: string;
  neighborhood?: string;
  mobile_number?: string;
  created_at?: string;
  status?: string;
  project?: number | null;
  project_name?: string | null;
  project_slug?: string | null;
}

/** طلبات سقيا الماء ضمن نطاق الطلبات — مربوطة بمشروع السقيا عبر الصفحة العامة. */
export default function WaterSupplyRequests() {
  const { access } = useAuth();
  const [items, setItems] = useState<WaterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!access) return;
    authFetch("/api/water-supply-requests/")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setItems(Array.isArray(d) ? d : d.results || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [access]);

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">طلبات سقيا الماء</h1>
      <p className="mb-4 text-sm text-brand-gray">
        النموذج العام مرتبط بمشروع السقيا:{" "}
        <Link className="font-semibold text-primary" to="/services/water-supply?project=saqya">
          تقديم طلب سقيا
        </Link>
      </p>
      {loading && <LoadingState title="جاري تحميل طلبات السقيا…" />}
      {error && <ErrorState title="تعذّر التحميل" message="تحقّق من الاتصال أو الصلاحيات." />}
      {!loading && !error && items.length === 0 && (
        <EmptyState title="لا توجد طلبات سقيا" message="ستظهر هنا عند إرسال نماذج جديدة من الصفحة العامة." />
      )}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((r) => (
            <Card key={r.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">{r.mosque_name || `طلب #${r.id}`}</h3>
                {r.status && <Badge variant="warning">{r.status}</Badge>}
              </div>
              <p className="text-sm text-brand-gray">
                {r.applicant_name || "—"} · {r.neighborhood || "—"}
              </p>
              <p className="mt-1 text-xs text-brand-gray">
                المشروع: {r.project_name || "طلب عام"}
              </p>
              <p className="mt-1 text-xs text-brand-gray" dir="ltr">{r.mobile_number || ""}</p>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
