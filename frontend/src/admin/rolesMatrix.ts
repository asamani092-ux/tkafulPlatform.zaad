/** مساعد مصفوفة الأدوار — O(C) لكل صف. */

export interface RoleRow {
  id: string;
  label: string;
  description: string;
  capabilities: string[];
}

export interface CapabilityRow {
  id: string;
  label: string;
}

export function roleHasCapability(role: RoleRow, capId: string): boolean {
  return role.capabilities.includes(capId);
}
