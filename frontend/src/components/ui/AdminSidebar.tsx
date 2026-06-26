import type { JSX } from "react";
import { Bell, Home, ClipboardList, ExternalLink, Users, Plus, FileText, UserCheck, Lightbulb, Package, Menu, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";

type MenuKey = "home" | "add-project" | "project-ideas" | "volunteer-requests" | "volunteer-applications" | "volunteer-management" | "reports" | "service-requests";

const menuItems = [
    { key: "home" as MenuKey, label: "الرئيسية", icon: Home, to: "/Admin", exact: true },
    { key: "add-project" as MenuKey, label: "اضافة مشروع", icon: Plus, to: "/Admin/tasks" },
    { key: "project-ideas" as MenuKey, label: "أفكار المشاريع", icon: Lightbulb, to: "/Admin/ideas" },
    { key: "volunteer-requests" as MenuKey, label: "طلبات التطوع", icon: Users, to: "/Admin/requests" },
    { key: "volunteer-applications" as MenuKey, label: "طلبات الانضمام", icon: UserCheck, to: "/Admin/applications" },
    { key: "volunteer-management" as MenuKey, label: "ادارة المتطوعين", icon: ClipboardList, to: "/Admin/management" },
    { key: "service-requests" as MenuKey, label: "طلبات الخدمات", icon: Package, to: "/Admin/service-requests" },
    { key: "reports" as MenuKey, label: "التقارير", icon: FileText, to: "/Admin/reports" },
];

interface AdminSidebarProps {
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
    showMobileToggle?: boolean;
}

export default function AdminSidebar({
    mobileOpen,
    onMobileOpenChange,
    showMobileToggle = true,
}: AdminSidebarProps): JSX.Element {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [internalMobileOpen, setInternalMobileOpen] = useState(false);

    const isMobileControlled = typeof mobileOpen === "boolean";
    const resolvedMobileOpen = isMobileControlled ? mobileOpen : internalMobileOpen;

    const setMobileOpen = (open: boolean) => {
        if (!isMobileControlled) {
            setInternalMobileOpen(open);
        }
        onMobileOpenChange?.(open);
    };

    useEffect(() => {
        if (!resolvedMobileOpen) return;

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
    }, [resolvedMobileOpen]);

    const handleLogout = () => {
        logout();
        setMobileOpen(false);
        navigate("/signin");
    };

    return (
        <>
            {/* Mobile open button */}
            {showMobileToggle && (
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="md:hidden fixed top-4 right-4 z-50 rounded-xl bg-white/95 border border-gray-200 p-2 text-gray-700 shadow-sm"
                    aria-label="فتح القائمة"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}

            {/* Desktop sidebar */}
            <aside
                className="hidden md:block fixed right-4 top-4 bottom-4 w-56 h-[calc(100vh-2rem)] z-10"
                style={{ direction: "rtl" }}
            >
                <div className="relative w-full h-full overflow-hidden rounded-3xl">
                    <div className="absolute inset-0 bg-[#F3E3E3] shadow-sm" />

                    <div className="relative h-full flex flex-col p-1">
                        <div className="flex justify-between items-center m-2">
                            <button className="p-2 hover:bg-white rounded-xl transition">
                                <Bell className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-8 mt-12">
                            <h2 className="text-4xl font-bold text-gray-800 mb-8">تكافل</h2>
                        </div>

                        <nav className="flex-1 space-y-1">
                            {menuItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.key}
                                        to={item.to}
                                        end={item.exact}
                                        className={({ isActive }) =>
                                            `flex items-center gap-4 px-6 py-3 backdrop-blur rounded-3xl transition-all ${isActive
                                                ? "bg-white/90 text-gray-800 shadow-sm"
                                                : "bg-transparent text-gray-500 hover:bg-white/40"
                                            }`
                                        }
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-base">{item.label}</span>
                                    </NavLink>
                                );
                            })}

                            <a
                                href="/"
                                className="flex items-center gap-4 px-6 py-3 backdrop-blur rounded-full transition-all bg-transparent text-gray-500 hover:bg-white/40"
                            >
                                <ExternalLink className="w-5 h-5" />
                                <span className="text-base">صفحة تكافل</span>
                            </a>
                        </nav>

                        <div className="mt-auto pb-4">
                            <div className="text-center">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 mx-auto text-gray-500 text-xs hover:text-gray-700 transition mb-4"
                                >
                                    <span>تسجيل خروج</span>
                                    <span>←</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile drawer */}
            <div
                className={`md:hidden fixed inset-0 z-50 transition-opacity ${resolvedMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setMobileOpen(false)}
            >
                <div className="absolute inset-0 bg-black/40" />
                <aside
                    className={`absolute right-0 top-0 h-full w-[min(320px,88vw)] transition-transform ${resolvedMobileOpen ? "translate-x-0" : "translate-x-full"}`}
                    style={{ direction: "rtl" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative w-full h-full overflow-hidden">
                        <div className="absolute inset-0 bg-[#F3E3E3] shadow-sm" />

                        <div className="relative h-full flex flex-col p-1">
                            <div className="flex justify-between items-center m-2">
                                <button className="p-2 hover:bg-white rounded-xl transition">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="p-2 hover:bg-white rounded-xl transition"
                                    aria-label="إغلاق القائمة"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-8 mt-8">
                                <h2 className="text-4xl font-bold text-gray-800 mb-8">تكافل</h2>
                            </div>

                            <nav className="flex-1 space-y-1">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <NavLink
                                            key={item.key}
                                            to={item.to}
                                            end={item.exact}
                                            onClick={() => setMobileOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center gap-4 px-6 py-3 backdrop-blur rounded-3xl transition-all ${isActive
                                                    ? "bg-white/90 text-gray-800 shadow-sm"
                                                    : "bg-transparent text-gray-500 hover:bg-white/40"
                                                }`
                                            }
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="text-base">{item.label}</span>
                                        </NavLink>
                                    );
                                })}

                                <a
                                    href="/"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-4 px-6 py-3 backdrop-blur rounded-full transition-all bg-transparent text-gray-500 hover:bg-white/40"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                    <span className="text-base">صفحة تكافل</span>
                                </a>
                            </nav>

                            <div className="mt-auto pb-4">
                                <div className="text-center">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 mx-auto text-gray-500 text-xs hover:text-gray-700 transition mb-4"
                                    >
                                        <span>تسجيل خروج</span>
                                        <span>←</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
}
