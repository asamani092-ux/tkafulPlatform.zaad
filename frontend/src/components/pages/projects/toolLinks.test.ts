import { donationInContext, resolveToolLink, visibleTools } from "./toolLinks";

describe("project tool links", () => {
  const base = { slug: "p1", mapsCount: 0 };

  it("hides map when there are no maps, shows when present", () => {
    expect(resolveToolLink("map", base)).toBeNull();
    expect(resolveToolLink("map", { ...base, mapsCount: 2 })).toBe("/projects/p1/map");
  });

  it("routes services by request_form config", () => {
    expect(resolveToolLink("services", base)).toBe("/request-service");
    expect(
      resolveToolLink("services", { ...base, toolConfig: { services: { request_form: "water_supply" } } }),
    ).toBe("/services/water-supply?project=p1");
  });

  it("defaults saqya services to water supply", () => {
    expect(resolveToolLink("services", { slug: "saqya", mapsCount: 0 })).toBe(
      "/services/water-supply?project=saqya",
    );
  });

  it("returns null for reports (no dead public button)", () => {
    expect(resolveToolLink("reports", base)).toBeNull();
  });

  it("visibleTools drops tools without a destination", () => {
    expect(visibleTools(["map", "reports", "sponsorships"], base)).toEqual(["sponsorships"]);
  });

  it("donation shows only in sponsorships/services context with a url", () => {
    expect(donationInContext("https://x", ["sponsorships"])).toBe(true);
    expect(donationInContext("https://x", ["services"])).toBe(true);
    expect(donationInContext("https://x", ["map"])).toBe(false);
    expect(donationInContext("", ["sponsorships"])).toBe(false);
  });
});

  it("hides donation when show_donation_cta is false", () => {
    expect(donationInContext("https://x", ["sponsorships"], { sponsorships: { show_donation_cta: false } })).toBe(false);
    expect(donationInContext("https://x", ["sponsorships"], { sponsorships: { show_donation_cta: true } })).toBe(true);
  });
