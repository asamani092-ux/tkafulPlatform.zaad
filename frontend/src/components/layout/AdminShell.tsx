import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, ChevronLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useMemberships } from "../../hooks/useMemberships";
import { ADMIN_DOMAINS, domainForPath } from "../../admin/domains";
import { useState } from "react";

/** غلاف لوحة الإدارة الموحّدة — شريط جانبي بنطاقات العمل السبعة. */
export default function AdminShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { isSuperAdmin } = useMemberships();
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const activeDomain = domainForPath(loc.pathname);
  const [openDomain, setOpenDomain] = useState<string>(activeDomain);

  const visibleDomains = ADMIN_DOMAINS.filter((d) => {
    if (!d.superAdminOnly) return true;
    return isAdmin;
  });

  return (
    <div className="flex min-h-screen bg-surface-muted" dir="rtl">
      <aside className="flex w-64 shrink-0 flex-col border-l border-surface-border bg-surface p-4 sm:p-5">
        <Link to="/Admin" className="mb-5 flex items-center gap-2 text-lg font-extrabold text-primary">
          <img src="/logo.png" alt="جمعية الزاد" style={{ height: 36, width: "auto" }} />
          لوحة الإدارة
        </Link>
        <div className="mb-3 text-sm text-brand-gray">{user?.name || "المشرف"}</div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
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

          {visibleDomains.map((domain) => {
            const domainActive = activeDomain === domain.id;
            const expanded = openDomain === domain.id || domainActive;
            const childLinks = domain.links.filter((l) => isAdmin || l.staffVisible);
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
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
