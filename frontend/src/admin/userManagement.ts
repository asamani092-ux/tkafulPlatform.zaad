/**
 * مساعدات إدارة المستخدمين — دوال نقية قابلة للاختبار.
 * التعقيد: applyUserFilters O(N)، extractErrorDetail O(1).
 */

export interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export function applyUserFilters(
  rows: AdminUserRow[],
  search: string,
  role: string,
  status: "" | "active" | "disabled",
): AdminUserRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !r.email.toLowerCase().includes(q) && !(r.name || "").toLowerCase().includes(q)) {
      return false;
    }
    if (role && r.role !== role) return false;
    if (status === "active" && !r.is_active) return false;
    if (status === "disabled" && r.is_active) return false;
    return true;
  });
}

export function extractErrorDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "تعذّر تنفيذ العملية";
  const rec = body as Record<string, unknown>;
  if (typeof rec.detail === "string") return rec.detail;
  const first = Object.values(rec).find((v) => Array.isArray(v) && typeof v[0] === "string");
  if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  return "تعذّر تنفيذ العملية";
}
