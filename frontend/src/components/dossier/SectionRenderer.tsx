import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import type { SchemaField, SchemaSection } from "./types";

type Props = {
  section: SchemaSection;
  data: Record<string, unknown>;
  disabled?: boolean;
  onChange: (next: Record<string, unknown>) => void;
};

function asRows(val: unknown): Record<string, string>[] {
  return Array.isArray(val) ? (val as Record<string, string>[]) : [];
}

/** عارض/محرّر قسم من مخطط الخادم. O(F + صفوف الجداول). */
export default function SectionRenderer({ section, data, disabled, onChange }: Props) {
  const setField = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  return (
    <div className="space-y-3" dir="rtl">
      {section.fields.map((f) => (
        <FieldEditor
          key={f.key}
          field={f}
          value={data[f.key]}
          disabled={disabled}
          onChange={(v) => setField(f.key, v)}
        />
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  value,
  disabled,
  onChange,
}: {
  field: SchemaField;
  value: unknown;
  disabled?: boolean;
  onChange: (v: unknown) => void;
}) {
  const label = `${field.label}${field.required ? " *" : ""}`;

  if (field.type === "textarea") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block font-bold text-primary">{label}</span>
        <textarea
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
          rows={4}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <Select
        label={label}
        value={String(value ?? "")}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "table") {
    const cols = field.columns || [];
    const rows = asRows(value);
    const updateRow = (i: number, key: string, v: string) => {
      const next = rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r));
      onChange(next);
    };
    const addRow = () => {
      const blank: Record<string, string> = {};
      cols.forEach((c) => {
        blank[c.key] = "";
      });
      onChange([...rows, blank]);
    };
    const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-primary">{label}</span>
          {!disabled && (
            <Button type="button" variant="secondary" onClick={addRow}>
              إضافة صف
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className="border-b border-surface-border px-2 py-1 text-right text-primary">
                    {c.label}
                  </th>
                ))}
                {!disabled && <th className="w-16" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c.key} className="border-b border-surface-border px-1 py-1">
                      <input
                        className="w-full rounded border border-surface-border bg-surface px-2 py-1"
                        value={row[c.key] ?? ""}
                        disabled={disabled}
                        onChange={(e) => updateRow(i, c.key, e.target.value)}
                      />
                    </td>
                  ))}
                  {!disabled && (
                    <td className="px-1">
                      <button type="button" className="text-xs text-red-700" onClick={() => removeRow(i)}>
                        حذف
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 1} className="py-3 text-center text-brand-gray">
                    لا صفوف بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <Input
      label={label}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value === undefined || value === null ? "" : String(value)}
      disabled={disabled}
      onChange={(e) =>
        onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
      }
    />
  );
}
