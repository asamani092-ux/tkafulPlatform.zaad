import { useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { AUTO_STATUS_AR, STAGE_KEY_AR, type DossierStageRow, type StageActivity } from "./types";

type Props = {
  stages: DossierStageRow[];
  activities: StageActivity[];
  canEdit: boolean;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onComplete: (
    id: number,
    payload: { lessons: string; notes: string; evidence_url: string; evidence_title: string; file?: File | null },
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function ActivitiesPanel({
  stages,
  activities,
  canEdit,
  onCreate,
  onComplete,
  onDelete,
}: Props) {
  const [form, setForm] = useState({
    stage: stages.find((s) => s.status === "active" || s.status === "returned")?.id || stages[0]?.id || 0,
    code: "",
    title: "",
    responsible: "",
    start_date: "",
    end_date: "",
  });
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [completeForm, setCompleteForm] = useState({
    lessons: "",
    notes: "",
    evidence_url: "",
    evidence_title: "",
    file: null as File | null,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stage || !form.title) return;
    setBusy(true);
    try {
      await onCreate({
        stage: form.stage,
        code: form.code || `ACT-${activities.length + 1}`,
        title: form.title,
        responsible: form.responsible,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      setForm((f) => ({ ...f, code: "", title: "", responsible: "" }));
    } finally {
      setBusy(false);
    }
  };

  const submitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (completeId == null) return;
    setBusy(true);
    try {
      await onComplete(completeId, completeForm);
      setCompleteId(null);
      setCompleteForm({ lessons: "", notes: "", evidence_url: "", evidence_title: "", file: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {canEdit && (
        <form className="grid grid-cols-1 gap-2 sm:grid-cols-3" onSubmit={submit}>
          <Select
            label="المرحلة"
            value={String(form.stage)}
            onChange={(e) => setForm({ ...form, stage: Number(e.target.value) })}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.order}. {STAGE_KEY_AR[s.key] || s.key}
              </option>
            ))}
          </Select>
          <Input label="الرمز" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input
            label="العنوان"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label="المسؤول"
            value={form.responsible}
            onChange={(e) => setForm({ ...form, responsible: e.target.value })}
          />
          <Input
            label="البداية"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
          <Input
            label="النهاية"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy}>
              إضافة نشاط
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {activities.map((a) => (
          <div key={a.id} className="rounded-xl border border-surface-border bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-primary">
                  {a.code} — {a.title}
                </div>
                <div className="text-xs text-brand-gray">
                  {AUTO_STATUS_AR[a.auto_status] || a.auto_status} · {a.progress_pct}% · {a.responsible || "—"}
                </div>
              </div>
              {canEdit && a.manual_status !== "done" && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setCompleteId(a.id)}>
                    إتمام مع شاهد
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void onDelete(a.id)}>
                    حذف
                  </Button>
                </div>
              )}
            </div>
            {(a.lessons || a.notes || a.risks) && (
              <p className="mt-2 text-xs text-brand-gray whitespace-pre-wrap">
                {[a.notes, a.risks, a.lessons && `درس مستفاد: ${a.lessons}`].filter(Boolean).join("\n")}
              </p>
            )}
            {completeId === a.id && (
              <form className="mt-3 space-y-2 border-t border-surface-border pt-3" onSubmit={submitComplete}>
                <Input
                  label="الدرس المستفاد *"
                  value={completeForm.lessons}
                  onChange={(e) => setCompleteForm({ ...completeForm, lessons: e.target.value })}
                  required
                />
                <Input
                  label="ملاحظات"
                  value={completeForm.notes}
                  onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                />
                <Input
                  label="عنوان الشاهد"
                  value={completeForm.evidence_title}
                  onChange={(e) => setCompleteForm({ ...completeForm, evidence_title: e.target.value })}
                />
                <Input
                  label="رابط الشاهد"
                  value={completeForm.evidence_url}
                  onChange={(e) => setCompleteForm({ ...completeForm, evidence_url: e.target.value })}
                />
                <label className="block text-sm">
                  <span className="mb-1 block font-bold text-primary">ملف الشاهد</span>
                  <input
                    type="file"
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, file: e.target.files?.[0] || null })
                    }
                  />
                </label>
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>
                    تأكيد الإتمام
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setCompleteId(null)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            )}
          </div>
        ))}
        {activities.length === 0 && <p className="text-sm text-brand-gray">لا أنشطة بعد.</p>}
      </div>
    </div>
  );
}
