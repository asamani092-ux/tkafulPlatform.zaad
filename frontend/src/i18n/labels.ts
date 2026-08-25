/** تسميات الأدوار العربية — مصدر حقيقة للواجهة. */
export const ROLE_AR: Record<string, string> = {
  admin: "مشرف عام",
  manager: "مدير",
  employee: "موظف",
  user: "متطوّع",
  beneficiary: "مستفيد",
  donor: "متبرّع",
  supplier: "مورّد",
  representative: "مندوب",
};

export const ROLE_OPTIONS = Object.entries(ROLE_AR).map(([value, label]) => ({ value, label }));

export function labelAr(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}
