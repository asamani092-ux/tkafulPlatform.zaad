import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import { ACTIVE_LEGACY_REDIRECTS } from "../../admin/domains";

const TARGETS: Record<string, string> = {
  "/Admin/maps": "maps-admin",
  "/Admin/projects": "projects-list",
  "/Admin/requests/forms": "request-forms",
  "/Admin/volunteers/applications": "vol-apps",
  "/Admin/volunteers": "volunteers",
  "/Admin/volunteers/join-requests": "join-requests",
  "/Admin/staff": "staff",
  "/Admin/staff/manage": "staff-manage",
  "/signin": "unified-signin",
  "/projects/saqya": "saqya-landing",
  "/projects/saqya/sponsorships": "saqya-portal",
};

/** التوافق الخلفي — نفس خريطة ACTIVE_LEGACY_REDIRECTS في App.tsx. */
function LegacyRoutes() {
  return (
    <Routes>
      {ACTIVE_LEGACY_REDIRECTS.map((r) => (
        <Route key={r.from} path={r.from} element={<Navigate to={r.to} replace />} />
      ))}
      {Object.entries(TARGETS).map(([path, label]) => (
        <Route key={path} path={path} element={<div>{label}</div>} />
      ))}
      <Route path="*" element={<div>not-found</div>} />
    </Routes>
  );
}

describe("legacy route redirects (Phase B)", () => {
  it.each([
    ["/saqya", "saqya-landing"],
    ["/Admin/map", "maps-admin"],
    ["/admin/signin", "unified-signin"],
    ["/executive", "staff"],
    ["/executive/manage", "staff-manage"],
    ["/Admin/executive", "staff"],
    ["/Admin/executive/manage", "staff-manage"],
    ["/Admin/tasks", "projects-list"],
    ["/Admin/projects/create", "projects-list"],
    ["/Admin/ideas", "request-forms"],
    ["/Admin/applications", "vol-apps"],
    ["/Admin/management", "volunteers"],
    ["/Admin/service-requests", "request-forms"],
    ["/Admin/requests", "request-forms"],
    ["/Admin/requests/water-supply", "request-forms"],
    ["/Admin/requests/suggestions", "request-forms"],
  ])("redirects %s", (from, label) => {
    render(
      <MemoryRouter initialEntries={[from]}>
        <LegacyRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("exposes every ACTIVE_LEGACY_REDIRECT target", () => {
    for (const r of ACTIVE_LEGACY_REDIRECTS) {
      expect(TARGETS[r.to], `missing target stub for ${r.to}`).toBeTruthy();
    }
  });
});
