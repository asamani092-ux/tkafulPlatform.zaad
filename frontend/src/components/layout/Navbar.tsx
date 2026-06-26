import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../ui/Icon';
import UserProfileDropdown from '../ui/UserProfileDropdown';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    navigate('/signin');
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'الصفحة الرئيسية' },
    { to: '/projects', label: 'المشاريع' },
    { to: '/services', label: 'الخدمات' },
    { to: '/volunteers', label: 'المتطوعين' },
    { to: '/about', label: 'من نحن' },
  ];

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const styleId = 'cm-no-scroll-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .cm-no-scroll{overflow:hidden!important;overscroll-behavior:none!important;position:fixed!important;width:100%!important}
        body.cm-no-scroll{overflow:hidden!important;overscroll-behavior:none!important;position:fixed!important;width:100%!important;height:100%!important}
      `;
      document.head.appendChild(style);
    }

    const body = document.body;
    const html = document.documentElement;
    body.classList.add('cm-no-scroll');
    html.classList.add('cm-no-scroll');

    return () => {
      body.classList.remove('cm-no-scroll');
      html.classList.remove('cm-no-scroll');
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-gray-200 py-3">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo - FAR LEFT */}
          <Link 
            to="/" 
            className="focus-visible:ring-2 ring-brand-600 ring-offset-2 rounded-lg"
            aria-label="تكافل وأثر - الصفحة الرئيسية"
          >
            <img 
              src="/logo.png" 
              alt="تكافل" 
              className="h-7 md:h-8 w-auto select-none"
            />
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-8 space-x-reverse">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors duration-200 ease-out hover:text-brand-700 focus-visible:ring-2 ring-brand-600 ring-offset-2 rounded-lg px-3 py-2 ${
                  location.pathname === link.to ? 'text-brand-700' : 'text-gray-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Login/User Button - Desktop */}
          <div className="hidden md:flex">
            {isAuthenticated ? (
              <UserProfileDropdown userName={user?.name || ''} userRole={user?.role || 'user'} />
            ) : (
              <button
                onClick={handleLogin}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 focus-visible:ring-2 ring-brand-600 ring-offset-2 flex items-center gap-2"
              >
                <Icon name="User" size={16} />
                تسجيل الدخول
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden rounded-lg p-2 text-gray-700 hover:bg-gray-100 focus-visible:ring-2 ring-brand-600 ring-offset-2"
            aria-label="فتح القائمة"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[min(320px,90vw)] bg-white shadow-xl p-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold text-gray-900">القائمة</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="إغلاق القائمة"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              {isAuthenticated ? (
                <div className="flex justify-start">
                  <UserProfileDropdown userName={user?.name || ''} userRole={user?.role || 'user'} />
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="w-full rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 focus-visible:ring-2 ring-brand-600 ring-offset-2 flex items-center justify-center gap-2"
                >
                  <Icon name="User" size={16} />
                  تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
