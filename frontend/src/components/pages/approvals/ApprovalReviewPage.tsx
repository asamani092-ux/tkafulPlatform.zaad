import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import SectionRenderer from "../../dossier/SectionRenderer";
import type { SchemaSection } from "../../dossier/types";

type ApprovalPayload = {
  token: string;
  usable: boolean;
  decision: string;
  expires_at: string;
  scope: string;
  note: string;
  dossier: {
    code: string;
    project_name: string;
    marketing_name: string;
    sponsor_name: string;
    current_stage: string;
    status: string;
  };
  stage: { order: number; key: string; status: string; deliverable_title: string } | null;
  sections: Array<SchemaSection & { data: Record<string, unknown>; status: string }>;
};

/** صفحة مراجعة عامة بلا دخول — اعتماد / إعادة للتعديل. */
export default function ApprovalReviewPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ApprovalPayload | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/public/approvals/${encodeURIComponent(token)}/`)
      .then(async (r) => {
        if (!r.ok) throw new Error("invalid");
        return r.json();
      })
      .then(setPayload)
      .catch(() => setError("الرابط غير صالح أو منتهٍ"))
      .finally(() => setLoading(false));
  }, [token]);

  const decide = async (decision: "approved" | "returned") => {
    if (!token) return;
    if (decision === "returned" && !note.trim()) {
      setError("اكتب سبب الإعادة");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/approvals/${encodeURIComponent(token)}/decide/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "تعذّر تسجيل القرار");
        return;
      }
      setDone(decision === "approved" ? "تم الاعتماد بنجاح" : "أُعيد للتعديل");
      setPayload((p) => (p ? { ...p, usable: false, decision } : p));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" dir="rtl">
        <LoadingState title="جاري تحميل طلب الاعتماد…" />
      </div>
    );
  }
  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" dir="rtl">
        <ErrorState title="رابط غير صالح" message={error || "تعذّر فتح صفحة المراجعة."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10" dir="rtl">
      <Card>
        <h1 className="text-2xl font-extrabold text-primary">مراجعة اعتماد المشروع</h1>
        <p className="mt-1 text-sm text-brand-gray">
          {payload.dossier.project_name} · {payload.dossier.code}
        </p>
        <p className="text-sm text-brand-gray">
          الراعي: {payload.dossier.sponsor_name || "—"} · النطاق: {payload.scope}
          {payload.stage ? ` · المرحلة: ${payload.stage.key}` : ""}
        </p>
        {done && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{done}</p>}
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      </Card>

      {payload.sections.map((s) => (
        <Card key={s.key}>
          <h2 className="mb-3 font-bold text-primary">{s.label}</h2>
          <SectionRenderer section={s} data={s.data || {}} disabled onChange={() => undefined} />
        </Card>
      ))}

      {payload.usable && !done && (
        <Card>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-bold text-primary">ملاحظة / سبب الإعادة</span>
            <textarea
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void decide("approved")}>
              اعتماد
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void decide("returned")}>
              إعادة للتعديل
            </Button>
          </div>
        </Card>
      )}

      {!payload.usable && !done && (
        <Card>
          <p className="text-sm text-brand-gray">
            هذا الرابط غير قابل للاستخدام (الحالة: {payload.decision}).
          </p>
        </Card>
      )}
    </div>
  );
}
