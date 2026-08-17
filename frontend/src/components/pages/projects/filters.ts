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

/** الحقول التي تصلح كفلاتر عامة: select و boolean فقط — باستثناء الأولوية ونوع المنفذ. */
export function filterableFields(fields: MapFieldDef[]): MapFieldDef[] {
  return fields.filter(
    (f) =>
      (f.type === "select" || f.type === "boolean") &&
      f.key !== "priority" &&
      f.key !== "outlet_type",
  );
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

/**
 * دمج حقول عدة خرائط لفلاتر موحّدة (المجمّع /map): توحيد بالمفتاح مع اتحاد خيارات
 * select حسب القيمة — O(M·F) حيث M عدد الخرائط وF حقولها.
 */
export function mergeFields(fieldSets: MapFieldDef[][]): MapFieldDef[] {
  const merged = new Map<string, MapFieldDef>();
  for (const fields of fieldSets) {
    for (const field of fields) {
      const existing = merged.get(field.key);
      if (!existing) {
        merged.set(field.key, { ...field, options: [...field.options] });
        continue;
      }
      if (field.type === "select" && existing.type === "select") {
        const seen = new Set(existing.options.map(optionValue));
        for (const option of field.options) {
          if (!seen.has(optionValue(option))) {
            existing.options.push(option);
            seen.add(optionValue(option));
          }
        }
      }
    }
  }
  return [...merged.values()].sort((a, b) => a.order - b.order);
}

/**
 * جمع قيم قد تكون مقنّعة PDPL ("<5"): يجمع الأرقام فقط ويُعلم بوجود قيم مقنّعة —
 * لا يكشف القيم الصغيرة أبداً. O(V).
 */
export function sumMasked(values: Array<number | "<5">): { total: number; masked: boolean } {
  let total = 0;
  let masked = false;
  for (const value of values) {
    if (value === "<5") masked = true;
    else total += value;
  }
  return { total, masked };
}
