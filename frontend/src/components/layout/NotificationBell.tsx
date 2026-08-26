import { useEffect, useState } from "react";
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

function TypeIcon({ kind }: { kind: string }) {
  const cls = "shrink-0 text-primary";
  if (kind === "success") return <CheckCircle2 size={16} className={cls} aria-hidden />;
  if (kind === "warning") return <AlertTriangle size={16} className={cls} aria-hidden />;
  if (kind === "action") return <Zap size={16} className={cls} aria-hidden />;
  return <Info size={16} className={cls} aria-hidden />;
}

/** جرس الإشعارات — عدد غير المقروء + قائمة منسدلة. */
export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Note[]>([]);

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

  return (
    <div className="relative">
      <button type="button" className="relative text-brand-gray" aria-label="الإشعارات" onClick={() => { setOpen((o) => !o); void load(); }}>
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-1 -start-1 min-w-[1.1rem] rounded-full bg-[var(--tmkeen-danger)] px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute start-0 z-40 mt-2 w-80 rounded-lg border border-surface-border bg-surface p-2 shadow-md">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-bold text-primary">الإشعارات</span>
            <button type="button" className="text-xs text-primary" onClick={() => void markAll()}>تعليم الكل كمقروء</button>
          </div>
          {items.length === 0 && <p className="p-3 text-xs text-brand-gray">لا إشعارات</p>}
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-start text-sm"
                  style={{ background: n.is_read ? "transparent" : "color-mix(in srgb, var(--tmkeen-primary) 8%, transparent)" }}
                  onClick={() => void markOne(n)}
                >
                  <TypeIcon kind={n.notification_type} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-primary">{n.message}</div>
                    <div className="text-[11px] text-brand-gray">
                      {notificationTypeLabel(n.notification_type)} · {n.created_at.slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/user/settings" className="mt-1 block px-2 py-1 text-xs font-bold text-primary" onClick={() => setOpen(false)}>تفضيلات الإشعارات</Link>
        </div>
      )}
    </div>
  );
}
