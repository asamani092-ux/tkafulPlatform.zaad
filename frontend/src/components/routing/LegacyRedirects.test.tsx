import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

/** التوافق الخلفي للمسارات القديمة — نفس خريطة التحويلات في App.tsx. */
function LegacyRoutes() {
  return (
    <Routes>
      <Route path="/saqya" element={<Navigate to="/projects/saqya/sponsorships" replace />} />
      <Route path="/Admin/map" element={<Navigate to="/Admin/maps" replace />} />
      <Route path="/admin/signin" element={<Navigate to="/signin" replace />} />
      <Route path="/executive" element={<Navigate to="/Admin/executive" replace />} />
      <Route path="/projects/:slug/sponsorships" element={<div>saqya-portal</div>} />
      <Route path="/Admin/maps" element={<div>maps-admin</div>} />
      <Route path="/signin" element={<div>unified-signin</div>} />
      <Route path="/Admin/executive" element={<div>executive-admin</div>} />
      <Route path="*" element={<div>not-found</div>} />
    </Routes>
  );
}

describe("legacy route redirects", () => {
  it("redirects /saqya to the project sponsorships portal", () => {
    render(
      <MemoryRouter initialEntries={["/saqya"]}>
        <LegacyRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText("saqya-portal")).toBeInTheDocument();
  });

  it("redirects /Admin/map to the new maps admin", () => {
    render(
      <MemoryRouter initialEntries={["/Admin/map"]}>
        <LegacyRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText("maps-admin")).toBeInTheDocument();
  });

  it("redirects /admin/signin to the unified sign-in", () => {
    render(
      <MemoryRouter initialEntries={["/admin/signin"]}>
        <LegacyRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText("unified-signin")).toBeInTheDocument();
  });

  it("redirects /executive to the merged admin dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/executive"]}>
        <LegacyRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText("executive-admin")).toBeInTheDocument();
  });
});
