import type { AdminDomain } from "./domains";

const ORG_STAFF_ROLES = new Set(["admin", "manager", "employee"]);

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
  const isOrgStaff = ORG_STAFF_ROLES.has(userRole);

  return domains.filter((d) => {
    if (isGlobalAdmin) return true;
    if (d.superAdminOnly) return false;
    // الكادر التشغيلي يرى نطاق الكادر (+ المشاريع/الخرائط إن وُجدت عضوية لاحقاً عبر الفلاتر أدناه)
    if (d.id === "staff") return isOrgStaff;
    if (isOrgStaff && !hasMemberships) return false;
    if (!hasMemberships) return false;
    if (d.id === "projects") return true;
    if (d.id === "maps") return projectTools.has("map");
    return false;
  });
}
