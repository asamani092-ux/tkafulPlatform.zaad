import { describe, expect, it } from "vitest";
import { applyDynamicFilters, filterableFields, optionLabel, optionValue } from "./filters";
import type { MapFieldDef, PublicMapItem } from "./types";

const fields: MapFieldDef[] = [
  { key: "kind", label: "النوع", type: "select", required: true, options: [{ value: "region", label: "منطقة" }, "outlet"], order: 0 },
  { key: "active", label: "نشط", type: "boolean", required: false, options: [], order: 1 },
  { key: "note", label: "ملاحظة", type: "text", required: false, options: [], order: 2 },
];

const items: PublicMapItem[] = [
  { id: 1, layer_id: 1, lat: 24, lng: 46, name: "أ", icon: "", data: { kind: "region", active: true } },
  { id: 2, layer_id: 1, lat: 24, lng: 46, name: "ب", icon: "", data: { kind: "outlet", active: false } },
  { id: 3, layer_id: 2, lat: 25, lng: 47, name: "ج", icon: "", data: { kind: "region", active: false } },
];

describe("dynamic public filters (MapItemField-driven)", () => {
  it("exposes only select/boolean fields as filters", () => {
    expect(filterableFields(fields).map((f) => f.key)).toEqual(["kind", "active"]);
  });

  it("handles both object and string options", () => {
    expect(optionValue(fields[0].options[0])).toBe("region");
    expect(optionLabel(fields[0].options[0])).toBe("منطقة");
    expect(optionValue(fields[0].options[1])).toBe("outlet");
  });

  it("returns all items when no filter active", () => {
    expect(applyDynamicFilters(items, {})).toHaveLength(3);
    expect(applyDynamicFilters(items, { kind: null })).toHaveLength(3);
  });

  it("filters by select value", () => {
    expect(applyDynamicFilters(items, { kind: "region" }).map((i) => i.id)).toEqual([1, 3]);
  });

  it("combines multiple filters (AND)", () => {
    expect(applyDynamicFilters(items, { kind: "region", active: true }).map((i) => i.id)).toEqual([1]);
  });

  it("filters by boolean false without dropping it", () => {
    expect(applyDynamicFilters(items, { active: false }).map((i) => i.id)).toEqual([2, 3]);
  });
});
