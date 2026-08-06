import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import DataTable from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";
import Breadcrumb from "../../ui/Breadcrumb";
import ConfirmDialog from "../../ui/ConfirmDialog";
import Skeleton from "../../ui/Skeleton";

interface Report { id: number; title: string; total_projects: number; total_volunteers: number; total_tasks: number; generated_at: string }

export default function Reports() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    authFetch(`/api/reports/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setReports(d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(); }, [access]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await authFetch(`/api/reports/generate/`, { method: "POST", body: JSON.stringify({}) });
      if (!res.ok) throw new Error();
      success({ title: "تم إنشاء التقرير بنجاح" }); load();
    } catch { error({ title: "خطأ", description: "تعذّر إنشاء التقرير" }); }
    setGenerating(false);
  };

  const remove = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/reports/${deleteId}/delete/`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success({ title: "تم حذف التقرير" });
      setDeleteId(null);
      load();
    } catch { error({ title: "خطأ", description: "تعذّر الحذف" }); }
    setDeleting(false);
  };

  const cols: Column<Report>[] = [
    { key: "title", header: "العنوان" },
    { key: "total_projects", header: "المشاريع" },
    { key: "total_volunteers", header: "المتطوعون" },
    { key: "total_tasks", header: "المهام" },
    { key: "generated_at", header: "التاريخ", render: (r) => new Date(r.generated_at).toLocaleString("ar-SA") },
    { key: "actions", header: "", render: (r) => <Button variant="secondary" onClick={() => setDeleteId(r.id)}>حذف</Button> },
  ];

  return (
    <AdminShell>
      <Breadcrumb items={[{ label: "الإدارة", href: "/Admin" }, { label: "التقارير" }]} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">التقارير</h1>
          <p className="text-sm text-brand-gray">رأس التقرير ومعاييره تُنشأ من المنصّة — تاريخ الإنشاء في الجدول.</p>
        </div>
        <Button onClick={generate} disabled={generating} aria-busy={generating || undefined}>
          {generating ? "جاري الإنشاء…" : "إنشاء تقرير شامل"}
        </Button>
      </div>
      <Card>
        {loading ? <Skeleton lines={5} /> : <DataTable columns={cols} rows={reports} emptyText="لا توجد تقارير بعد" />}
      </Card>
      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="تأكيد حذف التقرير"
        confirmLabel="حذف"
        destructive
        loading={deleting}
      >
        هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع.
      </ConfirmDialog>
    </AdminShell>
  );
}
