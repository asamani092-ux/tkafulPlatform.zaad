import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Tabs from "../../ui/Tabs";
import ReportGateway from "./ReportGateway";
import { LoadingState } from "../../feedback/PageStates";

interface Report { id: number; title: string; total_projects: number; total_volunteers: number; total_tasks: number; generated_at: string }
interface ReportData {
  summary?: Record<string, number | string>;
  projects?: { list?: Array<Record<string, unknown>> };
  volunteers?: { list?: Array<Record<string, unknown>> };
  tasks?: { by_status?: Record<string, number>; completion_rate?: number };
}
interface PerfRow { name: string; completed: number; current: number; completion_rate: number; join_date: string }
interface ProjRow { name: string; progress: number }

/** تنزيل CSV آمن للعربية (BOM). O(n) على الصفوف. */
function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(",")).join("\n");
  const csv = "\uFEFF" + headers.join(",") + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const SUMMARY_LABELS: Record<string, string> = {
  total_projects: "المشاريع", total_volunteers: "المتطوعون", total_tasks: "المهام",
  total_beneficiaries: "المستفيدون", total_donations: "التبرعات", total_volunteer_hours: "ساعات التطوع",
};

export default function Reports() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [tab, setTab] = useState("gateway");

  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<{ meta: Report; data: ReportData } | null>(null);

  const [perf, setPerf] = useState<PerfRow[] | null>(null);
  const [progress, setProgress] = useState<ProjRow[] | null>(null);

  const loadReports = useCallback(() => {
    authFetch(`/api/reports/`).then((r) => (r.ok ? r.json() : null)).then((d) => setReports(d?.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!access) return;
    if (tab === "saved") loadReports();
    if (tab === "performance" && perf === null)
      authFetch(`/api/reports/volunteers-performance/`).then((r) => (r.ok ? r.json() : null)).then((d) => setPerf(d?.volunteers || d || [])).catch(() => setPerf([]));
    if (tab === "progress" && progress === null)
      authFetch(`/api/reports/projects-progress/`).then((r) => (r.ok ? r.json() : null)).then((d) => setProgress(d?.projects || [])).catch(() => setProgress([]));
  }, [access, tab, perf, progress, loadReports]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await authFetch(`/api/reports/generate/`, { method: "POST", body: JSON.stringify({}) });
      if (!res.ok) throw new Error();
      success({ title: "تم إنشاء التقرير الشامل" }); loadReports();
    } catch { error({ title: "تعذّر إنشاء التقرير" }); }
    setGenerating(false);
  };

  const remove = async (id: number) => {
    if (!window.confirm("حذف التقرير؟")) return;
    const res = await authFetch(`/api/reports/${id}/delete/`, { method: "DELETE" });
    if (res.ok) { success({ title: "تم حذف التقرير" }); if (detail?.meta.id === id) setDetail(null); loadReports(); }
    else error({ title: "تعذّر الحذف" });
  };

  const openDetail = async (r: Report) => {
    const res = await authFetch(`/api/reports/${r.id}/`);
    if (res.ok) { const d = await res.json(); setDetail({ meta: r, data: d.report_data || {} }); }
  };

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">التقارير</h1>
          <p className="text-xs text-brand-gray">النطاق الافتراضي للتقرير الشامل: المنصّة بالكامل (مشاريع + متطوعون + مهام). تبويبات الأداء/التقدّم نطاق حيّ مباشر.</p>
        </div>
        {tab === "saved" && <Button onClick={generate} disabled={generating}>{generating ? "جاري الإنشاء…" : "إنشاء تقرير شامل للمنصّة"}</Button>}
      </div>

      <div className="mb-4">
        <Tabs active={tab} onChange={(k) => { setTab(k); setDetail(null); }} tabs={[
          { key: "gateway", label: "بوّابة التقارير" },
          { key: "saved", label: "التقارير المحفوظة" },
          { key: "performance", label: "أداء المتطوعين" },
          { key: "progress", label: "تقدّم المشاريع" },
        ]} />
      </div>

      {tab === "gateway" && <ReportGateway />}

      {tab === "saved" && (
        <>
          <Card className="mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs text-brand-gray">
                    <th className="py-2">العنوان</th><th>المشاريع</th><th>المتطوعون</th><th>المهام</th><th>التاريخ</th><th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-brand-gray">لا توجد تقارير بعد.</td></tr>}
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-surface-border last:border-0">
                      <td className="py-2 font-semibold">{r.title}</td>
                      <td>{r.total_projects}</td><td>{r.total_volunteers}</td><td>{r.total_tasks}</td>
                      <td className="text-xs text-brand-gray">{new Date(r.generated_at).toLocaleString("ar")}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => openDetail(r)}>عرض</Button>
                          <Button type="button" variant="danger" size="sm" onClick={() => remove(r.id)}>حذف</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {detail && (
            <Card className="print-area">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-primary">{detail.meta.title}</h2>
                <div className="flex flex-wrap gap-2 no-print">
                  <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>طباعة / PDF</Button>
                  {detail.data.volunteers?.list && detail.data.volunteers.list.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => downloadCsv(`volunteers_${detail.meta.id}.csv`, detail.data.volunteers!.list!)}>تنزيل المتطوعين (CSV)</Button>
                  )}
                  {detail.data.projects?.list && detail.data.projects.list.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => downloadCsv(`projects_${detail.meta.id}.csv`, detail.data.projects!.list!)}>تنزيل المشاريع (CSV)</Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDetail(null)}>إغلاق</Button>
                </div>
              </div>
              {detail.data.summary && (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(detail.data.summary).filter(([k]) => SUMMARY_LABELS[k]).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-surface-border p-3 text-center">
                      <div className="text-xl font-extrabold text-primary">{typeof v === "number" ? v.toLocaleString("en-US") : String(v)}</div>
                      <div className="text-xs text-brand-gray">{SUMMARY_LABELS[k]}</div>
                    </div>
                  ))}
                </div>
              )}
              {detail.data.tasks?.completion_rate != null && (
                <p className="mb-3 text-sm text-brand-gray">نسبة إنجاز المهام: <strong className="text-primary">{detail.data.tasks.completion_rate}%</strong></p>
              )}
              {detail.data.projects?.list && detail.data.projects.list.length > 0 && (
                <>
                  <h3 className="mb-2 text-sm font-bold text-primary">المشاريع ({detail.data.projects.list.length})</h3>
                  <div className="mb-4 max-h-56 overflow-y-auto text-sm">
                    {detail.data.projects.list.map((p, i) => (
                      <div key={i} className="flex flex-wrap gap-2 border-b border-surface-border py-1 last:border-0">
                        {Object.entries(p).slice(0, 4).map(([k, v]) => <span key={k} className="text-xs"><span className="text-brand-gray">{k}:</span> {String(v)}</span>)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </>
      )}

      {tab === "performance" && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">أداء المتطوعين</h2>
            {perf && perf.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => downloadCsv("volunteers_performance.csv", perf as unknown as Array<Record<string, unknown>>)}>تنزيل CSV</Button>}
          </div>
          {perf === null ? <LoadingState title="جاري التحميل…" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead><tr className="border-b border-surface-border text-xs text-brand-gray"><th className="py-2">المتطوّع</th><th>منجزة</th><th>حالية</th><th>نسبة الإنجاز</th><th>الانضمام</th></tr></thead>
                <tbody>
                  {perf.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-brand-gray">لا بيانات.</td></tr>}
                  {perf.map((v, i) => (
                    <tr key={i} className="border-b border-surface-border last:border-0">
                      <td className="py-2 font-semibold">{v.name}</td><td>{v.completed}</td><td>{v.current}</td><td>{v.completion_rate}%</td><td className="text-xs text-brand-gray">{v.join_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "progress" && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">تقدّم المشاريع</h2>
            {progress && progress.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => downloadCsv("projects_progress.csv", progress as unknown as Array<Record<string, unknown>>)}>تنزيل CSV</Button>}
          </div>
          {progress === null ? <LoadingState title="جاري التحميل…" /> : (
            <div className="space-y-2">
              {progress.length === 0 && <p className="text-brand-gray">لا بيانات.</p>}
              {progress.map((p, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-sm"><span>{p.name}</span><span className="text-brand-gray">{p.progress}%</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </AdminShell>
  );
}
