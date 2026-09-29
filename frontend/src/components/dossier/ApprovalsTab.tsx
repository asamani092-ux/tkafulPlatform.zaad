import Button from "../ui/Button";
import CollapsibleCard from "./CollapsibleCard";
import EditableDataTable, { type TableColumn } from "./EditableDataTable";
import { SECTION_STATUS_AR, type SchemaSection } from "./types";

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار",
  approved: "معتمد",
  rejected: "مرفوض",
};

type Props = {
  section: SchemaSection;
  status: string;
  data: Record<string, unknown>;
  canEdit: boolean;
  savingKey: string;
  onChange: (next: Record<string, unknown>) => void;
  onSave: () => void;
};

function asRows(val: unknown): Record<string, string | number>[] {
  return Array.isArray(val) ? (val as Record<string, string | number>[]) : [];
}

/** تبويب الاعتمادات — سجل المعتمدين ومصدر الإرسال بالبريد. */
export default function ApprovalsTab({ section, status, data, canEdit, savingKey, onChange, onSave }: Props) {
  const tableField = section.fields.find((f) => f.type === "table");
  const columns: TableColumn[] = (tableField?.columns || [])
    .filter((c) => !(c as { hidden?: boolean }).hidden && c.key !== "status")
    .map((c) => ({
      key: c.key,
      label: c.label,
      type: (c.type as TableColumn["type"]) || "text",
    }));

  const rows = asRows(data.rows);

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-sm text-brand-gray">
        عرّف المعتمدين (الدور، الاسم، البريد). عند إرسال أي تبويب للاعتماد يُرسل رابط لكل صف ببريد صالح، وتُحدَّث
        الحالة هنا تلقائياً.
      </p>
      <CollapsibleCard
        title={section.label}
        defaultOpen
        subtitle={SECTION_STATUS_AR[status] || status}
      >
        <EditableDataTable
          label="المعتمدون"
          columns={columns}
          rows={rows}
          disabled={!canEdit}
          onChange={(next) => onChange({ rows: next })}
        />
        {rows.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-muted/40">
                  <th className="px-2 py-2 text-right font-bold text-primary">الاسم</th>
                  <th className="px-2 py-2 text-right font-bold text-primary">الحالة</th>
                  <th className="px-2 py-2 text-right font-bold text-primary">تاريخ القرار</th>
                  <th className="px-2 py-2 text-right font-bold text-primary">سبب الرفض</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="border-t border-surface-border px-2 py-2">{String(row.name || "—")}</td>
                    <td className="border-t border-surface-border px-2 py-2">
                      {STATUS_AR[String(row.status || "pending")] || String(row.status || "—")}
                    </td>
                    <td className="border-t border-surface-border px-2 py-2">{String(row.decided_at || "—")}</td>
                    <td className="border-t border-surface-border px-2 py-2">{String(row.rejection_reason || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canEdit && (
          <div className="mt-3">
            <Button type="button" onClick={onSave} disabled={savingKey === "approvals:approvals_record"}>
              حفظ سجل المعتمدين
            </Button>
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
}
