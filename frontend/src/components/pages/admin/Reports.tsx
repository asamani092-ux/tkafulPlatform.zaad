import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import DataTable from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";

interface Report { id: number; title: string; total_projects: number; total_volunteers: number; total_tasks: number; generated_at: string }

export default function Reports() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    authFetch(`/api/admin/reports/`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => d && setReports(d.results || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(); }, [access]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await authFetch(`/api/admin/reports/generate/`, { method: "POST", body: JSON.stringify({}) });
      if (!res.ok) throw new Error();
      success({ title: "تم إنشاء التقرير بنجاح" }); load();
    } catch { error({ title: "خطأ", description: "تعذّر إنشاء التقرير" }); }
    setGenerating(false);
  };
  const remove = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/reports/${id}/delete/`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success({ title: "تم حذف التقرير" }); load();
    } catch { error({ title: "خطأ", description: "تعذّر الحذف" }); }
  };

  const cols: Column<Report>[] = [
    { key: "title", header: "العنوان" },
    { key: "total_projects", header: "المشاريع" },
    { key: "total_volunteers", header: "المتطوعون" },
    { key: "total_tasks", header: "المهام" },
    { key: "generated_at", header: "التاريخ", render: (r) => new Date(r.generated_at).toLocaleString("ar-SA") },
    { key: "actions", header: "", render: (r) => <Button variant="secondary" onClick={() => remove(r.id)}>حذف</Button> },
  ];

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">التقارير</h1>
        <Button onClick={generate} disabled={generating}>{generating ? "جاري الإنشاء…" : "إنشاء تقرير شامل"}</Button>
      </div>
      <Card>
        <DataTable columns={cols} rows={reports} emptyText="لا توجد تقارير بعد" />
      </Card>
    </AdminShell>
  );
}
