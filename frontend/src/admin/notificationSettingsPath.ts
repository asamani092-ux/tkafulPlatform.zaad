/**
 * مسار تفضيلات الإشعارات حسب السياق.
 * التعقيد: O(1) زمن ومكان.
 */
export function notificationSettingsPath(
  userRole: string | undefined,
  pathname: string,
): string {
  const p = pathname.toLowerCase();
  if (p.startsWith("/admin")) return "/Admin/account/settings";
  if (userRole === "admin" || userRole === "manager" || userRole === "employee") {
    return "/Admin/account/settings";
  }
  return "/user/settings";
}
