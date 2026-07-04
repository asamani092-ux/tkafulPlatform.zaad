export type RegionPriority = "high" | "medium" | "low";
export type OutletType = "sale_point" | "permanent_corner" | "participation_point";
export type ContributionMode = "self_distribution" | "delegate_association";

export interface MapSummary {
  families_served: number;
  products_distributed: number;
  completion_percent: number;
  regions_active: number;
  outlets_active: number;
  contributions_pending: number;
}

export interface MapRegion {
  id: number;
  name: string;
  slug: string;
  center_lat: number;
  center_lng: number;
  boundary: string | null;
  priority: RegionPriority;
  order: number;
  families_served: number | "<5";
  quantity_distributed: number;
  completion_percent: number;
  outlets_count: number;
}

export interface MapProduct {
  id: number;
  name: string;
  slug: string;
  icon: string;
  season: string | null;
  target_families: number | null;
  order: number;
}

export interface MapOutlet {
  id: number;
  name: string;
  type: OutletType;
  lat: number;
  lng: number;
  region_slug: string | null;
  address: string;
  working_hours: string;
}

export const PRIORITY_COLORS: Record<RegionPriority, string> = {
  high: "#dc2626",
  medium: "#f97316",
  low: "#16a34a",
};

export const PRIORITY_LABELS: Record<RegionPriority, string> = {
  high: "أولوية عالية",
  medium: "أولوية متوسطة",
  low: "أولوية منخفضة",
};

export const OUTLET_LABELS: Record<OutletType, string> = {
  sale_point: "نقطة بيع",
  permanent_corner: "ركن دائم",
  participation_point: "نقطة مشاركة",
};

export const OUTLET_COLORS: Record<OutletType, string> = {
  sale_point: "#8b1538",
  permanent_corner: "#f2b824",
  participation_point: "#2563eb",
};
