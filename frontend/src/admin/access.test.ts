import { describe, expect, it } from "vitest";
import { buildAdminAccess, canAccessAdminPath, defaultAdminHome } from "./access";

describe("admin access", () => {
  const pm = buildAdminAccess("user", false, [
    { project: 1, project_slug: "tafaqqadhum", project_name: "تفقدهم", role: "project_admin", project_tools: ["map", "reports"] },
  ]);

  it("allows project PM only scoped admin paths", () => {
    expect(canAccessAdminPath("/Admin/projects", pm)).toBe(true);
    expect(canAccessAdminPath("/Admin/maps", pm)).toBe(true);
    expect(canAccessAdminPath("/Admin/sponsorships", pm)).toBe(false);
    expect(canAccessAdminPath("/Admin", pm)).toBe(false);
    expect(canAccessAdminPath("/Admin/volunteers", pm)).toBe(false);
    expect(canAccessAdminPath("/Admin/requests/forms", pm)).toBe(false);
    expect(canAccessAdminPath("/Admin/staff", pm)).toBe(false);
  });

  it("defaults PM home to projects not overview", () => {
    expect(defaultAdminHome(pm)).toBe("/Admin/projects");
  });

  it("allows global admin everywhere", () => {
    const admin = buildAdminAccess("admin", true, []);
    expect(canAccessAdminPath("/Admin/volunteers", admin)).toBe(true);
    expect(canAccessAdminPath("/Admin/reports", admin)).toBe(true);
    expect(canAccessAdminPath("/Admin/settings", admin)).toBe(true);
    expect(defaultAdminHome(admin)).toBe("/Admin");
  });

  it("blocks PM from settings and reports (super-admin only domains)", () => {
    expect(canAccessAdminPath("/Admin/settings", pm)).toBe(false);
    expect(canAccessAdminPath("/Admin/reports", pm)).toBe(false);
    expect(canAccessAdminPath("/Admin/users", pm)).toBe(false);
  });

  it("PM cannot reach staff domain (لا شاشة كادر لعضو المشروع)", () => {
    expect(canAccessAdminPath("/Admin/staff", pm)).toBe(false);
    expect(canAccessAdminPath("/Admin/staff/manage", pm)).toBe(false);
  });

  it("admin reaches staff domain (لا شاشة ميتة — RC-C)", () => {
    const admin = buildAdminAccess("admin", true, []);
    expect(canAccessAdminPath("/Admin/staff", admin)).toBe(true);
    expect(canAccessAdminPath("/Admin/staff/manage", admin)).toBe(true);
    expect(canAccessAdminPath("/Admin/executive", admin)).toBe(true);
  });

  it("orgStaff (manager/employee) reaches staff domain but not admin-only domains", () => {
    const manager = buildAdminAccess("manager", false, []);
    expect(canAccessAdminPath("/Admin/staff", manager)).toBe(true);
    expect(canAccessAdminPath("/Admin/staff/manage", manager)).toBe(true);
    expect(canAccessAdminPath("/Admin/users", manager)).toBe(false);
    expect(canAccessAdminPath("/Admin/settings", manager)).toBe(false);
    const employee = buildAdminAccess("employee", false, []);
    expect(canAccessAdminPath("/Admin/staff", employee)).toBe(true);
  });
});
