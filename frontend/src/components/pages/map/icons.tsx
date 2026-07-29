import type { LucideIcon } from "lucide-react";
import {
  MapPin, Store, PackageCheck, Package, Droplet, HeartHandshake, Camera,
  Users, TrendingUp, CircleCheck, Home, School, TreePine, Building2,
  HandHeart, Boxes, Truck, Gift, Utensils, Landmark,
} from "lucide-react";

/**
 * مكتبة أيقونات الخارطة — منسّقة من الهوية الجديدة (lucide/design-system).
 * تُستخدم في: الواجهة العامة (تبويبات المشاريع/الطبقات) وواجهة الإدارة (اختيار الأيقونة).
 */
export const MAP_ICONS: Record<string, LucideIcon> = {
  MapPin, Store, PackageCheck, Package, Droplet, HeartHandshake, Camera,
  Users, TrendingUp, CircleCheck, Home, School, TreePine, Building2,
  HandHeart, Boxes, Truck, Gift, Utensils, Landmark,
};

export const MAP_ICON_KEYS = Object.keys(MAP_ICONS);

export function getMapIcon(key?: string | null): LucideIcon {
  if (key && MAP_ICONS[key]) return MAP_ICONS[key];
  return MapPin;
}
