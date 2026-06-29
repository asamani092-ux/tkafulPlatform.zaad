import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const navLinks = [
  { to: "/", label: "الصفحة الرئيسية" },
  { to: "/projects", label: "المشاريع" },
  { to: "/services", label: "الخدمات" },
  { to: "/volunteers", label: "المتطوعين" },
  { to: "/executive", label: "اللوحة التنفيذية" },
  { to: "/saqya", label: "كفالات السقيا" },
  { to: "/about", label: "من نحن" },
];

/** شريط التنقّل الموحّد على design-system. */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkClass = (to: string) =>
    `px-3 py-2 text-sm font-semibold transition-colors ${
      location.pathname === to ? "text-primary" : "text-brand-gray hover:text-primary"
    }`;

  const dashboardPath = user?.role === "admin" ? "/Admin" : "/user/main";

  return (
    <nav className="sticky top-0 z-30 border-b border-surface-border bg-surface">
      <div className="mx-auto flex max-w-page items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-extrabold text-primary">
          تكافل
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} className={linkClass(l.to)}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link to={dashboardPath} className="flex items-center gap-2 text-sm font-semibold text-primary">
                <User size={16} /> {user?.name || "حسابي"}
              </Link>
              <button onClick={logout} aria-label="خروج" className="text-brand-gray hover:text-primary">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button onClick={() => navigate("/signin")} className="btn-secondary" style={{ padding: "0.5rem 1rem" }}>
              <User size={16} /> تسجيل الدخول
            </button>
          )}
        </div>

        <button className="text-brand-gray md:hidden" onClick={() => setOpen((v) => !v)} aria-label="القائمة">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-surface-border bg-surface px-4 py-2 md:hidden">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={`block ${linkClass(l.to)}`}>
              {l.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-surface-border pt-2">
            {isAuthenticated ? (
              <button onClick={() => { logout(); setOpen(false); }} className="text-sm font-semibold text-primary">
                خروج ({user?.name})
              </button>
            ) : (
              <Link to="/signin" onClick={() => setOpen(false)} className="text-sm font-semibold text-primary">
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
