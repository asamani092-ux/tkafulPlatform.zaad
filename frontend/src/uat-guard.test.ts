import { describe, expect, it } from "vitest";

/**
 * Unit-level guard: when VITE_ENABLE_UAT is unset (default vitest / production build),
 * it must not equal the enable string used in App.tsx for dead-code elimination.
 */
describe("UAT env guard", () => {
  it("VITE_ENABLE_UAT is not the enable string when unset", () => {
    const flag = import.meta.env.VITE_ENABLE_UAT;
    expect(flag === "true").toBe(false);
  });
});
