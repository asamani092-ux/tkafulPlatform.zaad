import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, ChevronLeft, Menu, X } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../../contexts/AuthContext";
import { domainForPath } from "../../admin/domains";
import { visibleDomainsForUser } from "../../admin/access";
import { useMembershipsContext } from "../../contexts/MembershipsContext";
import { useEffect, useState } from "react";

/** غلاف لوحة الإدارة — شريط جانبي ثابت على الشاشات الكبيرة، وdrawer على الصغيرة. */
export default function AdminShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { loading, access } = useMembershipsContext();
  const { isGlobalAdmin } = access;
  const activeDomain = domainForPath(loc.pathname);
  const [openDomain, setOpenDomain] = useState<string>(activeDomain);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleDomains = visibleDomainsForUser(access);

  useEffect(() => {
    setDrawerOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const navBody = (
    <>
      <Link to="/Admin" className="mb-5 flex items-center gap-2 text-lg font-extrabold text-primary">
        <img src="/logo.png" alt="جمعية الزاد" style={{ height: 36, width: "auto" }} />
        لوحة الإدارة
      </Link>
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-brand-gray">
        <span>{user?.name || "المشرف"}</span>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {loading ? (
          <p className="px-3 py-2 text-sm text-brand-gray">جاري تحميل الصلاحيات…</p>
        ) : (
          <>
            {isGlobalAdmin && (
              <Link
                to="/Admin"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
                style={{
                  background: activeDomain === "overview" ? "var(--tmkeen-primary)" : "transparent",
                  color: activeDomain === "overview" ? "#fff" : "var(--tmkeen-brand-gray)",
                }}
              >
                نظرة عامة
              </Link>
            )}

            {visibleDomains.map((domain) => {
          const domainActive = activeDomain === domain.id;
          const expanded = openDomain === domain.id || domainActive;
          const childLinks = domain.links.filter((l) => isGlobalAdmin || l.staffVisible);
          if (childLinks.length === 0) return null;
          return (
            <div key={domain.id} className="rounded-lg">
              <button
                type="button"
                onClick={() => setOpenDomain(expanded && openDomain === domain.id ? "" : domain.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-bold"
                style={{
                  background: domainActive ? "color-mix(in srgb, var(--tmkeen-primary) 12%, transparent)" : "transparent",
                  color: "var(--tmkeen-primary)",
                }}
              >
                <span>{domain.label}</span>
                {expanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
              </button>
              {expanded && (
                <div className="mb-1 me-2 space-y-0.5 border-r border-surface-border pr-2">
                  {childLinks.map((l) => {
                    const active = loc.pathname.toLowerCase() === l.to.toLowerCase();
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        className="block rounded-md px-3 py-1.5 text-sm font-semibold"
                        style={{
                          background: active ? "var(--tmkeen-primary)" : "transparent",
                          color: active ? "#fff" : "var(--tmkeen-brand-gray)",
                        }}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

            <button
              type="button"
              onClick={() => { void logout().then(() => nav("/signin")); }}
              className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-gray"
            >
              <LogOut size={16} /> خروج
            </button>
          </>
        )}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted md:flex-row" dir="rtl">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="فتح قائمة الإدارة"
          aria-expanded={drawerOpen}
          className="text-brand-gray"
        >
          <Menu size={22} />
        </button>
        <span className="text-sm font-extrabold text-primary">لوحة الإدارة</span>
        <NotificationBell />
      </header>

      <aside className="hidden w-64 shrink-0 flex-col border-l border-surface-border bg-surface p-4 sm:p-5 md:flex">
        {navBody}
      </aside>

      {drawerOpen && (
        <div className="zad-drawer-root md:hidden" role="dialog" aria-modal="true" aria-labelledby="admin-nav-drawer-title">
          <button type="button" className="zad-drawer-backdrop" aria-label="إغلاق القائمة" onClick={() => setDrawerOpen(false)} />
          <aside className="zad-drawer-panel p-4">
            <div className="zad-drawer-header mb-2 px-0">
              <h2 id="admin-nav-drawer-title" className="zad-drawer-title">القائمة</h2>
              <button type="button" className="zad-drawer-close text-brand-gray" onClick={() => setDrawerOpen(false)} aria-label="إغلاق">
                <X size={22} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {navBody}
            </div>
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
