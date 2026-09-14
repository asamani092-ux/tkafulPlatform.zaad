import type { ReactNode } from "react";
import type { MapFieldDef } from "./types";
import type { DynamicFilters } from "./filters";
import { filterableFields, optionLabel, optionValue } from "./filters";
import Select from "../../ui/Select";

interface Props {
  fields: MapFieldDef[];
  filters: DynamicFilters;
  onChange: (next: DynamicFilters) => void;
  /** فلاتر إضافية تظهر أولاً في نفس الصف (مثل اختيار المشروع). */
  leading?: ReactNode;
}

const ALL = "__all__";

/** شريط فلاتر أفقي موحّد فوق الخريطة — تمرير أفقي على الجوال. */
export default function DynamicFilterBar({ fields, filters, onChange, leading }: Props) {
  const usable = filterableFields(fields);
  if (!usable.length && !leading) return null;

  return (
    <div className="zad-filter-bar" role="group" aria-label="فلاتر الخريطة">
      {leading}
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
  );
}
