import { afterEach, describe, expect, it } from "vitest";
import {
  UAT_STORAGE_KEY,
  clearUatPersisted,
  loadUatPersisted,
  migrateIdRecord,
  saveUatPersisted,
} from "./storage";

afterEach(() => {
  clearUatPersisted();
});

describe("UAT localStorage persistence", () => {
  it("round-trips state and phase at version 2", () => {
    saveUatPersisted({
      version: 2,
      phase: 2,
      state: {
        tester: "أحمد",
        verdict: "قبول بملاحظات",
        statuses: { "1.1": "pass", "3.1": "fail" },
        notes: { "1.1": "ملاحظة محفوظة" },
      },
    });
    const loaded = loadUatPersisted();
    expect(loaded?.version).toBe(2);
    expect(loaded?.phase).toBe(2);
    expect(loaded?.state.tester).toBe("أحمد");
    expect(loaded?.state.notes["1.1"]).toBe("ملاحظة محفوظة");
    expect(loaded?.state.statuses["3.1"]).toBe("fail");
  });

  it("migrates version-1 scenario ids once without chain hops", () => {
    localStorage.setItem(
      UAT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: 2,
        state: {
          tester: "م",
          verdict: "",
          statuses: { "8.1": "pass", "3.1": "warn", "5.1": "fail" },
          notes: { "8.1": "متطوع", "3.1": "إدارة" },
        },
      }),
    );
    const loaded = loadUatPersisted();
    expect(loaded?.version).toBe(2);
    expect(loaded?.state.statuses["3.1"]).toBe("pass");
    expect(loaded?.state.statuses["4.1"]).toBe("warn");
    expect(loaded?.state.statuses["6.1"]).toBe("fail");
    expect(loaded?.state.statuses["8.1"]).toBeUndefined();
    expect(loaded?.state.notes["3.1"]).toBe("متطوع");
    expect(loaded?.state.notes["4.1"]).toBe("إدارة");
    // إعادة التحميل لا تعيد الهجرة
    const again = loadUatPersisted();
    expect(again?.state.statuses["3.1"]).toBe("pass");
    expect(again?.state.statuses["4.1"]).toBe("warn");
  });

  it("migrateIdRecord maps each key once", () => {
    expect(migrateIdRecord({ "8.1": "a", "3.1": "b", "1.1": "c" })).toEqual({
      "3.1": "a",
      "4.1": "b",
      "1.1": "c",
    });
  });

  it("returns null for missing or corrupt data", () => {
    expect(loadUatPersisted()).toBeNull();
    localStorage.setItem(UAT_STORAGE_KEY, "{bad json");
    expect(loadUatPersisted()).toBeNull();
  });

  it("clears persisted data", () => {
    saveUatPersisted({ version: 2, phase: 1, state: { tester: "", verdict: "", statuses: {}, notes: {} } });
    clearUatPersisted();
    expect(loadUatPersisted()).toBeNull();
  });
});
