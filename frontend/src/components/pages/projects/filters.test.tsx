import { describe, expect, it } from "vitest";
import {
  applyDynamicFilters,
  displayFieldValue,
  filterableFields,
  mergeFields,
  optionLabel,
  optionValue,
  sumMasked,
} from "./filters";
import type { MapFieldDef, PublicMapItem } from "./types";

const fields: MapFieldDef[] = [
  { key: "kind", label: "النوع", type: "select", required: true, options: [{ value: "region", label: "منطقة" }, "outlet"], order: 0 },
  { key: "priority", label: "الأولوية", type: "select", required: false, options: ["high", "medium", "low"], order: 1 },
  { key: "active", label: "نشط", type: "boolean", required: false, options: [], order: 2 },
  { key: "note", label: "ملاحظة", type: "text", required: false, options: [], order: 3 },
];

const items: PublicMapItem[] = [
  { id: 1, layer_id: 1, lat: 24, lng: 46, name: "أ", icon: "", data: { kind: "region", active: true } },
  { id: 2, layer_id: 1, lat: 24, lng: 46, name: "ب", icon: "", data: { kind: "outlet", active: false } },
  { id: 3, layer_id: 2, lat: 25, lng: 47, name: "ج", icon: "", data: { kind: "region", active: false } },
];

describe("dynamic public filters (MapItemField-driven)", () => {
  it("exposes only select/boolean fields as filters (hides kind/priority/outlet_type/product)", () => {
    expect(filterableFields(fields).map((f) => f.key)).toEqual(["active"]);
  });

  it("excludes outlet_type, kind, and product from public filters", () => {
    const withExtra: MapFieldDef[] = [
      ...fields,
      {
        key: "outlet_type",
        label: "نوع المنفذ",
        type: "select",
        required: false,
        options: ["pos", "corner"],
        order: 4,
      },
      {
        key: "product",
        label: "المنتج",
        type: "select",
        required: false,
        options: ["winter"],
        order: 5,
      },
    ];
    expect(filterableFields(withExtra).map((f) => f.key)).toEqual(["active"]);
  });

  it("handles both object and string options", () => {
    expect(optionValue(fields[0].options[0])).toBe("region");
    expect(optionLabel(fields[0].options[0])).toBe("منطقة");
    expect(optionValue(fields[0].options[1])).toBe("outlet");
    expect(optionLabel(fields[0].options[1])).toBe("منفذ");
    expect(optionLabel("sale_point")).toBe("نقطة بيع");
  });

  it("displays field values in Arabic via option labels", () => {
    const outletType: MapFieldDef = {
      key: "outlet_type",
      label: "نوع المنفذ",
      type: "select",
      required: false,
      options: [{ value: "sale_point", label: "نقطة بيع" }],
      order: 0,
    };
    expect(displayFieldValue(outletType, "sale_point")).toBe("نقطة بيع");
    expect(displayFieldValue(fields[0], "outlet")).toBe("منفذ");
    expect(displayFieldValue(undefined, "outlet")).toBe("منفذ");
    expect(displayFieldValue(fields[2], true)).toBe("نعم");
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

describe("aggregator helpers (unified /map)", () => {
  it("merges fields across maps with select options union", () => {
    const a: MapFieldDef[] = [
      { key: "kind", label: "النوع", type: "select", required: false, options: ["region"], order: 0 },
    ];
    const b: MapFieldDef[] = [
      { key: "kind", label: "النوع", type: "select", required: false, options: ["region", { value: "outlet", label: "منفذ" }], order: 0 },
      { key: "active", label: "نشط", type: "boolean", required: false, options: [], order: 1 },
    ];
    const merged = mergeFields([a, b]);
    expect(merged.map((f) => f.key)).toEqual(["kind", "active"]);
    expect(merged[0].options.map(optionValue)).toEqual(["region", "outlet"]);
  });

  it("sums masked values without revealing small counts (PDPL)", () => {
    expect(sumMasked([10, 7])).toEqual({ total: 17, masked: false });
    expect(sumMasked([10, "<5"])).toEqual({ total: 10, masked: true });
    expect(sumMasked(["<5", "<5"])).toEqual({ total: 0, masked: true });
  });
});
