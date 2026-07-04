import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderPlus, Lightbulb, ClipboardList, UserCheck, Users, FileBarChart, HandHeart, LogOut, BarChart3 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const links = [
  { to: "/Admin", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/Admin/ideas", label: "أفكار المشاريع", icon: Lightbulb },
  { to: "/Admin/applications", label: "طلبات التطوع", icon: ClipboardList },
  { to: "/Admin/requests", label: "طلبات الانضمام", icon: UserCheck },
  { to: "/Admin/management", label: "إدارة المتطوعين", icon: Users },
  { to: "/Admin/service-requests", label: "طلبات الخدمات", icon: HandHeart },
  { to: "/Admin/tasks", label: "إضافة مشروع", icon: FolderPlus },
  { to: "/Admin/reports", label: "التقارير", icon: FileBarChart },
  { to: "/executive", label: "اللوحة التنفيذية", icon: BarChart3 },
];

/** غلاف لوحات الإدارة (شريط جانبي) على design-system. */
export default function AdminShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-surface-muted" dir="rtl">
      <aside className="w-60 shrink-0 border-l border-surface-border bg-surface p-5">
        <div className="mb-6 text-lg font-extrabold text-primary">إدارة تكافل</div>
        <div className="mb-4 text-sm text-brand-gray">{user?.name || "المشرف"}</div>
        <nav className="space-y-1">
          {links.map((l) => {
            const active = loc.pathname.toLowerCase() === l.to.toLowerCase();
            return (
              <Link key={l.to} to={l.to} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ background: active ? "var(--tmkeen-primary)" : "transparent", color: active ? "#fff" : "var(--tmkeen-brand-gray)" }}>
                <l.icon size={16} /> {l.label}
              </Link>
            );
          })}
          <button onClick={() => { logout(); nav("/admin/signin"); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-gray">
            <LogOut size={16} /> خروج
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
