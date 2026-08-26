import { actionLabels, statusLabel } from "./projectLifecycle";

describe("project lifecycle labels", () => {
  it("maps statuses to Arabic", () => {
    expect(statusLabel("active")).toBe("نشط");
    expect(statusLabel("archived")).toBe("مؤرشف");
    expect(statusLabel("unknown")).toBe("unknown");
  });

  it("maps next-action verbs to Arabic labels", () => {
    expect(actionLabels(["activate", "archive"])).toEqual(["تفعيل", "أرشفة"]);
    expect(actionLabels([])).toEqual([]);
  });
});
