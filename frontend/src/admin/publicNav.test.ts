import { visiblePublicNav, displayPlatformName, displayLogoUrl } from "./publicNav";

describe("publicNav", () => {
  const flags = { show_map: false, show_services: true, show_volunteering: false };

  it("hides flagged tools when disabled", () => {
    const hrefs = visiblePublicNav(flags).map((l) => l.to);
    expect(hrefs).toContain("/services");
    expect(hrefs).not.toContain("/map");
    expect(hrefs).not.toContain("/volunteers");
  });

  it("falls back when name/logo empty", () => {
    expect(displayPlatformName("")).toBe("تكافل وأثر");
    expect(displayLogoUrl("")).toBe("/logo.png");
  });
});
