import { STAGE_STATUS_AR } from "./types";

const tone: Record<string, string> = {
  locked: "bg-gray-100 text-gray-500 border-gray-200",
  active: "bg-amber-50 text-amber-900 border-amber-300",
  submitted: "bg-sky-50 text-sky-900 border-sky-300",
  approved: "bg-emerald-50 text-emerald-900 border-emerald-300",
  returned: "bg-rose-50 text-rose-900 border-rose-300",
};

export type WorkspaceRow = {
  id: number;
  order: number;
  key: string;
  label: string;
  status: string;
  return_note?: string;
  needs_approval?: boolean;
};

type Props = {
  workspaces: WorkspaceRow[];
  currentKey?: string;
  /** مشرف أو مدير الإدارة — يفتح كل التبويبات للتصفح/العمل */
  bypassLocked?: boolean;
  onSelect?: (key: string) => void;
};

/** شريط تسلسل التبويبات (بطاقة → وثيقة → خطة → إغلاق → لوحة). */
export default function StageBar({ workspaces, currentKey, bypassLocked = false, onSelect }: Props) {
  const ordered = [...workspaces].sort((a, b) => a.order - b.order);
  const active = ordered.find((s) => s.status === "active" || s.status === "returned" || s.status === "submitted");
  return (
    <div className="space-y-2" dir="rtl">
      <ol className="flex flex-wrap gap-2">
        {ordered.map((s) => {
          const isCurrent = s.key === currentKey;
          const lockedForUser = s.status === "locked" && !bypassLocked;
          return (
            <li key={s.id} className="min-w-[7.5rem] flex-1">
              <button
                type="button"
                disabled={lockedForUser || !onSelect}
                onClick={() => {
                  if (!lockedForUser && onSelect) onSelect(s.key);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-center ${tone[s.status] || tone.locked} ${
                  isCurrent ? "ring-2 ring-primary/30" : ""
                } ${lockedForUser ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
              >
                <div className="text-xs font-bold">{s.label || s.key}</div>
                <div className="mt-0.5 text-[11px]">{STAGE_STATUS_AR[s.status] || s.status}</div>
              </button>
            </li>
          );
        })}
      </ol>
      {active && active.needs_approval !== false && active.key !== "card" && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {active.status === "submitted"
            ? `بانتظار اعتماد مدير الإدارة لتبويب «${active.label}» — التبويب التالي يبقى مقفلاً.`
            : `أرسل تبويب «${active.label}» لاعتماد مدير الإدارة — البطاقة بلا اعتماد.`}
        </p>
      )}
      {bypassLocked && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          حسابك (مشرف أو مدير الإدارة) يفتح كل التبويبات — التسلسل يبقى ظاهراً للموظفين.
        </p>
      )}
    </div>
  );
}
