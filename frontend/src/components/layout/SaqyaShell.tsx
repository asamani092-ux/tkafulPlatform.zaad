import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Droplets, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  admin: "مشرف السقيا",
  donor: "متبرّع",
  supplier: "مورّد",
  representative: "مندوب",
};

/** غلاف وحدة كفالات السقيا على design-system. */
export default function SaqyaShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="page-shell" dir="rtl">
      <header className="px-6 py-6 text-white" style={{ background: "linear-gradient(to left, var(--tmkeen-primary), var(--tmkeen-secondary))" }}>
        <div className="mx-auto flex max-w-page items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={26} />
            <div>
              <h1 className="text-2xl font-extrabold">كفالات السقيا</h1>
              <p className="text-sm" style={{ opacity: 0.9 }}>{ROLE_LABEL[user?.role || ""] || ""} · {user?.name}</p>
            </div>
          </div>
          <button onClick={() => { logout(); nav("/signin"); }} className="flex items-center gap-2 rounded-lg px-3 py-2 font-bold text-white" style={{ background: "rgba(255,255,255,.15)" }}>
            <LogOut size={16} /> خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-page px-4 py-8">{children}</main>
    </div>
  );
}
