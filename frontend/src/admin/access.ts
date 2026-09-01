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

/** أدوار الكادر التشغيلي (orgStaff) — نطاق «الكادر» أوسع من عضوية المشروع. */
export const ORG_STAFF_ROLES = ["admin", "manager", "employee"] as const;

/** O(1) — يحدد إن كان دور الكادر التشغيلي (مدير/موظف/مشرف). */
export function isOrgStaff(userRole: string): boolean {
  return (ORG_STAFF_ROLES as readonly string[]).includes(userRole);
}

/**
 * O(1) — بوابة موحّدة لكل مسارات الإدارة (RC-C).
 * الهرمية: admin ⊇ orgStaff (الكادر) ⊇ staff (عضوية مشروع).
 * تُستخدم من ProtectedRoute لكل النطاقات دون تشعّب staff/orgStaff.
 */
export function canAccessAdminPath(pathname: string, ctx: AdminAccessContext): boolean {
  if (ctx.isGlobalAdmin) return true;
  const p = pathname.toLowerCase();

  // نطاق الكادر: للكادر التشغيلي (مدير/موظف)؛ المشرف مشمول عبر البوابة أعلاه.
  if (p.startsWith("/admin/staff") || p.startsWith("/admin/executive")) {
    return ctx.userRole === "manager" || ctx.userRole === "employee";
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
  if (ctx.userRole === "manager" || ctx.userRole === "employee") return "/Admin/staff";
  return "/user/main";
}
