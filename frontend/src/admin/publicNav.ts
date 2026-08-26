import type { PublicPlatformSettings } from "../contexts/PlatformSettingsContext";

export interface PublicNavLink {
  to: string;
  label: string;
  flag?: "show_map" | "show_services" | "show_volunteering";
}

export const BASE_PUBLIC_NAV: PublicNavLink[] = [
  { to: "/", label: "الرئيسية" },
  { to: "/projects", label: "المشاريع" },
  { to: "/services", label: "الخدمات", flag: "show_services" },
  { to: "/volunteers", label: "المتطوعون", flag: "show_volunteering" },
  { to: "/map", label: "الخرائط", flag: "show_map" },
  { to: "/about", label: "من نحن" },
];

/** O(L) — يخفي روابط الأدوات العامة وفق أعلام الإعدادات. */
export function visiblePublicNav(settings: Pick<PublicPlatformSettings, "show_map" | "show_services" | "show_volunteering">, links = BASE_PUBLIC_NAV): PublicNavLink[] {
  return links.filter((l) => !l.flag || settings[l.flag]);
}

export function displayPlatformName(name?: string): string {
  return name?.trim() || "تكافل وأثر";
}

export function displayLogoUrl(url?: string): string {
  return url?.trim() || "/logo.png";
}
