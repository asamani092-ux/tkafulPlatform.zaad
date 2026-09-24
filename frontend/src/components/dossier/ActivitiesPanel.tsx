import { Fragment, useMemo, useState } from "react";
import Button from "../ui/Button";
import CollapsibleCard from "./CollapsibleCard";
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
  onUpdate?: (id: number, payload: Record<string, unknown>) => Promise<void>;
  onUpdateStage?: (order: number, payload: Record<string, unknown>) => Promise<void>;
  canApprove?: boolean;
  phaseStatus?: Record<string, string>;
  onDecidePhase?: (phaseKey: string, decision: "approved" | "revoke") => void;
};

type OpenAdd = { stageId: number; parentId: number | null };
type WeekCell = { start: Date; end: Date; label: string };
type MonthBlock = { label: string; weeks: WeekCell[] };

const DATE_ORDER_MSG = "تاريخ البداية يجب أن يسبق تاريخ الإغلاق";
const cell = "border border-surface-border px-2 py-2 align-middle";

function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function datesOrdered(start: string | null, end: string | null): boolean {
  return !start || !end || start < end;
}

/** أشهر تقويمية من البداية حتى الإغلاق، أربعة أسابيع لكل شهر. O(M). */
function buildMonthWeeks(startIso: string | null, endIso: string | null): MonthBlock[] {
  if (!startIso || !endIso || startIso >= endIso) return [];
  const start = parseDay(startIso);
  const end = parseDay(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const blocks: MonthBlock[] = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  const endY = end.getFullYear();
  const endM = end.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    const lastDay = new Date(y, m + 1, 0).getDate();
    const starts = [1, 8, 15, 22];
    const weeks: WeekCell[] = starts.map((day, i) => {
      const ws = new Date(y, m, day);
      const we = i < 3 ? new Date(y, m, starts[i + 1] - 1) : new Date(y, m, lastDay);
      return { start: ws, end: we, label: isoDay(ws) };
    });
    blocks.push({ label: `${m + 1}/${y}`, weeks });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return blocks;
}

function weekHits(activity: StageActivity, week: WeekCell): boolean {
  if (!activity.start_date || !activity.end_date) return false;
  const ws = isoDay(week.start);
  const we = isoDay(week.end);
  return ws <= activity.end_date && we >= activity.start_date;
}

function phaseActivities(stageId: number, activities: StageActivity[]): StageActivity[] {
  return activities.filter((a) => a.stage === stageId);
}

function execStatus(acts: StageActivity[]): string {
  if (!acts.length) return "لم يحن";
  if (acts.some((a) => a.auto_status === "delayed")) return "متعثر";
  const done = (a: StageActivity) => a.auto_status === "done" || a.manual_status === "done";
  if (acts.every(done)) return "منفذ";
  const started = (a: StageActivity) =>
    done(a) || a.auto_status === "in_progress" || a.manual_status === "in_progress";
  if (acts.some(started)) return "جاري";
  return "لم يحن";
}

function phaseRange(stage: DossierStageRow, acts: StageActivity[]): { start: string | null; end: string | null } {
  const starts = acts.map((a) => a.start_date).filter((d): d is string => !!d).sort();
  const ends = acts.map((a) => a.end_date).filter((d): d is string => !!d).sort();
  return {
    start: starts[0] || stage.planned_start,
    end: ends[ends.length - 1] || stage.planned_end,
  };
}

function remainingDays(end: string | null): string {
  if (!end) return "—";
  const close = parseDay(end);
  if (Number.isNaN(close.getTime())) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const left = Math.round((close.getTime() - today.getTime()) / 86400000);
  if (left < 0) return `متأخر ${Math.abs(left)}`;
  return String(left);
}

/** جدول الخطة: خمسة صفوف، ونافذة تفاصيل بأربعة أسابيع لكل شهر. */
export default function ActivitiesPanel({
  stages,
  activities,
  canEdit,
  onCreate,
  onComplete,
  onDelete,
  onUpdate,
  onUpdateStage,
  canApprove,
  phaseStatus,
  onDecidePhase,
}: Props) {
  const ordered = [...stages].sort((a, b) => a.order - b.order);
  const childrenOf = useMemo(() => {
    const map = new Map<number, StageActivity[]>();
    for (const a of activities) {
      if (a.parent == null) continue;
      const list = map.get(a.parent) || [];
      list.push(a);
      map.set(a.parent, list);
    }
    return map;
  }, [activities]);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState<OpenAdd | null>(null);
  const [draft, setDraft] = useState("");
  const [dateError, setDateError] = useState("");
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [completeForm, setCompleteForm] = useState({
    lessons: "",
    notes: "",
    evidence_url: "",
    evidence_title: "",
    file: null as File | null,
  });
  const [busy, setBusy] = useState(false);

  const detailStage = ordered.find((s) => s.key === detailKey) || null;
  const detailActs = detailStage ? phaseActivities(detailStage.id, activities) : [];
  const detailMains = detailActs.filter((a) => a.parent == null);
  const range = detailStage ? phaseRange(detailStage, detailActs) : { start: null, end: null };
  const months = useMemo(() => buildMonthWeeks(range.start, range.end), [range.start, range.end]);

  const addActivity = async (stageId: number, parentId: number | null) => {
    const title = draft.trim();
    if (!title) return;
    setBusy(true);
    try {
      await onCreate({ stage: stageId, parent: parentId, title });
      setDraft("");
      setOpenAdd(null);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: number, payload: Record<string, unknown>) => {
    if (!onUpdate) return;
    await onUpdate(id, payload);
  };

  const saveActivityDates = (a: StageActivity, nextStart: string | null, nextEnd: string | null) => {
    if (!datesOrdered(nextStart, nextEnd)) {
      setDateError(DATE_ORDER_MSG);
      return;
    }
    setDateError("");
    const payload: Record<string, unknown> = {};
    if (nextStart !== a.start_date) payload.start_date = nextStart;
    if (nextEnd !== a.end_date) payload.end_date = nextEnd;
    if (Object.keys(payload).length) void patch(a.id, payload);
  };

  const saveStageDates = (stage: DossierStageRow, nextStart: string | null, nextEnd: string | null) => {
    if (!datesOrdered(nextStart, nextEnd)) {
      setDateError(DATE_ORDER_MSG);
      return;
    }
    setDateError("");
    if (!onUpdateStage) return;
    const payload: Record<string, unknown> = {};
    if (nextStart !== stage.planned_start) payload.planned_start = nextStart;
    if (nextEnd !== stage.planned_end) payload.planned_end = nextEnd;
    if (Object.keys(payload).length) void onUpdateStage(stage.order, payload);
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

  const renderAdder = (stageId: number, parentId: number | null) => {
    if (!canEdit) return null;
    const open = openAdd?.stageId === stageId && openAdd.parentId === parentId;
    return (
      <div className="flex items-center gap-2">
        {open && (
          <input
            autoFocus
            className="input-field w-36 text-sm"
            placeholder="نشاط جديد"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addActivity(stageId, parentId);
              }
              if (e.key === "Escape") setOpenAdd(null);
            }}
          />
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          aria-label="إضافة نشاط"
          disabled={busy}
          onClick={() => {
            if (open) {
              void addActivity(stageId, parentId);
              return;
            }
            setDraft("");
            setOpenAdd({ stageId, parentId });
          }}
        >
          +
        </Button>
      </div>
    );
  };

  const renderActivity = (a: StageActivity, stage: DossierStageRow, level: "رئيسي" | "فرعي") => {
    const locked = !!a.locked;
    return (
      <tr key={a.id} className={level === "فرعي" ? "bg-emerald-50/40" : undefined}>
        <td className={cell}>{level}</td>
        <td className={cell}>
          <input
            className="input-field w-full text-sm"
            disabled={!canEdit || locked}
            defaultValue={a.title}
            key={`${a.id}-t-${a.title}`}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value.trim() !== a.title) void patch(a.id, { title: e.target.value.trim() });
            }}
          />
        </td>
        <td className={cell}>
          <select
            className="input-field text-sm"
            disabled={!canEdit}
            value={a.manual_status || ""}
            onChange={(e) => void patch(a.id, { manual_status: e.target.value })}
          >
            <option value="">—</option>
            <option value="in_progress">جاري التنفيذ</option>
            <option value="done">تم التنفيذ</option>
          </select>
        </td>
        <td className={`${cell} text-xs`}>{AUTO_STATUS_AR[a.auto_status] || a.auto_status}</td>
        <td className={cell}>
          <input
            type="date"
            className="input-field text-sm"
            disabled={!canEdit}
            defaultValue={a.start_date || ""}
            key={`${a.id}-s-${a.start_date}`}
            onBlur={(e) => saveActivityDates(a, e.target.value || null, a.end_date)}
          />
        </td>
        <td className={cell}>
          <input
            type="date"
            className="input-field text-sm"
            disabled={!canEdit}
            defaultValue={a.end_date || ""}
            key={`${a.id}-e-${a.end_date}`}
            onBlur={(e) => saveActivityDates(a, a.start_date, e.target.value || null)}
          />
        </td>
        <td className={cell}>
          <input
            className="input-field w-full text-sm"
            disabled={!canEdit}
            defaultValue={a.kpi || ""}
            key={`${a.id}-k-${a.kpi}`}
            onBlur={(e) => {
              if (e.target.value !== (a.kpi || "")) void patch(a.id, { kpi: e.target.value });
            }}
          />
        </td>
        <td className={cell}>
          <input
            className="input-field w-full text-sm"
            disabled={!canEdit}
            defaultValue={a.responsible || ""}
            key={`${a.id}-r-${a.responsible}`}
            onBlur={(e) => {
              if (e.target.value !== (a.responsible || "")) void patch(a.id, { responsible: e.target.value });
            }}
          />
        </td>
        <td className={cell}>
          <div className="flex flex-wrap items-center gap-2">
            {level === "رئيسي" ? renderAdder(stage.id, a.id) : null}
            {canEdit && a.manual_status !== "done" && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setCompleteId(a.id)}>
                إتمام
              </Button>
            )}
            {canEdit && !locked && (
              <Button type="button" variant="secondary" size="sm" onClick={() => void onDelete(a.id)}>
                حذف
              </Button>
            )}
          </div>
          {completeId === a.id && (
            <form className="mt-2 space-y-2" onSubmit={submitComplete}>
              <input
                className="input-field w-full text-sm"
                placeholder="الدرس المستفاد"
                required
                value={completeForm.lessons}
                onChange={(e) => setCompleteForm({ ...completeForm, lessons: e.target.value })}
              />
              <input
                className="input-field w-full text-sm"
                placeholder="ملاحظات"
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              />
              <input
                className="input-field w-full text-sm"
                placeholder="رابط الشاهد"
                value={completeForm.evidence_url}
                onChange={(e) => setCompleteForm({ ...completeForm, evidence_url: e.target.value })}
              />
              <input
                type="file"
                onChange={(e) => setCompleteForm({ ...completeForm, file: e.target.files?.[0] || null })}
              />
              <Button type="submit" disabled={busy}>
                تأكيد الإتمام
              </Button>
            </form>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div dir="rtl">
      <CollapsibleCard title="الخطة التنفيذية" defaultOpen={false} subtitle="خمسة صفوف للمراحل">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-muted/40">
              {["اسم المرحلة", "حالة التنفيذ", "تاريخ البداية", "تاريخ الإغلاق", "المدة المتبقية بالأيام", "التفاصيل"].map((h) => (
                <th key={h} className={`${cell} text-right font-bold text-primary`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((stage) => {
              const acts = phaseActivities(stage.id, activities);
              const span = phaseRange(stage, acts);
              const status = phaseStatus?.[stage.key] || "empty";
              return (
                <tr key={stage.id}>
                  <td className={`${cell} font-extrabold text-primary`}>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {STAGE_KEY_AR[stage.key] || stage.key}
                      <span className="text-xs font-bold text-brand-gray">{status === "approved" ? "معتمدة" : "غير معتمدة"}</span>
                      {canApprove &&
                        (status === "approved" ? (
                          <Button type="button" variant="secondary" size="sm" onClick={() => onDecidePhase?.(stage.key, "revoke")}>
                            إزالة الاعتماد
                          </Button>
                        ) : (
                          <Button type="button" size="sm" onClick={() => onDecidePhase?.(stage.key, "approved")}>
                            اعتماد
                          </Button>
                        ))}
                    </span>
                  </td>
                  <td className={cell}>{execStatus(acts)}</td>
                  <td className={cell}>{span.start || "—"}</td>
                  <td className={cell}>{span.end || "—"}</td>
                  <td className={cell}>{remainingDays(span.end)}</td>
                  <td className={cell}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setDateError("");
                        setDetailKey(stage.key);
                      }}
                    >
                      التفاصيل
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CollapsibleCard>

      {detailStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailKey(null)}>
          <div
            className="max-h-[85vh] w-full max-w-6xl overflow-auto rounded-xl bg-surface p-4 shadow-lg"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-extrabold text-primary">{STAGE_KEY_AR[detailStage.key] || detailStage.key}</h3>
              <Button type="button" variant="secondary" onClick={() => setDetailKey(null)}>
                إغلاق
              </Button>
            </div>
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                بداية المرحلة
                <input
                  type="date"
                  className="input-field mt-1 text-sm"
                  disabled={!canEdit}
                  defaultValue={detailStage.planned_start || ""}
                  key={`${detailStage.id}-ps-${detailStage.planned_start}`}
                  onBlur={(e) => saveStageDates(detailStage, e.target.value || null, detailStage.planned_end)}
                />
              </label>
              <label className="text-sm">
                إغلاق المرحلة
                <input
                  type="date"
                  className="input-field mt-1 text-sm"
                  disabled={!canEdit}
                  defaultValue={detailStage.planned_end || ""}
                  key={`${detailStage.id}-pe-${detailStage.planned_end}`}
                  onBlur={(e) => saveStageDates(detailStage, detailStage.planned_start, e.target.value || null)}
                />
              </label>
              {renderAdder(detailStage.id, null)}
            </div>
            {dateError && <p className="mb-3 text-sm text-red-600">{dateError}</p>}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-muted/40">
                    {["المستوى", "النشاط", "الحالة اليدوية", "الحالة التلقائية", "البداية", "الإغلاق", "المؤشر", "المسؤول", ""].map((h) => (
                      <th key={h || "add"} className={`${cell} text-right font-bold text-primary`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailMains.map((main) => (
                    <Fragment key={main.id}>
                      {renderActivity(main, detailStage, "رئيسي")}
                      {(childrenOf.get(main.id) || []).map((child) => renderActivity(child, detailStage, "فرعي"))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <h4 className="mb-2 mt-4 font-bold text-primary">أسابيع التنفيذ</h4>
            {range.start && range.end && !datesOrdered(range.start, range.end) ? (
              <p className="text-sm text-red-600">{DATE_ORDER_MSG}</p>
            ) : !months.length ? (
              <p className="text-sm text-brand-gray">لا تواريخ تنفيذ بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className={cell}>النشاط</th>
                      {months.map((m) => (
                        <th key={m.label} className={`${cell} text-center`} colSpan={4}>
                          {m.label}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className={cell} />
                      {months.flatMap((m) =>
                        m.weeks.map((w) => (
                          <th key={`${m.label}-${w.label}`} className={`${cell} whitespace-nowrap`}>
                            {w.label}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detailActs.map((a) => (
                      <tr key={`cal-${a.id}`}>
                        <td className={`${cell} font-bold`}>{a.title}</td>
                        {months.flatMap((m) =>
                          m.weeks.map((w) => (
                            <td
                              key={`${a.id}-${m.label}-${w.label}`}
                              className={`${cell} ${weekHits(a, w) ? "bg-emerald-200" : ""}`}
                            />
                          )),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
