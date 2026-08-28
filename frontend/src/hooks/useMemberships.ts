import { useMembershipsContext } from "../contexts/MembershipsContext";

export type { Membership } from "../contexts/MembershipsContext";

/** عضويات المستخدم — مصدر واحد عبر MembershipsProvider. */
export function useMemberships() {
  const { loading, isSuperAdmin, memberships } = useMembershipsContext();
  return { loading, isSuperAdmin, memberships };
}
