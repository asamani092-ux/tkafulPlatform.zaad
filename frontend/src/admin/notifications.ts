/**
 * تسميات فئات الإشعار وأيقونات النوع — دوال نقية.
 * التعقيد: خريطة ثابتة O(1) لكل بحث.
 */

export const EVENT_AR: Record<string, string> = {
  service_request: "طلبات الخدمات",
  water_supply: "طلبات سقيا الماء",
  sponsorship: "الكفالات",
  volunteer_application: "طلبات التطوع",
  volunteer_opportunity: "فرص التطوع",
  volunteer_decision: "قرارات طلبات التطوع",
  suggestion_received: "الاقتراحات",
  project_status: "حالة المشاريع",
};

export const EVENT_OPTIONS = Object.entries(EVENT_AR).map(([value, label]) => ({ value, label }));

export type NotificationKind = "info" | "success" | "warning" | "action";

export function notificationTypeLabel(kind: string): string {
  const map: Record<string, string> = {
    info: "معلومة",
    success: "نجاح",
    warning: "تنبيه",
    action: "إجراء",
  };
  return map[kind] ?? kind;
}
