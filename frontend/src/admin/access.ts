import type { Membership } from "../hooks/useMemberships";
import { visibleAdminDomains } from "./visibility";
import { ADMIN_DOMAINS, type AdminDomain } from "./domains";

export interface AdminAccessContext {
  isGlobalAdmin: boolean;
  userRole: string;
  projectTools: Set<string>;
  hasMemberships: boolean;
}

/** O(M) — M عدد العضويات. */
export function buildAdminAccess(
  userRole: string | undefined,
  isSuperAdmin: boolean,
  memberships: Membership[],
): AdminAccessContext {
  return {
    isGlobalAdmin: userRole === "admin" || isSuperAdmin,
    userRole: userRole || "",
    projectTools: new Set(memberships.flatMap((m) => m.project_tools || [])),
    hasMemberships: memberships.length > 0,
  };
}

/** أدوار يمكنها دخول لوحة الإدارة عبر عضوية مشروع أو نطاق الكادر. */
export const ORG_STAFF_ROLES = ["admin", "manager", "employee"] as const;

/** O(1) — يحدد إن كان دور كادر/موظف إداري. */
export function isOrgStaff(userRole: string): boolean {
  return (ORG_STAFF_ROLES as readonly string[]).includes(userRole);
}

/**
 * O(1) — بوابة موحّدة لكل مسارات الإدارة (RC-C).
 * الهرمية: admin ⊇ manager(كادر) ⊇ employee/عضو مشروع (مشاريع فقط).
 */
export function canAccessAdminPath(pathname: string, ctx: AdminAccessContext): boolean {
  if (ctx.isGlobalAdmin) return true;
  const p = pathname.toLowerCase();

  // نطاق الكادر: المدير فقط حالياً (الموظف لا يرى تبويب الكادر)
  if (p.startsWith("/admin/staff") || p.startsWith("/admin/executive")) {
    return ctx.userRole === "manager";
  }

  if (p === "/admin" || p === "/admin/") return false;
  if (p.startsWith("/admin/projects/create")) return false;
  if (p.startsWith("/admin/users")) return false;
  if (p.startsWith("/admin/volunteers")) return false;
  if (p.startsWith("/admin/requests")) return false;
  if (p.startsWith("/admin/reports")) return false;
  if (p.startsWith("/admin/settings")) return false;
  if (p.startsWith("/admin/sponsorships")) {
    return ctx.hasMemberships && ctx.projectTools.has("sponsorships");
  }
  if (p.startsWith("/admin/maps") || p === "/admin/map") {
    return ctx.hasMemberships && ctx.projectTools.has("map");
  }
  if (p.startsWith("/admin/projects")) return ctx.hasMemberships;
  return false;
}

export function visibleDomainsForUser(
  ctx: AdminAccessContext,
): AdminDomain[] {
  return visibleAdminDomains(ADMIN_DOMAINS, ctx);
}

export function defaultAdminHome(ctx: AdminAccessContext): string {
  if (ctx.isGlobalAdmin) return "/Admin";
  if (ctx.hasMemberships) return "/Admin/projects";
  if (ctx.userRole === "manager") return "/Admin/staff";
  return "/user/main";
}
