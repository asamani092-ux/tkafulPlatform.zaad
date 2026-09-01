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
  project_admin: "مدير مشروع",
  project_editor: "محرر",
  project_viewer: "مشاهد",
  super_admin: "مشرف عام",
};

export const ROLE_OPTIONS = Object.entries(ROLE_AR)
  .filter(([v]) => !["project_admin", "project_editor", "project_viewer", "super_admin"].includes(v))
  .map(([value, label]) => ({ value, label }));

/** تسميات أنواع أهداف سجل النشاط. */
export const TARGET_TYPE_AR: Record<string, string> = {
  Project: "مشروع",
  project: "مشروع",
  User: "مستخدم",
  user: "مستخدم",
  Sponsorship: "كفالة",
  sponsorship: "كفالة",
  Order: "طلب كفالة",
  order: "طلب كفالة",
  StaticPage: "صفحة ثابتة",
  staticpage: "صفحة ثابتة",
  RequestForm: "نموذج طلب",
  requestform: "نموذج طلب",
  Map: "خريطة",
  map: "خريطة",
  ProjectType: "نوع مشروع",
  projecttype: "نوع مشروع",
};

/** حالات طلبات الخدمة. */
export const SERVICE_STATUS_AR: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "مقبول",
  REJECTED: "مرفوض",
  DONE: "منجز",
};

/** حالات طلبات السقيا الشائعة. */
export const WATER_STATUS_AR: Record<string, string> = {
  PENDING: "قيد المراجعة",
  pending: "قيد المراجعة",
  APPROVED: "مقبول",
  approved: "مقبول",
  REJECTED: "مرفوض",
  rejected: "مرفوض",
  DONE: "منجز",
  done: "منجز",
  NEW: "جديد",
  new: "جديد",
  IN_PROGRESS: "قيد التنفيذ",
  in_progress: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  completed: "مكتمل",
};

/** حالات طلبات/أوامر الكفالات. */
export const ORDER_STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  assigned: "مُسند",
  preparing: "قيد التجهيز",
  ready: "جاهز",
  delivered: "مُسلَّم",
  completed: "مكتمل",
  cancelled: "ملغى",
  rejected: "مرفوض",
};

export const SPONSORSHIP_STATUS_AR: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  in_progress: "قيد التنفيذ",
  completed: "مكتملة",
};

/**
 * يعيد التسمية العربية من الخريطة، أو قيمة افتراضية آمنة.
 * لا يُرجع المفتاح الإنجليزي الخام أبداً.
 */
export function labelAr(
  map: Record<string, string>,
  key: string | null | undefined,
  fallback = "غير معروف",
): string {
  if (!key) return "—";
  return map[key] ?? fallback;
}

/** هدف سجل النشاط بصيغة عربية بلا أكواد خام. */
export function formatActivityTarget(type: string | null | undefined, id: string | number | null | undefined): string {
  if (!type) return "—";
  const label = labelAr(TARGET_TYPE_AR, type);
  if (id === null || id === undefined || id === "") return label;
  return `${label} رقم ${id}`;
}
