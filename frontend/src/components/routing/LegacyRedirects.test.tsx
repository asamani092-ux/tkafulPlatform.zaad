import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

/** التوافق الخلفي للمسارات القديمة: /saqya و /Admin/map يحوّلان للمسارات الجديدة. */
function LegacyRoutes() {
  return (
    <Routes>
      <Route path="/saqya" element={<Navigate to="/projects/saqya/sponsorships" replace />} />
      <Route path="/Admin/map" element={<Navigate to="/Admin/maps" replace />} />
      <Route path="/projects/:slug/sponsorships" element={<div>saqya-portal</div>} />
      <Route path="/Admin/maps" element={<div>maps-admin</div>} />
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
});
