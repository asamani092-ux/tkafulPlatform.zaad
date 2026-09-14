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

/** غلاف وحدة كفالات السقيا — رأس فاتح وفق نظام الزاد. */
export default function SaqyaShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="page-shell min-h-screen bg-surface-muted" dir="rtl">
      <header className="border-b border-surface-border bg-surface px-6 py-6">
        <div className="mx-auto flex max-w-page items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Droplets size={26} aria-hidden />
            <div>
              <h1 className="text-2xl font-extrabold text-primary">كفالات السقيا</h1>
              <p className="text-sm text-brand-gray">{ROLE_LABEL[user?.role || ""] || ""} · {user?.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { void logout().then(() => nav("/signin")); }}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <LogOut size={16} /> خروج
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-page px-4 py-8">{children}</main>
    </div>
  );
}
