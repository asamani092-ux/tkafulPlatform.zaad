/** أنواع منصّة المشاريع (project-first) ونظام الخرائط المتعددة. */

export interface PlatformProject {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand_color: string;
  cover_image: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  tools: string[];
}

export interface PublicProjectDetail extends PlatformProject {
  maps: PublicMapIndexEntry[];
}

export interface PublicMapIndexEntry {
  id: number;
  title: string;
  description: string;
  visibility: "public" | "mixed";
  items_count: number;
  project: { id: number; slug: string; name: string; brand_color: string };
}

export type MapFieldType = "text" | "number" | "select" | "boolean" | "date";

export interface MapFieldOption {
  value: string;
  label: string;
}

export interface MapFieldDef {
  key: string;
  label: string;
  type: MapFieldType;
  required: boolean;
  options: Array<MapFieldOption | string>;
  order: number;
}

export interface PublicMapLayer {
  id: number;
  name: string;
  order: number;
  style: Record<string, unknown>;
}

export interface PublicMapItem {
  id: number;
  layer_id: number;
  lat: number;
  lng: number;
  name: string;
  icon: string;
  data: Record<string, unknown>;
}

export interface PublicMapDetail {
  id: number;
  title: string;
  description: string;
  visibility: string;
  icon_set: Record<string, string>;
  color_scheme: Record<string, string>;
  project: { id: number; slug: string; name: string; brand_color: string };
  layers: PublicMapLayer[];
  fields: MapFieldDef[];
  items: PublicMapItem[];
}

export interface MapSummaryInfo {
  items_active: number;
  layers_public: number;
  contributions_pending: number;
  contributions_fulfilled: number | "<5";
  quantity_fulfilled: number;
}

export const TOOL_LABELS: Record<string, string> = {
  map: "الخريطة",
  sponsorships: "الكفالات",
  volunteering: "التطوع",
  services: "الخدمات",
  reports: "التقارير",
};

/** تسميات مفاتيح color_scheme المعروفة (وسيلة الإيضاح) — أي مفتاح آخر يُعرض كما هو. */
export const COLOR_SCHEME_LABELS: Record<string, string> = {
  high: "أولوية عالية",
  medium: "أولوية متوسطة",
  low: "أولوية منخفضة",
  sale_point: "نقطة بيع",
  permanent_corner: "ركن دائم",
  participation_point: "نقطة مشاركة",
  region: "منطقة",
  outlet: "منفذ",
};
