import { SECTION_STATUS_AR } from "./types";

type Pair = {
  label: string;
  document_key: string;
  closure_key: string;
  document_status: string;
  closure_status: string;
  document_data: Record<string, unknown>;
  closure_data: Record<string, unknown>;
};

type Props = {
  pairs: Pair[];
  budgetLines?: Array<{
    id: number;
    title: string;
    proposed: string;
    allocated: string;
    spent: string;
    remaining: string;
  }>;
};

function summarize(data: Record<string, unknown>): string {
  const keys = Object.keys(data || {});
  if (!keys.length) return "—";
  return keys
    .slice(0, 4)
    .map((k) => {
      const v = data[k];
      if (Array.isArray(v)) return `${k}: ${v.length} صف`;
      return `${k}: ${String(v ?? "").slice(0, 40)}`;
    })
    .join(" · ");
}

/** مقارنة ما في الوثيقة بما سُجّل عند الإغلاق. */
export default function ClosureComparison({ pairs, budgetLines }: Props) {
  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-sm text-brand-gray">
        الفرق بين ما خُطّط في الوثيقة وما سُجّل عند الإغلاق — مهم لمعرفة ماذا حصل.
      </p>
      {pairs.map((p) => (
        <div key={`${p.document_key}-${p.closure_key}`} className="rounded-xl border border-surface-border bg-surface p-3">
          <div className="mb-2 font-bold text-primary">{p.label}</div>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div className="rounded-lg bg-surface-muted p-2">
              <div className="text-xs font-bold text-brand-gray">
                في الوثيقة · {SECTION_STATUS_AR[p.document_status] || p.document_status}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{summarize(p.document_data)}</div>
            </div>
            <div className="rounded-lg bg-surface-muted p-2">
              <div className="text-xs font-bold text-brand-gray">
                عند الإغلاق · {SECTION_STATUS_AR[p.closure_status] || p.closure_status}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{summarize(p.closure_data)}</div>
            </div>
          </div>
        </div>
      ))}
      {(budgetLines || []).length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface p-3">
          <div className="mb-2 font-bold text-primary">بنود التكلفة: مقترح مقابل مصروف</div>
          <ul className="space-y-1 text-sm">
            {budgetLines!.map((bl) => (
              <li key={bl.id}>
                {bl.title}: مقترح {bl.proposed} · مخصص {bl.allocated} · مصروف {bl.spent} · متبقي{" "}
                {bl.remaining}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
