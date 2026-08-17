import { useMemo, useState } from "react";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Badge from "../../ui/Badge";
import { useToast } from "../../../contexts/ToastContext";
import { UAT_ACCOUNTS, UAT_SECTIONS, UAT_LOCAL_BASE } from "./data";
import { buildReport, summarize, type UatState, type UatStatus } from "./report";

const EMPTY: UatState = { tester: "", verdict: "", statuses: {}, notes: {} };

const STATUS_BUTTONS: Array<{ value: UatStatus; label: string; color: string }> = [
  { value: "pass", label: "✅ ناجح", color: "#16a34a" },
  { value: "warn", label: "⚠️ ملاحظة", color: "#f2b824" },
  { value: "fail", label: "❌ فشل", color: "#dc2626" },
];

/** نموذج تقييم القبول (UAT) — حالة الجلسة في الذاكرة فقط؛ نسخ/تنزيل التقرير اختياري. */
export default function UatPage() {
  const toast = useToast();
  const [state, setState] = useState<UatState>(EMPTY);

  const counts = useMemo(() => summarize(state), [state]);
  const progress = Math.round(((counts.total - counts.pending) / counts.total) * 100);

  const setStatus = (id: string, value: UatStatus) =>
    setState((s) => ({
      ...s,
      statuses: { ...s.statuses, [id]: s.statuses[id] === value ? undefined : value },
    }));

  const setNote = (id: string, value: string) =>
    setState((s) => ({ ...s, notes: { ...s.notes, [id]: value } }));

  const copyReport = async () => {
    const text = buildReport(state);
    try {
      await navigator.clipboard.writeText(text);
      toast.success({ title: "نُسخ التقرير إلى الحافظة" });
    } catch {
      toast.error({ title: "تعذّر النسخ — استخدم زر التنزيل" });
    }
  };

  const downloadReport = () => {
    const blob = new Blob([buildReport(state)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uat_report_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (window.confirm("مسح كل التقييمات والملاحظات؟")) setState(EMPTY);
  };

  return (
    <div className="mx-auto max-w-page px-3 py-6 sm:px-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">نموذج تقييم القبول (UAT)</h1>
        <p className="mt-1 text-sm text-brand-gray">
          تجربة محلية: <a className="font-semibold text-primary" href={UAT_LOCAL_BASE} dir="ltr">{UAT_LOCAL_BASE}</a>
          {" "}· المرجع: <code dir="ltr">UAT.md</code> · Phase B: نطاقات العمل السبعة
        </p>
      </header>

      <Card className="mb-4">
        <div className="mb-2 flex flex-wrap items-center gap-3 text-sm font-bold">
          <span className="text-primary">التقدّم: {progress}%</span>
          <Badge variant="success">✅ {counts.pass}</Badge>
          <Badge variant="warning">⚠️ {counts.warn}</Badge>
          <Badge variant="danger">❌ {counts.fail}</Badge>
          <span className="text-brand-gray">متبقٍ: {counts.pending} من {counts.total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--tmkeen-primary)" }} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="اسم المقيّم" value={state.tester} onChange={(e) => setState({ ...state, tester: e.target.value })} />
          <div className="flex items-end gap-2">
            <Button onClick={copyReport}>نسخ التقرير</Button>
            <Button variant="secondary" onClick={downloadReport}>تنزيل .md</Button>
            <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={resetAll}>مسح الكل</button>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 text-base font-bold text-primary">حسابات التجربة (الدخول بالبريد)</h2>
        <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2" dir="ltr">
          {UAT_ACCOUNTS.map((a) => (
            <div key={a.email} className="flex flex-wrap items-center gap-2">
              <code>{a.email}</code>
              <code className="text-brand-gray">{a.password}</code>
              <span className="text-xs text-brand-gray" dir="rtl">{a.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {UAT_SECTIONS.map((section) => (
        <Card key={section.key} className="mb-4">
          <h2 className="mb-3 text-lg font-bold text-primary">{section.title}</h2>
          <div className="space-y-4">
            {section.scenarios.map((sc) => {
              const status = state.statuses[sc.id];
              return (
                <div key={sc.id} className="border-b border-surface-border pb-3 last:border-b-0 last:pb-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-bold text-brand-gray" dir="ltr">{sc.id}</span>
                    <strong className="text-sm">{sc.title}</strong>
                    {sc.role && <Badge>{sc.role}</Badge>}
                  </div>
                  <p className="mb-2 text-xs text-brand-gray">المتوقع: {sc.expected}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {STATUS_BUTTONS.map((b) => (
                      <button key={b.value} type="button"
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={status === b.value
                          ? { background: b.color, color: "#fff", border: `1px solid ${b.color}` }
                          : { background: "var(--tmkeen-surface)", color: "var(--tmkeen-brand-gray)", border: "1px solid var(--tmkeen-surface-border)" }}
                        onClick={() => setStatus(sc.id, b.value)}>
                        {b.label}
                      </button>
                    ))}
                    <input
                      className="input-field flex-1"
                      style={{ minWidth: "12rem", maxWidth: "28rem" }}
                      placeholder="ملاحظات…"
                      value={state.notes[sc.id] || ""}
                      onChange={(e) => setNote(sc.id, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card>
        <h2 className="mb-2 text-base font-bold text-primary">الحكم النهائي</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {["قبول", "قبول بملاحظات", "رفض"].map((v) => (
            <button key={v} type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-bold${state.verdict === v ? " bg-primary text-white" : " bg-surface border border-surface-border"}`}
              onClick={() => setState({ ...state, verdict: state.verdict === v ? "" : v })}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={copyReport}>نسخ التقرير</Button>
          <Button variant="secondary" onClick={downloadReport}>تنزيل .md</Button>
        </div>
      </Card>
    </div>
  );
}
