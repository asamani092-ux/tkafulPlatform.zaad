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
    expect(defaultAdminHome(admin)).toBe("/Admin");
  });
});
