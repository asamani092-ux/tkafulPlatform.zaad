import { describe, expect, it } from "vitest";
import { shouldFlipPageLoading } from "./loadMode";

describe("shouldFlipPageLoading", () => {
  it("flips only for initial load", () => {
    expect(shouldFlipPageLoading("initial")).toBe(true);
    expect(shouldFlipPageLoading("silent")).toBe(false);
  });
});
