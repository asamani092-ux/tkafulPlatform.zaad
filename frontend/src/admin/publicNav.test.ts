import { visiblePublicNav, displayPlatformName, displayLogoUrl } from "./publicNav";

describe("publicNav", () => {
  const flags = { show_map: false, show_services: true, show_volunteering: false };

  it("hides flagged tools when disabled", () => {
    const links = visiblePublicNav(flags);
    const hrefs = links.map((l) => l.to);
    expect(hrefs).toContain("/services");
    expect(hrefs).toContain("/suggest");
    expect(hrefs).not.toContain("/map");
    expect(hrefs).not.toContain("/volunteers");
  });

  it("labels the map link as خارطة الأثر", () => {
    const map = visiblePublicNav({ show_map: true, show_services: true, show_volunteering: true })
      .find((l) => l.to === "/map");
    expect(map?.label).toBe("خارطة الأثر");
  });

  it("falls back when name/logo empty", () => {
    expect(displayPlatformName("")).toBe("تكافل وأثر");
    expect(displayLogoUrl("")).toBe("/logo.png");
  });
});
