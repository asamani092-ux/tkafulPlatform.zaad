import Button from "../ui/Button";
import CollapsibleCard from "./CollapsibleCard";
import EditableDataTable, { type TableColumn } from "./EditableDataTable";
import { APPROVALS_EXCEL_COLUMNS, APPROVALS_STATUS_AR } from "./approvalsTableColumns";
import { SECTION_STATUS_AR, type SchemaSection } from "./types";

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
            <p className="border-b border-surface-border bg-surface-muted/30 px-2 py-1.5 text-xs font-bold text-brand-gray">
              جدول الاعتمادات (حالة القرار — للقراءة فقط)
            </p>
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
