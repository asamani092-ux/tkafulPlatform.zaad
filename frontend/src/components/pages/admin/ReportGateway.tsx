import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../../../lib/api";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import Alert from "../../ui/Alert";
import { LoadingState, EmptyState } from "../../feedback/PageStates";
import { downloadCsv } from "../../../utils/csv";

type Scope = "platform" | "project" | "volunteers" | "sponsorships";

interface ScopeData {
  scope: string;
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  summary?: Record<string, number | string>;
}

interface ProjectOption { id: number; name: string; slug: string }

const SCOPE_LABELS: Record<Scope, string> = {
  platform: "المنصّة بالكامل",
  project: "مشروع محدّد",
  volunteers: "المتطوّعون",
  sponsorships: "الكفالات",
};

const COL_LABELS: Record<string, string> = {
  name: "الاسم", status: "الحالة", volunteers: "المتطوعون", tasks_total: "إجمالي المهام",
  tasks_completed: "المنجزة", completion_rate: "نسبة الإنجاز", email: "البريد",
  volunteer_hours: "ساعات التطوّع", projects_participated: "المشاريع المشارَك بها",
  completed_tasks: "المهام المنجزة", type: "النوع", amount: "المبلغ", donor: "المتبرّع", project: "المشروع",
};

const SUMMARY_LABELS: Record<string, string> = {
  total_projects: "المشاريع", total_volunteers: "المتطوعون", total_tasks: "المهام",
  total_completed_tasks: "المهام المنجزة", total_hours: "ساعات التطوّع",
};

/**
 * بوّابة تقارير موحّدة (UX2 P4 · 3.9): نطاق قابل للاختيار + عرض على الشاشة
 * + تصدير CSV + طباعة PDF عربية عبر محرّك المتصفّح (تشكيل صحيح، RTL).
 */
export default function ReportGateway() {
  const [scope, setScope] = useState<Scope>("platform");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectSlug, setProjectSlug] = useState("");
  const [data, setData] = useState<ScopeData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/platform/projects/")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProjects(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({ type: scope });
    if (scope === "project" && projectSlug) params.set("project", projectSlug);
    try {
      const res = await authFetch(`/api/reports/scope/?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [scope, projectSlug]);

  const exportCsv = () => {
    if (!data || data.rows.length === 0) return;
    downloadCsv(`${data.scope}_report.csv`, data.rows, data.columns);
  };

  const canRun = scope !== "project" || !!projectSlug;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Select label="نطاق التقرير" value={scope} onChange={(e) => { setScope(e.target.value as Scope); setData(null); }}>
              {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
                <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
              ))}
            </Select>
          </div>
          {scope === "project" && (
            <div className="w-56">
              <Select label="المشروع" value={projectSlug} onChange={(e) => setProjectSlug(e.target.value)}>
                <option value="">اختر مشروعاً…</option>
                {projects.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
              </Select>
            </div>
          )}
          <Button type="button" onClick={() => void run()} disabled={!canRun || loading}>
            {loading ? "جاري التوليد…" : "توليد التقرير"}
          </Button>
          {data && data.rows.length > 0 && (
            <>
              <Button type="button" variant="secondary" onClick={exportCsv}>تنزيل CSV</Button>
              <Button type="button" variant="ghost" onClick={() => window.print()}>طباعة / PDF</Button>
            </>
          )}
        </div>
        <Alert tone="info">
          <span className="text-xs">
            «طباعة / PDF» تستخدم محرّك المتصفّح فيظهر النص العربي متّصلاً وصحيحاً (RTL).
            اختر «حفظ كـ PDF» من نافذة الطباعة.
          </span>
        </Alert>
      </Card>

      {loading && <LoadingState title="جاري توليد التقرير…" />}

      {data && (
        <Card className="print-area">
          <h2 className="mb-3 text-lg font-bold text-primary">{data.title}</h2>

          {data.summary && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(data.summary).filter(([k]) => SUMMARY_LABELS[k]).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-surface-border p-3 text-center">
                  <div className="text-xl font-extrabold text-primary">{typeof v === "number" ? v.toLocaleString("en-US") : String(v)}</div>
                  <div className="text-xs text-brand-gray">{SUMMARY_LABELS[k]}</div>
                </div>
              ))}
            </div>
          )}

          {data.rows.length === 0 ? (
            <EmptyState title="لا بيانات ضمن هذا النطاق" />
          ) : (
            <div className="zad-table-wrap overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c} scope="col" className="py-2 text-xs text-brand-gray">{COL_LABELS[c] || c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className="border-b border-surface-border last:border-0">
                      {data.columns.map((c) => (
                        <td key={c} className="py-2">
                          {c === "completion_rate" ? `${row[c]}%` : String(row[c] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
