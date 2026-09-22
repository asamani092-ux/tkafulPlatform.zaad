import Button from "../ui/Button";
import Badge from "../ui/Badge";
import CollapsibleCard from "./CollapsibleCard";

export type InfoPagePayload = {
  code: string;
  name: string;
  department: string;
  section: string;
  strategic_goal: string;
  execution_start: string | null;
  execution_end: string | null;
  location: string;
  sponsor_name: string;
  sponsor_email: string;
  indicators: Array<Record<string, unknown>>;
  phases_budget_summary: {
    from_association: number;
    from_donation: number;
    total: number;
    rows: Array<Record<string, unknown>>;
  };
  project_budget: Array<Record<string, unknown>>;
  outputs: Array<Record<string, unknown>>;
  similar_experiences: Array<Record<string, unknown>>;
};

type Props = {
  data: InfoPagePayload;
  onBack: () => void;
};

function ReadTable({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="border-b border-surface-border px-2 py-2 text-right text-primary">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-3 text-center text-brand-gray">
                لا بيانات بعد
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="odd:bg-surface">
                {columns.map((c) => (
                  <td key={c.key} className="border-b border-surface-border px-2 py-2">
                    {String(row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** صفحة المعلومات — عرض فقط لمؤشرات وملخص البطاقة. */
export default function DossierInfoPage({ data, onBack }: Props) {
  const summary = data.phases_budget_summary;
  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-primary">صفحة المعلومات</h2>
          <p className="text-sm text-brand-gray">عرض فقط — تُغذّى من تبويب البطاقة</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{data.code}</Badge>
          <Button type="button" variant="secondary" onClick={onBack}>
            العودة للبطاقة
          </Button>
        </div>
      </div>

      <CollapsibleCard title="بيانات المشروع" defaultOpen={false}>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {(
            [
              ["الاسم", data.name],
              ["الإدارة", data.department],
              ["القسم", data.section],
              ["الموقع", data.location],
              ["تاريخ البدء", data.execution_start || "—"],
              ["تاريخ الانتهاء", data.execution_end || "—"],
              ["راعي المشروع", data.sponsor_name],
              ["ايميل الراعي", data.sponsor_email],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-surface-muted/30 px-3 py-2">
              <dt className="text-xs text-brand-gray">{k}</dt>
              <dd className="font-bold text-primary">{v || "—"}</dd>
            </div>
          ))}
          <div className="rounded-lg bg-surface-muted/30 px-3 py-2 sm:col-span-2">
            <dt className="text-xs text-brand-gray">الهدف الاستراتيجي</dt>
            <dd className="whitespace-pre-wrap font-bold text-primary">{data.strategic_goal || "—"}</dd>
          </div>
        </dl>
      </CollapsibleCard>

      <CollapsibleCard
        title="المؤشرات الرئيسية"
        defaultOpen={false}
        subtitle={data.indicators.length ? `${data.indicators.length} مؤشر` : "لا مؤشرات"}
      >
        <ReadTable
          columns={[
            { key: "goal", label: "الهدف" },
            { key: "indicator_name", label: "اسم المؤشر" },
            { key: "target", label: "المستهدف" },
          ]}
          rows={data.indicators}
        />
      </CollapsibleCard>

      <CollapsibleCard title="ملخص المخصص وفق المراحل" defaultOpen={false}>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-emerald-50 px-2 py-3">
            <div className="text-xs text-brand-gray">من الجمعية</div>
            <div className="font-extrabold text-primary">{summary.from_association.toLocaleString("ar-SA")}</div>
          </div>
          <div className="rounded-lg bg-sky-50 px-2 py-3">
            <div className="text-xs text-brand-gray">من التبرع</div>
            <div className="font-extrabold text-primary">{summary.from_donation.toLocaleString("ar-SA")}</div>
          </div>
          <div className="rounded-lg bg-amber-50 px-2 py-3">
            <div className="text-xs text-brand-gray">الإجمالي</div>
            <div className="font-extrabold text-primary">{summary.total.toLocaleString("ar-SA")}</div>
          </div>
        </div>
        <ReadTable
          columns={[
            { key: "activity_type", label: "نوع النشاط" },
            { key: "executor", label: "المنفذ" },
            { key: "budget_association", label: "من الجمعية" },
            { key: "budget_donation", label: "من المتبرع" },
            { key: "budget_total", label: "إجمالي المخصص" },
          ]}
          rows={summary.rows}
        />
      </CollapsibleCard>

      <CollapsibleCard title="المخصص المالي لكامل المشروع" defaultOpen={false}>
        <ReadTable
          columns={[
            { key: "from_association", label: "من الجمعية" },
            { key: "from_donation", label: "من التبرع" },
            { key: "total", label: "الاجمالي" },
          ]}
          rows={data.project_budget}
        />
      </CollapsibleCard>
    </div>
  );
}
