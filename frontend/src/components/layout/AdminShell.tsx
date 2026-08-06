import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderPlus, Lightbulb, ClipboardList, UserCheck, Users, FileBarChart, HandHeart, LogOut, BarChart3, Map, FolderKanban } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useMemberships } from "../../hooks/useMemberships";

// superAdminOnly: تبويبات المنصّة القديمة تبقى للمشرف العام؛ عضو المشروع يرى نطاقه فقط
const links = [
  { to: "/Admin", label: "الرئيسية", icon: LayoutDashboard, superAdminOnly: true },
  { to: "/Admin/projects", label: "مشاريع المنصّة", icon: FolderKanban, superAdminOnly: false },
  { to: "/Admin/maps", label: "الخرائط", icon: Map, superAdminOnly: false },
  { to: "/Admin/ideas", label: "أفكار المشاريع", icon: Lightbulb, superAdminOnly: true },
  { to: "/Admin/applications", label: "طلبات التطوع", icon: ClipboardList, superAdminOnly: true },
  { to: "/Admin/requests", label: "طلبات الانضمام", icon: UserCheck, superAdminOnly: true },
  { to: "/Admin/management", label: "إدارة المتطوعين", icon: Users, superAdminOnly: true },
  { to: "/Admin/service-requests", label: "طلبات الخدمات", icon: HandHeart, superAdminOnly: true },
  { to: "/Admin/tasks", label: "إضافة مشروع", icon: FolderPlus, superAdminOnly: true },
  { to: "/Admin/reports", label: "التقارير", icon: FileBarChart, superAdminOnly: true },
  { to: "/Admin/executive", label: "اللوحة التنفيذية", icon: BarChart3, superAdminOnly: true },
];

/** غلاف لوحات الإدارة (شريط جانبي) — role-scoped على نظام الزاد. */
export default function AdminShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { isSuperAdmin } = useMemberships();
  const visibleLinks = links.filter(
    (l) => !l.superAdminOnly || user?.role === "admin" || isSuperAdmin,
  );

  return (
    <div className="zad-root flex min-h-screen bg-surface-muted" dir="rtl">
      <aside
        className="shrink-0 border-surface-border bg-surface p-5"
        style={{
          width: "var(--sidebar)",
          borderInlineEnd: "var(--border-hairline) solid var(--border-subtle)",
        }}
      >
        <div className="mb-6 flex items-center gap-2 text-lg font-extrabold text-primary">
          <img src="/logo.png" alt="جمعية الزاد" style={{ height: 36, width: "auto" }} />
          إدارة تكافل وأثر
        </div>
        <div className="mb-4 text-sm text-brand-gray">{user?.name || "المشرف"}</div>
        <nav className="space-y-1" aria-label="قائمة الإدارة">
          {visibleLinks.map((l) => {
            const active = loc.pathname.toLowerCase() === l.to.toLowerCase();
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
