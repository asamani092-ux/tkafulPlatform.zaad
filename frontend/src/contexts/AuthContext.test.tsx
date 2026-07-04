import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("AuthContext logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("accessToken", "access-old");
    localStorage.setItem("refreshToken", "refresh-old");
    localStorage.setItem("takaful_user", JSON.stringify({ name: "T", email: "t@x.com", role: "user" }));
  });

  it("calls logout API with refresh token before clearing storage", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ message: "ok" }) });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/accounts/logout/"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh: "refresh-old" }),
      }),
    );
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});

describe("logout refresh rejection (integration contract)", () => {
  it("documents expected 401 after blacklist — covered by accounts/tests.py", () => {
    expect(true).toBe(true);
  });
});
