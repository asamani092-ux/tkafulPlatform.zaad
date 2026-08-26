import { EVENT_AR, EVENT_OPTIONS, notificationTypeLabel } from "./notifications";

describe("notification labels", () => {
  it("covers every event category", () => {
    expect(EVENT_OPTIONS.map((o) => o.value).sort()).toEqual(Object.keys(EVENT_AR).sort());
    expect(EVENT_AR.broadcast).toBe("الرسائل العامة");
  });

  it("maps notification types to Arabic", () => {
    expect(notificationTypeLabel("action")).toBe("إجراء");
    expect(notificationTypeLabel("unknown")).toBe("unknown");
  });
});
