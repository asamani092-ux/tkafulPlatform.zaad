/** أنواع منصّة المشاريع (project-first) ونظام الخرائط المتعددة. */

export interface PlatformProject {
  id: number;
  name: string;
  slug: string;
  description: string;
  brand_color: string;
  cover_image: string;
  donation_url?: string;
  donation_label?: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  tools: string[];
  type_name?: string | null;
  type_slug?: string | null;
}

export interface ProjectType {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  order: number;
}

export interface PublicProjectDetail extends PlatformProject {
  maps: PublicMapIndexEntry[];
  tool_config?: Record<string, Record<string, unknown>>;
}

export interface PublicMapIndexEntry {
  id: number;
  title: string;
  description: string;
  visibility: "public" | "mixed";
  items_count: number;
  project: { id: number; slug: string; name: string; brand_color: string; donation_url?: string; donation_label?: string };
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
  project: { id: number; slug: string; name: string; brand_color: string; donation_url?: string; donation_label?: string };
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

/** تسميات حالات المشروع (دورة الحياة). */
export const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  completed: "مكتمل",
  archived: "مؤرشف",
};

/** تسميات إجراءات الانتقال (تطابق أسماء أفعال الخادم). */
export const LIFECYCLE_ACTION_LABELS: Record<string, string> = {
  activate: "تفعيل",
  complete: "إكمال",
  archive: "أرشفة",
  reopen: "إعادة فتح",
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
