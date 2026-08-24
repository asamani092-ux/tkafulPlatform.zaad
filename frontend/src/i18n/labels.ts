/** تسميات عربية موحّدة للحالات والأدوار — O(1) لكل بحث. */

export const PROJECT_STATUS_AR: Record<string, string> = {
  draft: "مسودّة",
  active: "نشط",
  completed: "مكتمل",
  archived: "مؤرشف",
};

export const PROJECT_MEMBER_ROLE_AR: Record<string, string> = {
  super_admin: "مشرف عام",
  project_admin: "مدير مشروع",
  project_editor: "محرر",
  project_viewer: "مشاهد",
};

export const MAP_ITEM_STATUS_AR: Record<string, string> = {
  active: "نشط",
  hidden: "مخفي",
  archived: "مؤرشف",
  pending: "قيد المراجعة",
  approved: "معتمد",
  fulfilled: "منفَّذ",
  cancelled: "ملغى",
  rejected: "مرفوض",
};

export const PROFILE_ROLE_AR: Record<string, string> = {
  admin: "مشرف عام",
  manager: "مدير",
  user: "متطوّع / مستخدم",
  employee: "موظف",
  beneficiary: "مستفيد",
  supplier: "مورّد",
  representative: "مندوب",
  donor: "متبرّع",
};

export const MAP_VALUE_AR: Record<string, string> = {
  high: "أولوية عالية",
  medium: "أولوية متوسطة",
  low: "أولوية منخفضة",
  sale_point: "نقطة بيع",
  permanent_corner: "ركن دائم",
  participation_point: "نقطة مشاركة",
  region: "منطقة",
  outlet: "منفذ",
  ...MAP_ITEM_STATUS_AR,
  ...PROJECT_STATUS_AR,
};

export function labelAr(map: Record<string, string>, value: string | null | undefined, fallback?: string): string {
  if (!value) return fallback || "—";
  return map[value] || fallback || value;
}
