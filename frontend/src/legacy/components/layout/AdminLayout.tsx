import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useState } from "react";
import AdminSidebar from "../ui/AdminSidebar";

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    return (
        <div
            className="min-h-screen bg-gradient-to-r from-[#ab686f] to-[#e2b7a2] flex"
            style={{ direction: "rtl" }}
        >
            <AdminSidebar
                mobileOpen={mobileDrawerOpen}
                onMobileOpenChange={setMobileDrawerOpen}
                showMobileToggle={false}
            />

            <main className="flex-1 pr-3 pl-3 md:pr-4 md:pl-8 py-4 md:py-8 mr-0 md:mr-64 min-w-0">
                <div className="sticky top-0 z-40 mb-3 rounded-2xl border border-white/30 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 flex items-center justify-between shadow-sm md:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(true)}
                        className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                        aria-label="فتح القائمة"
                    >
                        <Menu size={20} />
                    </button>
                    <h2 className="text-sm md:text-base font-semibold text-gray-800 text-right flex-1 md:flex-none">
                        لوحة الإدارة
                    </h2>
                    <span className="text-sm font-bold text-[#8D2E46]">تكافل</span>
                </div>

                <div className="px-2 md:px-10 py-4 md:py-8 max-w-6xl mx-auto min-h-[75vh]">
                    {children}
                </div>
            </main>
        </div>
    );
}
