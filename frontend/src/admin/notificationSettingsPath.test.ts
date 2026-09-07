import { notificationSettingsPath } from "./notificationSettingsPath";

describe("notificationSettingsPath", () => {
  it("keeps admin-shell users on Admin account settings", () => {
    expect(notificationSettingsPath("user", "/Admin/projects")).toBe("/Admin/account/settings");
    expect(notificationSettingsPath("admin", "/Admin")).toBe("/Admin/account/settings");
    expect(notificationSettingsPath("admin", "/admin/maps")).toBe("/Admin/account/settings");
  });

  it("routes platform staff from public pages to Admin prefs", () => {
    expect(notificationSettingsPath("admin", "/")).toBe("/Admin/account/settings");
    expect(notificationSettingsPath("manager", "/projects/saqya")).toBe("/Admin/account/settings");
    expect(notificationSettingsPath("employee", "/about")).toBe("/Admin/account/settings");
  });

  it("keeps volunteers and donors on user settings", () => {
    expect(notificationSettingsPath("user", "/user/main")).toBe("/user/settings");
    expect(notificationSettingsPath("donor", "/")).toBe("/user/settings");
    expect(notificationSettingsPath(undefined, "/")).toBe("/user/settings");
  });
});
