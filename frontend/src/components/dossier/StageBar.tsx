import { STAGE_STATUS_AR, type DossierStageRow } from "./types";

const STAGE_LABEL: Record<string, string> = {
  define: "التعريف",
  prepare: "التجهيز",
  plan: "التخطيط",
  execute: "التنفيذ",
  close: "الإغلاق",
};

const tone: Record<string, string> = {
  locked: "bg-gray-100 text-gray-500 border-gray-200",
  active: "bg-amber-50 text-amber-900 border-amber-300",
  submitted: "bg-sky-50 text-sky-900 border-sky-300",
  approved: "bg-emerald-50 text-emerald-900 border-emerald-300",
  returned: "bg-rose-50 text-rose-900 border-rose-300",
};

type Props = {
  stages: DossierStageRow[];
  currentKey?: string;
};

export default function StageBar({ stages, currentKey }: Props) {
  const ordered = [...stages].sort((a, b) => a.order - b.order);
  return (
    <ol className="flex flex-wrap gap-2" dir="rtl">
      {ordered.map((s) => {
        const active = s.key === currentKey || s.status === "active" || s.status === "returned";
        return (
          <li
            key={s.id}
            className={`min-w-[7.5rem] flex-1 rounded-xl border px-3 py-2 text-center ${tone[s.status] || tone.locked} ${
              active ? "ring-2 ring-primary/30" : ""
            }`}
          >
            <div className="text-xs font-bold">{STAGE_LABEL[s.key] || s.key}</div>
            <div className="mt-0.5 text-[11px]">{STAGE_STATUS_AR[s.status] || s.status}</div>
          </li>
        );
      })}
    </ol>
  );
}
