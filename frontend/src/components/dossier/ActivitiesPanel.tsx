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
  canApprove?: boolean;
  phaseStatus?: Record<string, string>;
  onDecidePhase?: (phaseKey: string, decision: "approved" | "revoke") => void;
};

type OpenAdd = { stageId: number; parentId: number | null };

function durationLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  const days = Math.round((e.getTime() - s.getTime()) / 86400000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const left = Math.round((e.getTime() - today.getTime()) / 86400000);
  const counter = left > 0 ? `متبقٍ ${left}` : left === 0 ? "اليوم" : `متأخر ${Math.abs(left)}`;
  return `${days} يوم · ${counter}`;
}

function sundayOnOrBefore(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function buildWeeks(activities: StageActivity[]) {
  const dates = activities.flatMap((a) => [a.start_date, a.end_date].filter(Boolean) as string[]);
  if (!dates.length) return { months: [] as Array<{ label: string; weeks: Date[] }> };
  const parsed = dates.map((d) => new Date(`${d}T00:00:00`)).filter((d) => !Number.isNaN(d.getTime()));
  if (!parsed.length) return { months: [] as Array<{ label: string; weeks: Date[] }> };
  const min = sundayOnOrBefore(new Date(Math.min(...parsed.map((d) => d.getTime()))));
  const max = new Date(Math.max(...parsed.map((d) => d.getTime())));
  const cap = new Date(min);
  cap.setMonth(cap.getMonth() + 18);
  const end = max < cap ? max : cap;
  const weeks: Date[] = [];
  for (let cursor = new Date(min); cursor <= end; cursor.setDate(cursor.getDate() + 7)) {
    weeks.push(new Date(cursor));
  }
  const groups = new Map<string, { label: string; weeks: Date[] }>();
  for (const week of weeks) {
    const key = monthKey(week);
    if (!groups.has(key)) {
      groups.set(key, { label: week.toLocaleDateString("ar", { month: "long", year: "numeric" }), weeks: [] });
    }
    groups.get(key)!.weeks.push(week);
  }
  return { months: [...groups.values()] };
}

function weekHits(activity: StageActivity, weekStart: Date): boolean {
  if (!activity.start_date || !activity.end_date) return false;
  const start = new Date(`${activity.start_date}T00:00:00`).getTime();
  const end = new Date(`${activity.end_date}T00:00:00`).getTime();
  const ws = weekStart.getTime();
  const we = ws + 6 * 86400000;
  return ws <= end && we >= start;
}

/** جدول الخطة: مستويان، أعمدة الإكسل المتبقية، ونافذة أشهر/أسابيع. */
export default function ActivitiesPanel({
  stages,
  activities,
  canEdit,
  onCreate,
  onComplete,
  onDelete,
  onUpdate,
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
  const mains = useMemo(
    () => activities.filter((a) => a.parent == null),
    [activities],
  );
  const [openAdd, setOpenAdd] = useState<OpenAdd | null>(null);
  const [draft, setDraft] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [completeForm, setCompleteForm] = useState({
    lessons: "",
    notes: "",
    evidence_url: "",
    evidence_title: "",
    file: null as File | null,
  });
  const [busy, setBusy] = useState(false);
  const calendar = useMemo(() => buildWeeks(activities), [activities]);

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
      <div className="ms-auto flex shrink-0 items-center gap-2">
        {open && (
          <input
            autoFocus
            className="input-field w-40 text-sm"
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

  const renderRow = (a: StageActivity, stage: DossierStageRow, level: "رئيسي" | "فرعي", parentTitle: string) => {
    const locked = !!a.locked;
    const mainTitle = level === "رئيسي" ? a.title : parentTitle;
    const subTitle = level === "فرعي" ? a.title : "";
    return (
      <tr key={a.id} className={level === "فرعي" ? "bg-emerald-50/40" : undefined}>
        <td className="border-b border-surface-border px-2 py-2 font-bold text-primary">{level}</td>
        <td className="border-b border-surface-border px-2 py-2">{STAGE_KEY_AR[stage.key] || stage.key}</td>
        <td className="border-b border-surface-border px-2 py-2">
          {level === "رئيسي" ? (
            <input
              className="input-field w-full text-sm"
              disabled={!canEdit || locked}
              defaultValue={mainTitle}
              key={`${a.id}-main-${mainTitle}`}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value.trim() !== a.title) void patch(a.id, { title: e.target.value.trim() });
              }}
            />
          ) : (
            mainTitle
          )}
        </td>
        <td className="border-b border-surface-border px-2 py-2">
          {level === "فرعي" ? (
            <input
              className="input-field w-full text-sm"
              disabled={!canEdit || locked}
              defaultValue={subTitle}
              key={`${a.id}-sub-${subTitle}`}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value.trim() !== a.title) void patch(a.id, { title: e.target.value.trim() });
              }}
            />
          ) : (
            "—"
          )}
        </td>
        <td className="border-b border-surface-border px-2 py-2">
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
        <td className="border-b border-surface-border px-2 py-2 text-xs">{AUTO_STATUS_AR[a.auto_status] || a.auto_status}</td>
        <td className="border-b border-surface-border px-2 py-2">
          <input
            type="date"
            className="input-field text-sm"
            disabled={!canEdit}
            defaultValue={a.start_date || ""}
            key={`${a.id}-s-${a.start_date}`}
            onBlur={(e) => void patch(a.id, { start_date: e.target.value || null })}
          />
        </td>
        <td className="border-b border-surface-border px-2 py-2">
          <input
            type="date"
            className="input-field text-sm"
            disabled={!canEdit}
            defaultValue={a.end_date || ""}
            key={`${a.id}-e-${a.end_date}`}
            onBlur={(e) => void patch(a.id, { end_date: e.target.value || null })}
          />
        </td>
        <td className="border-b border-surface-border px-2 py-2 text-xs whitespace-nowrap">{durationLabel(a.start_date, a.end_date)}</td>
        <td className="border-b border-surface-border px-2 py-2">
          <input
            className="input-field w-28 text-sm"
            disabled={!canEdit}
            defaultValue={a.kpi || ""}
            key={`${a.id}-k-${a.kpi}`}
            onBlur={(e) => {
              if (e.target.value !== (a.kpi || "")) void patch(a.id, { kpi: e.target.value });
            }}
          />
        </td>
        <td className="border-b border-surface-border px-2 py-2">
          <input
            className="input-field w-28 text-sm"
            disabled={!canEdit}
            defaultValue={a.responsible || ""}
            key={`${a.id}-r-${a.responsible}`}
            onBlur={(e) => {
              if (e.target.value !== (a.responsible || "")) void patch(a.id, { responsible: e.target.value });
            }}
          />
        </td>
        <td className="border-b border-surface-border px-2 py-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
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
            {level === "رئيسي" ? renderAdder(stage.id, a.id) : null}
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
      <CollapsibleCard
        title="الخطة التنفيذية"
        defaultOpen={false}
        subtitle="أنشطة المراحل الرئيسية"
        actions={
          <Button type="button" variant="secondary" onClick={() => setCalOpen(true)}>
            التنفيذ
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted/40">
                {["المستوى", "المرحلة", "النشاط الرئيسي", "النشاط الفرعي", "حالة التنفيذ", "الحالة التلقائية", "تاريخ البدء", "تاريخ الانتهاء", "المدة / عداد الإغلاق", "مؤشر الأداء", "المسؤول", ""].map((h) => (
                  <th key={h || "add"} className="border-b border-surface-border px-2 py-2 text-right font-bold text-primary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((stage) => {
                const status = phaseStatus?.[stage.key] || "empty";
                const stageMains = mains.filter((a) => a.stage === stage.id);
                return (
                  <Fragment key={stage.id}>
                    <tr className="bg-primary/[0.06]">
                      <td colSpan={11} className="border-b border-surface-border px-2 py-2 font-extrabold text-primary">
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
                      <td className="border-b border-surface-border px-2 py-2">{renderAdder(stage.id, null)}</td>
                    </tr>
                    {stageMains.map((main) => (
                      <Fragment key={main.id}>
                        {renderRow(main, stage, "رئيسي", main.title)}
                        {(childrenOf.get(main.id) || []).map((child) => renderRow(child, stage, "فرعي", main.title))}
                      </Fragment>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>

      {calOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCalOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-5xl overflow-auto rounded-xl bg-surface p-4 shadow-lg"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-extrabold text-primary">أشهر التنفيذ وأسابيعها</h3>
              <Button type="button" variant="secondary" onClick={() => setCalOpen(false)}>
                إغلاق
              </Button>
            </div>
            {!calendar.months.length ? (
              <p className="text-sm text-brand-gray">لا تواريخ تنفيذ بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-surface-border px-2 py-1 text-right">النشاط</th>
                      {calendar.months.map((m) => (
                        <th key={m.label} className="border border-surface-border px-2 py-1 text-center" colSpan={m.weeks.length}>
                          {m.label}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="border border-surface-border px-2 py-1" />
                      {calendar.months.flatMap((m) =>
                        m.weeks.map((w) => (
                          <th key={w.toISOString()} className="border border-surface-border px-1 py-1 whitespace-nowrap">
                            {w.toLocaleDateString("ar")}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr key={`cal-${a.id}`}>
                        <td className="border border-surface-border px-2 py-1 font-bold">{a.title}</td>
                        {calendar.months.flatMap((m) =>
                          m.weeks.map((w) => (
                            <td
                              key={`${a.id}-${w.toISOString()}`}
                              className={`border border-surface-border px-1 py-2 ${weekHits(a, w) ? "bg-emerald-200" : ""}`}
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
