import type { MapFieldDef } from "./types";
import type { DynamicFilters } from "./filters";
import { filterableFields, optionLabel, optionValue } from "./filters";
import Select from "../../ui/Select";

interface Props {
  fields: MapFieldDef[];
  filters: DynamicFilters;
  onChange: (next: DynamicFilters) => void;
}

const ALL = "__all__";

/** فلاتر ديناميكية كقوائم منسدلة (تجربة عرض بدل الـ chips). */
export default function DynamicFilterBar({ fields, filters, onChange }: Props) {
  const usable = filterableFields(fields);
  if (!usable.length) return null;

  return (
    <div className="zad-filter-bar">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {usable.map((field) => {
          const current = filters[field.key];
          const selectValue =
            current === null || current === undefined ? ALL : String(current);

          return (
            <Select
              key={field.key}
              id={`filter-${field.key}`}
              label={field.label}
              value={selectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === ALL) {
                  onChange({ ...filters, [field.key]: null });
                  return;
                }
                if (field.type === "boolean") {
                  onChange({ ...filters, [field.key]: v === "true" });
                  return;
                }
                onChange({ ...filters, [field.key]: v });
              }}
            >
              <option value={ALL}>الكل</option>
              {field.type === "select" ? (
                field.options.map((o) => {
                  const value = optionValue(o);
                  return (
                    <option key={value} value={value}>
                      {optionLabel(o)}
                    </option>
                  );
                })
              ) : (
                <>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </>
              )}
            </Select>
          );
        })}
      </div>
    </div>
  );
}
