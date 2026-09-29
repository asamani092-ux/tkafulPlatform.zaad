import CollapsibleCard from "./CollapsibleCard";
import { APPROVALS_EXCEL_COLUMNS, APPROVALS_STATUS_AR } from "./approvalsTableColumns";

type Props = {
  rows: Record<string, unknown>[];
};

/** جدول الاعتمادات في وثيقة الإغلاق — للعرض فقط من سجل تبويب الاعتمادات. */
export default function ClosureApprovalsReadOnly({ rows }: Props) {
  return (
    <CollapsibleCard title="جدول الاعتمادات" defaultOpen subtitle="للقراءة — يُحدَّث من تبويب الاعتمادات">
      {rows.length === 0 ? (
        <p className="text-sm text-brand-gray">لا معتمدين بعد — عرّفهم في تبويب الاعتمادات.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted/40">
                {APPROVALS_EXCEL_COLUMNS.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-right font-bold text-primary">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {APPROVALS_EXCEL_COLUMNS.map((c) => {
                    const raw = row[c.key];
                    const text =
                      c.key === "status"
                        ? APPROVALS_STATUS_AR[String(raw || "pending")] || String(raw || "—")
                        : String(raw ?? "—") || "—";
                    return (
                      <td key={c.key} className="border-t border-surface-border px-2 py-2">
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleCard>
  );
}
