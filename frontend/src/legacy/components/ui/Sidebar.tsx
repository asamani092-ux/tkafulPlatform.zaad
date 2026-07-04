import type { ReactNode } from 'react';
import { Bell, Settings, Home, ClipboardList, ExternalLink, UserCircle, Menu, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { useToast } from '../../contexts/ToastContext';

type MenuKey = 'home' | 'personal-info' | 'tasks' | 'settings' | 'takaful';

interface SidebarLayoutProps {
    children: ReactNode;
}

interface ProfileData {
    name: string;
    email: string;
    skills: string[];
}

const menuItems = [
    { key: 'home' as MenuKey, label: 'الرئيسية', icon: Home, to: '/user/main', exact: true },
    { key: 'tasks' as MenuKey, label: 'المهام', icon: ClipboardList, to: '/user/tasks' },
    { key: 'personal-info' as MenuKey, label: 'المعلومات الشخصية', icon: UserCircle, to: '/user/personal-info', exact: true },
    { key: 'settings' as MenuKey, label: 'الإعدادات', icon: Settings, to: '/user/settings' },
];

export default function ArabicSidebar({ children }: SidebarLayoutProps) {
    const { user, access, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { info } = useToast();
    const [volunteerData, setVolunteerData] = useState<ProfileData | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!access) return;

            try {
                const res = await fetch(`${API_BASE_URL}/api/accounts/me/`, {
                    headers: {
                        Authorization: `Bearer ${access}`,
                    },
                });

                if (!res.ok) throw new Error('Failed to fetch profile');

                const data = await res.json();
                setVolunteerData(data);
            } catch (err) {
                console.error('Sidebar profile error:', err);
            }
        };

        fetchProfile();
    }, [access]);

    useEffect(() => {
        if (!isMobileSidebarOpen) return;

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
    }, [isMobileSidebarOpen]);

    const handleLogout = () => {
        logout();
        setIsMobileSidebarOpen(false);
        navigate('/signin');
    };

    const handleSettingsClick = () => {
        setIsMobileSidebarOpen(false);
        info({
            title: 'معلومة',
            description: 'ميزة الإعدادات قادمة قريبًا إن شاء الله.',
        });
    };

    const handleNavClick = () => {
        setIsMobileSidebarOpen(false);
    };

    const displayName = volunteerData?.name || user?.name || 'المستخدم';
    const skills = volunteerData?.skills ?? [];

    return (
        <div className="min-h-screen bg-gray-50 flex" style={{ direction: 'rtl' }}>
            <div className="hidden md:block w-56 relative overflow-hidden rounded-3xl m-4 sticky top-4 self-start h-[calc(100vh-2rem)]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#e3d1d8] via-[#f5e6d3] to-[#fef3c7]" />

                <div className="relative h-full flex flex-col p-3">
                    <div className="flex justify-between items-center mb-4">
                        <button className="p-2 hover:bg-white/30 rounded-lg transition">
                            <Bell className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                            onClick={handleSettingsClick}
                            className="p-2 hover:bg-white/30 rounded-lg transition"
                        >
                            <Settings className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-4">
                        <div className="relative mb-3">
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#8D2E46] via-[#b07a7a] to-[#d4b896] p-1">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                    <span className="text-2xl font-bold text-[#8D2E46]">
                                        {displayName.charAt(0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-lg font-bold text-gray-800 mb-2">
                            {displayName}
                        </h2>

                        {skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 justify-center mb-1.5">
                                {skills.slice(0, 5).map((skill, index) => (
                                    <span
                                        key={index}
                                        className="px-2.5 py-0.5 rounded-full text-[10px] border bg-gray-100 text-gray-700"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <nav className="flex-1 space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;

                            if (item.key === 'settings') {
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={handleSettingsClick}
                                        className={`w-full flex items-center gap-3 px-4 py-2 backdrop-blur rounded-full transition-all ${location.pathname === '/user/settings'
                                            ? 'bg-white/90 text-gray-800 shadow-sm'
                                            : 'bg-transparent text-gray-500 hover:bg-white/40'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-base">{item.label}</span>
                                    </button>
                                );
                            }

                            return (
                                <NavLink
                                    key={item.key}
                                    to={item.to}
                                    end={item.exact}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-2 backdrop-blur rounded-full transition-all ${
                                            isActive
                                                ? 'bg-white/90 text-gray-800 shadow-sm'
                                                : 'bg-transparent text-gray-500 hover:bg-white/40'
                                        }`
                                    }
                                    onClick={handleNavClick}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-base">{item.label}</span>
                                </NavLink>
                            );
                        })}

                        <a
                            href="/"
                            onClick={handleNavClick}
                            className="flex items-center gap-3 px-4 py-2 backdrop-blur rounded-full transition-all bg-transparent text-gray-500 hover:bg-white/40"
                        >
                            <ExternalLink className="w-5 h-5" />
                            <span className="text-base">صفحة تكافل</span>
                        </a>
                    </nav>

                    <div className="mt-auto pb-4">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-800 mb-1">تكافل</h3>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 mx-auto text-gray-500 text-xs hover:text-gray-700 transition"
                            >
                                <span>تسجيل خروج</span>
                                <span>←</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 m-2 md:m-4 min-w-0">
                <div className="sticky top-0 z-30 mb-3 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 flex items-center justify-between shadow-sm">
                    <button
                        type="button"
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                        aria-label="فتح القائمة"
                    >
                        <Menu size={20} />
                    </button>
                    <h2 className="text-sm md:text-base font-semibold text-gray-800 text-right flex-1 md:flex-none">
                        لوحة المستخدم
                    </h2>
                    <span className="text-sm font-bold text-[#8D2E46]">تكافل</span>
                </div>

                <div className="bg-white rounded-2xl md:rounded-3xl h-full min-h-[calc(100vh-2rem)] border border-gray-200 shadow-sm p-4 md:p-6">
                    {children}
                </div>
            </div>

            <div
                className={`md:hidden fixed inset-0 z-50 transition-opacity ${isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileSidebarOpen(false)}
            >
                <div className="absolute inset-0 bg-black/40" />
                <div
                    className={`absolute right-0 top-0 h-full w-[min(320px,88vw)] bg-white shadow-xl transition-transform ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative h-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#e3d1d8] via-[#f5e6d3] to-[#fef3c7]" />
                        <div className="relative h-full flex flex-col p-3">
                            <div className="flex justify-between items-center mb-4">
                                <button className="p-2 hover:bg-white/30 rounded-lg transition">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    className="p-2 hover:bg-white/30 rounded-lg transition"
                                    aria-label="إغلاق القائمة"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-4">
                                <div className="relative mb-3">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8D2E46] via-[#b07a7a] to-[#d4b896] p-1">
                                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                            <span className="text-xl font-bold text-[#8D2E46]">
                                                {displayName.charAt(0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <h2 className="text-lg font-bold text-gray-800 mb-2">{displayName}</h2>
                            </div>

                            <nav className="flex-1 space-y-1">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;

                                    if (item.key === 'settings') {
                                        return (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={handleSettingsClick}
                                                className={`w-full flex items-center gap-3 px-4 py-2 backdrop-blur rounded-full transition-all ${location.pathname === '/user/settings'
                                                    ? 'bg-white/90 text-gray-800 shadow-sm'
                                                    : 'bg-transparent text-gray-500 hover:bg-white/40'
                                                    }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span className="text-base">{item.label}</span>
                                            </button>
                                        );
                                    }

                                    return (
                                        <NavLink
                                            key={item.key}
                                            to={item.to}
                                            end={item.exact}
                                            onClick={handleNavClick}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 px-4 py-2 backdrop-blur rounded-full transition-all ${
                                                    isActive
                                                        ? 'bg-white/90 text-gray-800 shadow-sm'
                                                        : 'bg-transparent text-gray-500 hover:bg-white/40'
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
                                    onClick={handleNavClick}
                                    className="flex items-center gap-3 px-4 py-2 backdrop-blur rounded-full transition-all bg-transparent text-gray-500 hover:bg-white/40"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                    <span className="text-base">صفحة تكافل</span>
                                </a>
                            </nav>

                            <div className="mt-auto pb-4">
                                <div className="text-center">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 mx-auto text-gray-500 text-xs hover:text-gray-700 transition"
                                    >
                                        <span>تسجيل خروج</span>
                                        <span>←</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
