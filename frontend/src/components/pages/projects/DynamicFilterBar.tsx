import type { MapFieldDef } from "./types";
import type { DynamicFilters } from "./filters";
import { filterableFields, optionLabel, optionValue } from "./filters";

interface Props {
  fields: MapFieldDef[];
  filters: DynamicFilters;
  onChange: (next: DynamicFilters) => void;
}

/** فلاتر عامة مولّدة ديناميكياً من مخطط MapItemField (select → chips، boolean → مفتاح). */
export default function DynamicFilterBar({ fields, filters, onChange }: Props) {
  const usable = filterableFields(fields);
  if (!usable.length) return null;

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-bold${active ? " bg-primary text-white" : " bg-surface border border-surface-border"}`;

  return (
    <div className="mb-3 space-y-2">
      {usable.map((field) => (
        <div key={field.key} className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-brand-gray">{field.label}:</span>
          {field.type === "select" ? (
            <>
              <button type="button" className={chipClass(filters[field.key] == null)}
                onClick={() => onChange({ ...filters, [field.key]: null })}>الكل</button>
              {field.options.map((o) => {
                const value = optionValue(o);
                const active = filters[field.key] === value;
                return (
                  <button key={value} type="button" className={chipClass(active)}
                    onClick={() => onChange({ ...filters, [field.key]: active ? null : value })}>
                    {optionLabel(o)}
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <button type="button" className={chipClass(filters[field.key] == null)}
                onClick={() => onChange({ ...filters, [field.key]: null })}>الكل</button>
              <button type="button" className={chipClass(filters[field.key] === true)}
                onClick={() => onChange({ ...filters, [field.key]: filters[field.key] === true ? null : true })}>نعم</button>
              <button type="button" className={chipClass(filters[field.key] === false)}
                onClick={() => onChange({ ...filters, [field.key]: filters[field.key] === false ? null : false })}>لا</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
