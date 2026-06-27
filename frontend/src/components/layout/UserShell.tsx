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

/** غلاف صفحات المتطوّع (شريط جانبي) على design-system. */
export default function UserShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-surface-muted" dir="rtl">
      <aside className="w-60 shrink-0 border-l border-surface-border bg-surface p-5">
        <div className="mb-6 text-lg font-extrabold text-primary">تكافل</div>
        <div className="mb-4 text-sm text-brand-gray">مرحبًا {user?.name || "متطوّع"}</div>
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
          <button onClick={() => { logout(); nav("/signin"); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-gray">
            <LogOut size={16} /> خروج
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
