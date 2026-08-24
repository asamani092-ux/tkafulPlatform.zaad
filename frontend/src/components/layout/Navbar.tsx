import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useMembershipsContext } from "../../contexts/MembershipsContext";
import { defaultAdminHome } from "../../admin/access";

const navLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/projects", label: "المشاريع" },
  { to: "/services", label: "الخدمات" },
  { to: "/volunteers", label: "المتطوعون" },
  { to: "/map", label: "خارطة الأثر" },
  { to: "/about", label: "من نحن" },
  { to: "/suggest", label: "اقترح مبادرة" },
];

/** شريط التنقّل العام — قائمة جانبية (drawer) على الشاشات الصغيرة. */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { loading, access } = useMembershipsContext();
  const [open, setOpen] = useState(false);

  const dashboardPath = loading ? "/user/main" : defaultAdminHome(access);
  const showAdminLink = loading
    ? false
    : access.isGlobalAdmin || access.hasMemberships || ["manager", "employee"].includes(access.userRole);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-surface-border bg-surface">
      <div className="mx-auto flex max-w-page items-center gap-3 px-4 py-3 md:justify-between">
        {/* جوال RTL: قائمة → شعار → اسم المنصة (من اليمين) */}
        <div className="flex min-w-0 items-center gap-2 md:contents">
          <button
            type="button"
            className="shrink-0 text-brand-gray md:hidden"
            onClick={() => setOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={open}
            aria-controls="site-nav-drawer"
          >
            <Menu size={22} />
          </button>
          <Link to="/" className="flex min-w-0 items-center gap-2 text-xl font-extrabold text-primary">
            <img src="/logo.png" alt="جمعية الزاد" style={{ height: 40, width: "auto" }} />
            <span className="truncate">تكافل وأثر</span>
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${
                location.pathname === l.to ? "text-primary" : "text-brand-gray hover:text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link to={dashboardPath} className="flex items-center gap-2 text-sm font-semibold text-primary">
                <User size={16} /> {showAdminLink ? "لوحة الإدارة" : (user?.name || "حسابي")}
              </Link>
              <button type="button" onClick={() => { void logout(); }} aria-label="خروج" className="text-brand-gray hover:text-primary">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button onClick={() => navigate("/signin")} className="btn-secondary" style={{ padding: "0.5rem 1rem" }}>
              <User size={16} /> تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="zad-drawer-root md:hidden" role="dialog" aria-modal="true" aria-labelledby="site-nav-drawer-title">
          <button type="button" className="zad-drawer-backdrop" aria-label="إغلاق القائمة" onClick={close} />
          <aside id="site-nav-drawer" className="zad-drawer-panel">
            <div className="zad-drawer-header">
              <h2 id="site-nav-drawer-title" className="zad-drawer-title">القائمة</h2>
              <button type="button" className="zad-drawer-close text-brand-gray" onClick={close} aria-label="إغلاق">
                <X size={22} />
              </button>
            </div>
            <div className="zad-drawer-body flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={close}
                  className="zad-nav-link"
                  aria-current={location.pathname === l.to ? "page" : undefined}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 border-t border-surface-border pt-3">
                {isAuthenticated ? (
                  <>
                    <Link to={dashboardPath} onClick={close} className="zad-nav-link">
                      <User size={16} /> {showAdminLink ? "لوحة الإدارة" : "حسابي"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => { void logout(); close(); }}
                      className="zad-nav-link"
                    >
                      <LogOut size={16} /> خروج ({user?.name})
                    </button>
                  </>
                ) : (
                  <Link to="/signin" onClick={close} className="zad-nav-link">
                    <User size={16} /> تسجيل الدخول
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </nav>
  );
}
