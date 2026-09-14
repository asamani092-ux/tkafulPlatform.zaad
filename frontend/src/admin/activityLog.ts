/** فلاتر سجل النشاط — بناء الاستعلام O(1). */

export const ACTION_AR: Record<string, string> = {
  user_create: "إنشاء مستخدم",
  user_update: "تعديل مستخدم",
  user_delete: "حذف مستخدم",
  user_set_role: "تغيير الدور",
  user_set_active: "تفعيل/تعطيل",
  project_create: "إنشاء مشروع",
  project_delete: "حذف مشروع",
  sponsorship_approve: "اعتماد كفالة",
  order_assign: "إسناد طلب",
  settings_change: "تعديل الإعدادات",
  broadcast: "بث إشعار",
  static_page_publish: "نشر صفحة ثابتة",
};

export const ACTION_OPTIONS = Object.entries(ACTION_AR).map(([value, label]) => ({ value, label }));

export interface ActivityFilters {
  actor: string;
  action: string;
  date_from: string;
  date_to: string;
}

export function activityQuery(filters: ActivityFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.actor.trim()) params.set("actor", filters.actor.trim());
  if (filters.action) params.set("action", filters.action);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  return params.toString();
}
