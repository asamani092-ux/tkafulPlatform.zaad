import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Info, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { authFetch } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { notificationTypeLabel } from "../../admin/notifications";

interface Note {
  id: number;
  message: string;
  is_read: boolean;
  notification_type: string;
  link: string;
  created_at: string;
}

const PANEL_WIDTH = 320;

function TypeIcon({ kind }: { kind: string }) {
  const cls = "shrink-0 text-primary";
  if (kind === "success") return <CheckCircle2 size={16} className={cls} aria-hidden />;
  if (kind === "warning") return <AlertTriangle size={16} className={cls} aria-hidden />;
  if (kind === "action") return <Zap size={16} className={cls} aria-hidden />;
  return <Info size={16} className={cls} aria-hidden />;
}

/** جرس الإشعارات — عدد غير المقروء + قائمة منسدلة عبر بوابة فوق الواجهة. */
export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Note[]>([]);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!isAuthenticated) return;
    const [c, list] = await Promise.all([
      authFetch("/api/notifications/unread-count/").then((r) => (r.ok ? r.json() : { count: 0 })),
      authFetch("/api/notifications/?page_size=8").then((r) => (r.ok ? r.json() : { results: [] })),
    ]);
    setCount(c.count || 0);
    setItems(list.results || []);
  };

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      // محاذاة بداية اللوحة مع بداية الزر (RTL: حافة الزر اليمنى)
      let left = r.right - PANEL_WIDTH;
      left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
      const top = Math.min(r.bottom + 8, window.innerHeight - 16);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isAuthenticated) return null;

  const markOne = async (n: Note) => {
    await authFetch(`/api/notifications/${n.id}/read/`, { method: "POST" });
    if (n.link) nav(n.link);
    setOpen(false);
    void load();
  };

  const markAll = async () => {
    await authFetch("/api/notifications/mark-all-read/", { method: "POST" });
    void load();
  };

  const panel =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={panelRef}
        role="dialog"
        aria-label="الإشعارات"
        className="w-80 rounded-lg border border-surface-border bg-surface p-2 shadow-md"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: "var(--z-popover)",
          maxHeight: "min(24rem, calc(100vh - 2rem))",
          overflowY: "auto",
        }}
        dir="rtl"
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-sm font-bold text-primary">الإشعارات</span>
          <button type="button" className="text-xs text-primary" onClick={() => void markAll()}>
            تعليم الكل كمقروء
          </button>
        </div>
        {items.length === 0 && <p className="p-3 text-xs text-brand-gray">لا إشعارات</p>}
        <ul className="max-h-80 overflow-y-auto">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-start text-sm"
                style={{
                  background: n.is_read
                    ? "transparent"
                    : "color-mix(in srgb, var(--tmkeen-primary) 8%, transparent)",
                }}
                onClick={() => void markOne(n)}
              >
                <TypeIcon kind={n.notification_type} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-primary">{n.message}</div>
                  <div className="text-[11px] text-brand-gray">
                    {notificationTypeLabel(n.notification_type)} ·{" "}
                    {n.created_at.slice(0, 16).replace("T", " ")}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <Link
          to="/user/settings"
          className="mt-1 block px-2 py-1 text-xs font-bold text-primary"
          onClick={() => setOpen(false)}
        >
          تفضيلات الإشعارات
        </Link>
      </div>,
      document.body,
    );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        className="relative text-brand-gray"
        aria-label="الإشعارات"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((o) => !o);
          void load();
        }}
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-1 -start-1 min-w-[1.1rem] rounded-full bg-[var(--tmkeen-danger)] px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
