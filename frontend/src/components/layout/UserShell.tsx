import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ListTodo, User, Settings, LogOut, Menu, X } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";

const links = [
  { to: "/user/main", label: "الرئيسية", icon: Home },
  { to: "/user/tasks", label: "مهامي", icon: ListTodo },
  { to: "/user/personal-info", label: "معلوماتي", icon: User },
  { to: "/user/settings", label: "الإعدادات", icon: Settings },
];

/** غلاف صفحات المتطوّع — شريط جانبي ثابت على الشاشات الكبيرة، وdrawer على الصغيرة. */
export default function UserShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <div className="mb-6 flex items-center gap-2 text-lg font-extrabold text-primary">
        <img src="/logo.png" alt="جمعية الزاد" style={{ height: 36, width: "auto" }} />
        تكافل وأثر
      </div>
      <div className="mb-4 flex items-center justify-between gap-2 text-sm text-brand-gray">
        <span>مرحبًا {user?.name || "متطوّع"}</span>
        <NotificationBell />
      </div>
      <nav className="space-y-1">
        {links.map((l) => {
          const active = loc.pathname === l.to;
          return (
            <Link key={l.to} to={l.to} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ background: active ? "var(--tmkeen-primary)" : "transparent", color: active ? "#fff" : "var(--tmkeen-brand-gray)" }}>
              <l.icon size={16} /> {l.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => { void logout().then(() => nav("/signin")); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-gray">
          <LogOut size={16} /> خروج
        </button>
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted md:flex-row" dir="rtl">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="فتح القائمة"
          aria-expanded={drawerOpen}
          className="text-brand-gray"
        >
          <Menu size={22} />
        </button>
        <span className="text-sm font-extrabold text-primary">تكافل وأثر</span>
        <NotificationBell />
      </header>

      <aside className="hidden w-60 shrink-0 border-l border-surface-border bg-surface p-5 md:block">
        {navBody}
      </aside>

      {drawerOpen && (
        <div className="zad-drawer-root md:hidden" role="dialog" aria-modal="true" aria-labelledby="user-nav-drawer-title">
          <button type="button" className="zad-drawer-backdrop" aria-label="إغلاق القائمة" onClick={() => setDrawerOpen(false)} />
          <aside className="zad-drawer-panel p-5">
            <div className="zad-drawer-header mb-2 px-0">
              <h2 id="user-nav-drawer-title" className="zad-drawer-title">القائمة</h2>
              <button type="button" className="zad-drawer-close text-brand-gray" onClick={() => setDrawerOpen(false)} aria-label="إغلاق">
                <X size={22} />
              </button>
            </div>
            {navBody}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
