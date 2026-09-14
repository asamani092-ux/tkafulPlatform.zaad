import { applyUserFilters, extractErrorDetail, type AdminUserRow } from "./userManagement";

const rows: AdminUserRow[] = [
  { id: 1, email: "a@x.com", name: "أحمد", role: "admin", is_active: true, date_joined: "", last_login: null },
  { id: 2, email: "v@x.com", name: "متطوّع", role: "user", is_active: false, date_joined: "", last_login: null },
];

describe("userManagement filters", () => {
  it("filters by search on email/name", () => {
    expect(applyUserFilters(rows, "أحمد", "", "").map((r) => r.id)).toEqual([1]);
    expect(applyUserFilters(rows, "v@x", "", "").map((r) => r.id)).toEqual([2]);
  });

  it("filters by role and status", () => {
    expect(applyUserFilters(rows, "", "user", "").map((r) => r.id)).toEqual([2]);
    expect(applyUserFilters(rows, "", "", "disabled").map((r) => r.id)).toEqual([2]);
    expect(applyUserFilters(rows, "", "", "active").map((r) => r.id)).toEqual([1]);
  });
});

describe("extractErrorDetail", () => {
  it("reads Arabic last-admin and self-delete messages", () => {
    expect(extractErrorDetail({ detail: "لا يمكنك حذف حسابك" })).toBe("لا يمكنك حذف حسابك");
    expect(extractErrorDetail({ detail: "لا يمكن حذف آخر مشرف في المنصّة" })).toBe(
      "لا يمكن حذف آخر مشرف في المنصّة",
    );
  });

  it("reads field errors", () => {
    expect(extractErrorDetail({ email: ["البريد الإلكتروني مسجّل مسبقاً"] })).toBe(
      "البريد الإلكتروني مسجّل مسبقاً",
    );
  });
});
