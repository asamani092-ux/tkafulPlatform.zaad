import type { AdminDomain } from "./domains";

const ORG_STAFF_ROLES = new Set(["admin", "manager", "employee"]);

/** O(D) — D عدد نطاقات الإدارة السبعة. */
export function visibleAdminDomains(
  domains: AdminDomain[],
  ctx: {
    isGlobalAdmin: boolean;
    userRole: string;
    projectTools: Set<string>;
    hasMemberships: boolean;
  },
): AdminDomain[] {
  const { isGlobalAdmin, userRole, projectTools, hasMemberships } = ctx;
  const isOrgStaff = ORG_STAFF_ROLES.has(userRole);

  return domains.filter((d) => {
    if (isGlobalAdmin) return !d.superAdminOnly || isGlobalAdmin;
    if (d.superAdminOnly) return false;
    if (isOrgStaff) return true;
    if (!hasMemberships) return false;
    if (d.id === "projects") return true;
    if (d.id === "maps") return projectTools.has("map");
    return false;
  });
}
