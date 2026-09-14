import { afterEach, describe, expect, it } from "vitest";
import {
  UAT_STORAGE_KEY,
  clearUatPersisted,
  loadUatPersisted,
  saveUatPersisted,
} from "./storage";

afterEach(() => {
  clearUatPersisted();
});

describe("UAT localStorage persistence", () => {
  it("round-trips state and phase", () => {
    saveUatPersisted({
      version: 1,
      phase: 2,
      state: {
        tester: "أحمد",
        verdict: "قبول بملاحظات",
        statuses: { "1.1": "pass", "2.3": "fail" },
        notes: { "1.1": "ملاحظة محفوظة" },
      },
    });
    const loaded = loadUatPersisted();
    expect(loaded?.phase).toBe(2);
    expect(loaded?.state.tester).toBe("أحمد");
    expect(loaded?.state.notes["1.1"]).toBe("ملاحظة محفوظة");
    expect(loaded?.state.statuses["2.3"]).toBe("fail");
  });

  it("returns null for missing or corrupt data", () => {
    expect(loadUatPersisted()).toBeNull();
    localStorage.setItem(UAT_STORAGE_KEY, "{bad json");
    expect(loadUatPersisted()).toBeNull();
  });

  it("clears persisted data", () => {
    saveUatPersisted({ version: 1, phase: 1, state: { tester: "", verdict: "", statuses: {}, notes: {} } });
    clearUatPersisted();
    expect(loadUatPersisted()).toBeNull();
  });
});
