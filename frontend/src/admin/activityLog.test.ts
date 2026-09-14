import { activityQuery } from "./activityLog";

describe("activityQuery", () => {
  it("includes only set filters", () => {
    expect(activityQuery({ actor: "", action: "", date_from: "", date_to: "" }, 1)).toBe("page=1");
    expect(activityQuery({ actor: "4", action: "user_create", date_from: "2026-01-01", date_to: "" }, 2)).toBe(
      "page=2&actor=4&action=user_create&date_from=2026-01-01",
    );
  });
});
