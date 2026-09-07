import { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { authFetch } from "../../lib/api";
import { EVENT_AR } from "../../admin/notifications";

interface Pref {
  event_type: string;
  enabled: boolean;
}

/** بطاقة تفضيلات الإشعارات — مشتركة بين بوابة المتطوّع ولوحة الإدارة. O(P) حيث P عدد الفئات. */
export default function NotificationPreferencesPanel() {
  const { error } = useToast();
  const [prefs, setPrefs] = useState<Pref[]>([]);

  useEffect(() => {
    authFetch("/api/notifications/preferences/")
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => setPrefs(data.results || []))
      .catch(() => {});
  }, []);

  const togglePref = async (event_type: string, enabled: boolean) => {
    setPrefs((prev) => prev.map((p) => (p.event_type === event_type ? { ...p, enabled } : p)));
    const res = await authFetch("/api/notifications/preferences/", {
      method: "PUT",
      body: JSON.stringify({ event_type, enabled }),
    });
    if (!res.ok) {
      setPrefs((prev) => prev.map((p) => (p.event_type === event_type ? { ...p, enabled: !enabled } : p)));
      error({ title: "تعذّر حفظ التفضيل" });
    }
  };

  return (
    <>
      <h2 className="mb-4 text-lg font-bold text-primary">تفضيلات الإشعارات</h2>
      <p className="mb-3 text-sm text-brand-gray">عطّل الفئة لكتم إشعاراتها داخل المنصّة.</p>
      <ul className="space-y-2">
        {prefs.map((p) => (
          <li key={p.event_type}>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-surface-border p-3">
              <span className="font-bold text-primary">{EVENT_AR[p.event_type] || p.event_type}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--tmkeen-primary)]"
                checked={p.enabled}
                onChange={(e) => void togglePref(p.event_type, e.target.checked)}
              />
            </label>
          </li>
        ))}
      </ul>
      {prefs.length === 0 && (
        <p className="text-sm text-brand-gray">لا فئات تفضيل بعد — ستظهر عند أول إشعار.</p>
      )}
    </>
  );
}
