/**
 * الفلاتر العامة الديناميكية المشتقة من MapItemField — دوال نقية قابلة للاختبار.
 * التعقيد: applyDynamicFilters O(N·K) حيث N عدد العناصر وK عدد الفلاتر المفعّلة.
 */
import type { MapFieldDef, MapFieldOption, PublicMapItem } from "./types";

export type DynamicFilterValue = string | boolean;
export type DynamicFilters = Record<string, DynamicFilterValue | null>;

export function optionValue(option: MapFieldOption | string): string {
  return typeof option === "string" ? option : option.value;
}

export function optionLabel(option: MapFieldOption | string): string {
  return typeof option === "string" ? option : option.label;
}

/** الحقول التي تصلح كفلاتر عامة: select و boolean فقط. */
export function filterableFields(fields: MapFieldDef[]): MapFieldDef[] {
  return fields.filter((f) => f.type === "select" || f.type === "boolean");
}

/** يطبّق الفلاتر المفعّلة (غير null) على العناصر بمطابقة قيمة data[key]. */
export function applyDynamicFilters(
  items: PublicMapItem[],
  filters: DynamicFilters,
): PublicMapItem[] {
  const active = Object.entries(filters).filter(([, v]) => v !== null && v !== undefined);
  if (!active.length) return items;
  return items.filter((item) =>
    active.every(([key, value]) => item.data?.[key] === value),
  );
}
