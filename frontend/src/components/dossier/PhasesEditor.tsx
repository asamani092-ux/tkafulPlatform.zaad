import Button from "../ui/Button";
import type { TableColumn } from "./EditableDataTable";

type Row = Record<string, string | number>;

type Props = {
  columns: TableColumn[];
  rows: Row[];
  disabled?: boolean;
  onChange: (rows: Row[]) => void;
  /** العمود الأساسي المميَّز لوناً — افتراضي نوع النشاط. */
  primaryKey?: string;
  /** مفتاح مجموعة أعمدة المخصص بلون موحّد. */
  budgetGroup?: string;
};

function applyComputed(row: Row, cols: TableColumn[]): Row {
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

function FieldInput({
  col,
  value,
  disabled,
  onChange,
  className = "",
}: {
  col: TableColumn;
  value: string | number;
  disabled?: boolean;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="label-field">{col.label}</span>
      <input
        className="input-field mt-1 w-full"
        type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
        value={value ?? (col.type === "number" ? 0 : "")}
        disabled={disabled || !!col.readonly}
        readOnly={!!col.readonly}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * عرض المراحل كبطاقات: عمود أساسي ملوّن + حقول عادية + كتلة مخصص بلون موحّد.
 * التعقيد: O(R·C) زمن/مكان لعرض وتحديث الصفوف.
 */
export default function PhasesEditor({
  columns,
  rows,
  disabled,
  onChange,
  primaryKey = "activity_type",
  budgetGroup = "budget",
}: Props) {
  const primaryCol = columns.find((c) => c.key === primaryKey);
  const budgetCols = columns.filter((c) => c.group === budgetGroup);
  const otherCols = columns.filter((c) => c.key !== primaryKey && c.group !== budgetGroup);

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
    const blank: Row = {};
    columns.forEach((c) => {
      blank[c.key] = c.type === "number" ? 0 : "";
    });
    onChange([...rows, applyComputed(blank, columns)]);
  };

  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-brand-gray">
          {rows.length ? `${rows.length} مرحلة` : "لا مراحل بعد — أضف مرحلة للبدء"}
        </p>
        {!disabled && (
          <Button type="button" variant="secondary" onClick={addRow}>
            إضافة مرحلة
          </Button>
        )}
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-border px-4 py-8 text-center text-sm text-brand-gray">
          لا مراحل بعد
        </div>
      )}

      {rows.map((row, i) => (
        <article
          key={i}
          className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm"
        >
          {/* العمود الأساسي — لون مميَّز */}
          {primaryCol && (
            <div className="border-b border-primary/15 bg-primary/10 px-4 py-3 sm:px-5">
              <FieldInput
                col={primaryCol}
                value={row[primaryCol.key] ?? ""}
                disabled={disabled}
                onChange={(v) => updateRow(i, primaryCol.key, v)}
              />
            </div>
          )}

          <div className="space-y-3 px-4 py-3 sm:px-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {otherCols.map((col) => (
                <FieldInput
                  key={col.key}
                  col={col}
                  value={row[col.key] ?? (col.type === "number" ? 0 : "")}
                  disabled={disabled}
                  onChange={(v) => updateRow(i, col.key, v)}
                  className={col.key === "output" ? "sm:col-span-2" : undefined}
                />
              ))}
            </div>

            {/* أعمدة المخصص — لون موحّد يختلف عن الباقي */}
            {budgetCols.length > 0 && (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 p-3">
                <p className="mb-2 text-xs font-extrabold text-amber-900/80">المخصص المالي</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {budgetCols.map((col) => (
                    <FieldInput
                      key={col.key}
                      col={col}
                      value={row[col.key] ?? 0}
                      disabled={disabled}
                      onChange={(v) => updateRow(i, col.key, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            {!disabled && (
              <div className="flex justify-start">
                <button
                  type="button"
                  className="text-xs font-bold text-red-700 hover:underline"
                  onClick={() => removeRow(i)}
                >
                  حذف المرحلة
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
