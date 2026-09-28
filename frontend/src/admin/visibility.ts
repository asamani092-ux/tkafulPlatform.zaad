import type { AdminDomain } from "./domains";

/** من يرى نطاق «الكادر» بدون أن يكون مشرفاً عاماً. */
const STAFF_DOMAIN_ROLES = new Set(["manager"]);

/** O(D) — D عدد نطاقات الإدارة. */
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
  const canSeeStaffDomain = STAFF_DOMAIN_ROLES.has(userRole);

  return domains.filter((d) => {
    if (isGlobalAdmin) return true;
    if (d.superAdminOnly) return false;
    // نطاق الكادر: المدير فقط حالياً (الموظف يرى مشاريعه فقط)
    if (d.id === "staff") return canSeeStaffDomain;
    if (!hasMemberships) return false;
    if (d.id === "projects") return true;
    if (d.id === "maps") return projectTools.has("map");
    return false;
  });
}
