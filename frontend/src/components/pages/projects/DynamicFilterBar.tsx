import type { MapFieldDef } from "./types";
import type { DynamicFilters } from "./filters";
import { filterableFields, optionLabel, optionValue } from "./filters";
import Chip from "../../ui/Chip";

interface Props {
  fields: MapFieldDef[];
  filters: DynamicFilters;
  onChange: (next: DynamicFilters) => void;
}

/** فلاتر عامة مولّدة ديناميكياً من مخطط MapItemField — FilterBar + Chips. */
export default function DynamicFilterBar({ fields, filters, onChange }: Props) {
  const usable = filterableFields(fields);
  if (!usable.length) return null;

  return (
    <div className="zad-filter-bar" role="search" aria-label="فلاتر الخريطة">
      {usable.map((field) => (
        <div key={field.key} className="zad-filter-bar__row">
          <span className="zad-filter-bar__label">{field.label}:</span>
          {field.type === "select" ? (
            <>
              <Chip
                active={filters[field.key] == null}
                onClick={() => onChange({ ...filters, [field.key]: null })}
              >
                الكل
              </Chip>
              {field.options.map((o) => {
                const value = optionValue(o);
                const active = filters[field.key] === value;
                return (
                  <Chip
                    key={value}
                    active={active}
                    onClick={() => onChange({ ...filters, [field.key]: active ? null : value })}
                  >
                    {optionLabel(o)}
                  </Chip>
                );
              })}
            </>
          ) : (
            <>
              <Chip
                active={filters[field.key] == null}
                onClick={() => onChange({ ...filters, [field.key]: null })}
              >
                الكل
              </Chip>
              <Chip
                active={filters[field.key] === true}
                onClick={() => onChange({ ...filters, [field.key]: filters[field.key] === true ? null : true })}
              >
                نعم
              </Chip>
              <Chip
                active={filters[field.key] === false}
                onClick={() => onChange({ ...filters, [field.key]: filters[field.key] === false ? null : false })}
              >
                لا
              </Chip>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
