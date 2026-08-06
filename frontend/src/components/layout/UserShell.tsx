import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ListTodo, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const links = [
  { to: "/user/main", label: "الرئيسية", icon: Home },
  { to: "/user/tasks", label: "مهامي", icon: ListTodo },
  { to: "/user/personal-info", label: "معلوماتي", icon: User },
  { to: "/user/settings", label: "الإعدادات", icon: Settings },
];

/** غلاف صفحات المتطوّع (شريط جانبي) على نظام الزاد. */
export default function UserShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="zad-root flex min-h-screen bg-surface-muted" dir="rtl">
      <aside
        className="shrink-0 bg-surface p-5"
        style={{
          width: "var(--sidebar)",
          borderInlineEnd: "var(--border-hairline) solid var(--border-subtle)",
        }}
      >
        <div className="mb-6 flex items-center gap-2 text-lg font-extrabold text-primary">
          <img src="/logo.png" alt="جمعية الزاد" style={{ height: 36, width: "auto" }} />
          تكافل وأثر
        </div>
        <div className="mb-4 text-sm text-brand-gray">مرحبًا {user?.name || "متطوّع"}</div>
        <nav className="space-y-1" aria-label="قائمة المتطوّع">
          {links.map((l) => {
            const active = loc.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="zad-nav-link"
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
              >
                <l.icon size={16} aria-hidden /> {l.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => { void logout().then(() => nav("/signin")); }}
            className="zad-nav-link"
          >
            <LogOut size={16} aria-hidden /> خروج
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
