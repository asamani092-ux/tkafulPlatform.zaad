import { describe, expect, it } from "vitest";
import { ADMIN_DOMAINS } from "./domains";
import { visibleAdminDomains } from "./visibility";

describe("visibleAdminDomains", () => {
  it("shows all domains for global admin", () => {
    const visible = visibleAdminDomains(ADMIN_DOMAINS, {
      isGlobalAdmin: true,
      userRole: "admin",
      projectTools: new Set(),
      hasMemberships: false,
    });
    expect(visible.map((d) => d.id)).toEqual(ADMIN_DOMAINS.map((d) => d.id));
  });

  it("hides super-admin domains and staff for project-only PM", () => {
    const visible = visibleAdminDomains(ADMIN_DOMAINS, {
      isGlobalAdmin: false,
      userRole: "user",
      projectTools: new Set(["map"]),
      hasMemberships: true,
    });
    expect(visible.map((d) => d.id)).toEqual(["projects", "maps"]);
  });

  it("shows staff domain for orgStaff manager without project memberships", () => {
    const visible = visibleAdminDomains(ADMIN_DOMAINS, {
      isGlobalAdmin: false,
      userRole: "manager",
      projectTools: new Set(),
      hasMemberships: false,
    });
    expect(visible.map((d) => d.id)).toEqual(["staff"]);
  });

  it("shows staff + project-scoped domains for orgStaff with memberships", () => {
    const visible = visibleAdminDomains(ADMIN_DOMAINS, {
      isGlobalAdmin: false,
      userRole: "employee",
      projectTools: new Set(["map"]),
      hasMemberships: true,
    });
    expect(visible.map((d) => d.id)).toEqual(["projects", "maps", "staff"]);
  });
});
