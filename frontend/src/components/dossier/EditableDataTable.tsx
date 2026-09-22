import Button from "../ui/Button";

export type TableColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "date";
  group?: string;
  computed?: string;
  readonly?: boolean;
};

export type HeaderGroup = { key: string; label: string };

type Props = {
  label: string;
  hideTitle?: boolean;
  columns: TableColumn[];
  headerGroups?: HeaderGroup[];
  rows: Record<string, string | number>[];
  disabled?: boolean;
  onChange: (rows: Record<string, string | number>[]) => void;
};

function applyComputed(row: Record<string, string | number>, cols: TableColumn[]): Record<string, string | number> {
  const next = { ...row };
  for (const c of cols) {
    const computed = c.computed || "";
    if (computed.startsWith("sum:")) {
      const parts = computed
        .slice(4)
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      next[c.key] = parts.reduce((acc, k) => acc + (Number(next[k]) || 0), 0);
    }
  }
  return next;
}

/** جدول قابل للإضافة/التعديل/الحذف مع رؤوس مجموعات اختيارية. O(R·C). */
export default function EditableDataTable({
  label,
  hideTitle = false,
  columns,
  headerGroups = [],
  rows,
  disabled,
  onChange,
}: Props) {
  const groupMap = Object.fromEntries(headerGroups.map((g) => [g.key, g.label]));
  const grouped = columns.some((c) => c.group);

  const updateRow = (i: number, key: string, v: string) => {
    const next = rows.map((r, idx) => {
      if (idx !== i) return r;
      const col = columns.find((c) => c.key === key);
      const raw: string | number = col?.type === "number" ? (v === "" ? 0 : Number(v)) : v;
      return applyComputed({ ...r, [key]: raw }, columns);
    });
    onChange(next);
  };

  const addRow = () => {
    const blank: Record<string, string | number> = {};
    columns.forEach((c) => {
      blank[c.key] = c.type === "number" ? 0 : "";
    });
    onChange([...rows, applyComputed(blank, columns)]);
  };

  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        {!hideTitle ? <h3 className="text-base font-bold text-primary">{label}</h3> : <span />}
        {!disabled && (
          <Button type="button" variant="secondary" onClick={addRow}>
            إضافة صف
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            {grouped && (
              <tr className="bg-surface-muted/40">
                {columns.map((c) => {
                  if (!c.group) {
                    return <th key={c.key} className="border-b border-surface-border px-2 py-1" />;
                  }
                  const first = columns.find((x) => x.group === c.group);
                  if (first?.key !== c.key) return null;
                  const span = columns.filter((x) => x.group === c.group).length;
                  return (
                    <th
                      key={`g-${c.group}`}
                      colSpan={span}
                      className="border-b border-surface-border px-2 py-2 text-center text-sm font-extrabold text-primary"
                    >
                      {groupMap[c.group] || c.group}
                    </th>
                  );
                })}
                {!disabled && <th className="border-b border-surface-border" />}
              </tr>
            )}
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="border-b border-surface-border px-2 py-2 text-right font-bold text-primary">
                  {c.label}
                </th>
              ))}
              {!disabled && <th className="w-16 border-b border-surface-border" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-surface">
                {columns.map((c) => (
                  <td key={c.key} className="border-b border-surface-border px-1 py-1">
                    <input
                      className="input-field w-full !py-1 text-sm"
                      type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"}
                      value={row[c.key] ?? (c.type === "number" ? 0 : "")}
                      disabled={disabled || !!c.readonly}
                      readOnly={!!c.readonly}
                      onChange={(e) => updateRow(i, c.key, e.target.value)}
                    />
                  </td>
                ))}
                {!disabled && (
                  <td className="border-b border-surface-border px-1 text-center">
                    <button type="button" className="text-xs font-bold text-red-700" onClick={() => removeRow(i)}>
                      حذف
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (disabled ? 0 : 1)} className="py-4 text-center text-brand-gray">
                  لا صفوف بعد — أضف صفاً للبدء
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
