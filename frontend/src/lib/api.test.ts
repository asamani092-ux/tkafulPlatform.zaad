import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch } from "./api";
import * as authEvents from "./authEvents";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("authFetch — قاعدة الحالة (RC-B)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(ACCESS_KEY, "access-1");
    localStorage.setItem(REFRESH_KEY, "refresh-1");
    localStorage.setItem("takaful_user", JSON.stringify({ name: "n", email: "e", role: "admin" }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("403 لا يمسح الجلسة ولا يُنهيها", async () => {
    const notify = vi.spyOn(authEvents, "notifySessionExpired");
    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse(403, { detail: "غير مصرّح" }));

    const res = await authFetch("/api/platform/projects/");

    expect(res.status).toBe(403);
    expect(notify).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACCESS_KEY)).toBe("access-1");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("refresh-1");
    expect(localStorage.getItem("takaful_user")).not.toBeNull();
  });

  it("401 مع نجاح التجديد يعيد الطلب بصمت ويحفظ الجلسة", async () => {
    const notify = vi.spyOn(authEvents, "notifySessionExpired");
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(401)) // الطلب الأصلي
      .mockResolvedValueOnce(jsonResponse(200, { access: "access-2" })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { ok: true })); // إعادة الطلب

    const res = await authFetch("/api/platform/projects/");

    expect(res.status).toBe(200);
    expect(notify).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACCESS_KEY)).toBe("access-2");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("401 مع فشل التجديد يمسح الجلسة ويُبلّغ الراوتر (لا إعادة تحميل)", async () => {
    const notify = vi.spyOn(authEvents, "notifySessionExpired").mockImplementation(() => {});
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse(401)) // الطلب الأصلي
      .mockResolvedValueOnce(jsonResponse(401)); // فشل refresh

    const res = await authFetch("/api/platform/projects/");

    expect(res.status).toBe(401);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(localStorage.getItem("takaful_user")).toBeNull();
  });

  it("401 بلا refresh token يُنهي الجلسة مباشرة", async () => {
    localStorage.removeItem(REFRESH_KEY);
    const notify = vi.spyOn(authEvents, "notifySessionExpired").mockImplementation(() => {});
    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse(401));

    const res = await authFetch("/api/platform/projects/");

    expect(res.status).toBe(401);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
  });
});
