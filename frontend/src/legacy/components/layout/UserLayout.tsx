import { Outlet } from "react-router-dom";
import Sidebar from "../ui/Sidebar";

export default function UserLayout() {
    return (
        <div className="min-h-screen flex bg-[#f5f7fb]">
            {/* السايدبار ثابت */}
            <Sidebar children={undefined} />

            {/* مساحة محتوى الصفحات الفرعية */}
            <div className="flex-1 p-6">
                <Outlet />
            </div>
        </div>
    );
}
