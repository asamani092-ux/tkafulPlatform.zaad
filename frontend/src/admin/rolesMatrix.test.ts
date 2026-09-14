import { roleHasCapability, type CapabilityRow, type RoleRow } from "./rolesMatrix";

const admin: RoleRow = {
  id: "admin",
  label: "مشرف عام",
  description: "",
  capabilities: ["manage_users", "delete_project"],
};
const donor: RoleRow = {
  id: "donor",
  label: "متبرّع",
  description: "",
  capabilities: ["create_sponsorship"],
};

describe("roles matrix helper", () => {
  const caps: CapabilityRow[] = [
    { id: "delete_project", label: "حذف مشروع" },
    { id: "create_sponsorship", label: "إنشاء كفالة" },
  ];

  it("marks documented capabilities only", () => {
    expect(roleHasCapability(admin, "delete_project")).toBe(true);
    expect(roleHasCapability(donor, "delete_project")).toBe(false);
    expect(roleHasCapability(donor, "create_sponsorship")).toBe(true);
    expect(caps).toHaveLength(2);
  });
});
