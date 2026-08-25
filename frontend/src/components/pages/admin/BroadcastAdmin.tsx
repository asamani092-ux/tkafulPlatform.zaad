import { useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { ROLE_OPTIONS } from "../../../i18n/labels";
import { extractErrorDetail } from "../../../admin/userManagement";
import { notificationTypeLabel } from "../../../admin/notifications";

const TYPES = ["info", "success", "warning", "action"];

/** بث إشعار داخل المنصّة لدور أو للجميع. */
export default function BroadcastAdmin() {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [kind, setKind] = useState("info");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error({ title: "الرسالة مطلوبة" });
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, string> = {
        message: message.trim(),
        notification_type: kind,
        link: link.trim(),
      };
      if (role) body.role = role;
      const res = await authFetch("/api/notifications/broadcast/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: "تعذّر البث", description: extractErrorDetail(data) });
      } else {
        toast.success({ title: "تم إرسال الإشعار", description: `أُرسل إلى ${data.sent ?? 0} مستلم` });
        setMessage("");
        setLink("");
      }
    } catch {
      toast.error({ title: "خطأ في الاتصال" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">بث إشعار</h1>
      <Card>
        <form onSubmit={(e) => void submit(e)} className="max-w-lg space-y-4">
          <div>
            <label className="label-field" htmlFor="broadcast-msg">الرسالة</label>
            <textarea
              id="broadcast-msg"
              className="input-field min-h-[6rem]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <Select label="المستلمون" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">الجميع</option>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select label="النوع" value={kind} onChange={(e) => setKind(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{notificationTypeLabel(t)}</option>
            ))}
          </Select>
          <div>
            <label className="label-field" htmlFor="broadcast-link">رابط اختياري</label>
            <input id="broadcast-link" className="input-field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/Admin/requests" />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "جاري الإرسال…" : "إرسال"}</Button>
        </form>
      </Card>
    </AdminShell>
  );
}
