import { useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Textarea from "../../ui/Textarea";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { extractErrorDetail } from "../../../admin/userManagement";
import { notificationTypeLabel } from "../../../admin/notifications";

const TYPES = ["info", "success", "warning", "action"];

const AUDIENCE = [
  { value: "", label: "جميع المستخدمين" },
  { value: "employee", label: "الموظفون" },
  { value: "user", label: "المتطوعون" },
];

/** تعميم داخلي — إشعار منصة أو بريد RTL مع فلترة المستلمين. */
export default function BroadcastAdmin() {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [channel, setChannel] = useState<"in_app" | "email">("in_app");
  const [kind, setKind] = useState("info");
  const [link, setLink] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

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
        channel,
        notification_type: kind,
        link: link.trim(),
      };
      if (role) body.role = role;
      if (channel === "email" && subject.trim()) body.subject = subject.trim();
      const res = await authFetch("/api/notifications/broadcast/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: "تعذّر التعميم", description: extractErrorDetail(data) });
      } else {
        const via = channel === "email" ? "بريداً" : "إشعاراً داخل المنصة";
        toast.success({
          title: "تم إرسال التعميم",
          description: `أُرسل ${via} إلى ${data.sent ?? 0} مستلم`,
        });
        setMessage("");
        setLink("");
        setSubject("");
      }
    } catch {
      toast.error({ title: "خطأ في الاتصال" });
    } finally {
      setBusy(false);
    }
  };

  const sendTestEmail = async () => {
    setTesting(true);
    try {
      const res = await authFetch("/api/notifications/test-email/", { method: "POST", body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error({ title: "فشل البريد التجريبي", description: extractErrorDetail(data) || data.detail });
      } else {
        toast.success({ title: "أُرسل البريد التجريبي", description: data.detail });
      }
    } catch {
      toast.error({ title: "خطأ في الاتصال" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">التعميم الداخلي</h1>
      <Card>
        <form onSubmit={(e) => void submit(e)} className="max-w-lg space-y-4">
          <Select label="المستلمون" value={role} onChange={(e) => setRole(e.target.value)}>
            {AUDIENCE.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="طريقة الإرسال"
            value={channel}
            onChange={(e) => setChannel(e.target.value as "in_app" | "email")}
          >
            <option value="in_app">إشعار في المنصة فقط</option>
            <option value="email">عبر البريد</option>
          </Select>
          {channel === "email" && (
            <Input
              label="موضوع البريد (اختياري)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="تعميم من منصة تكافل وأثر"
            />
          )}
          <Textarea
            label="الرسالة"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          {channel === "in_app" && (
            <>
              <Select label="النوع" value={kind} onChange={(e) => setKind(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {notificationTypeLabel(t)}
                  </option>
                ))}
              </Select>
              <Input
                label="رابط اختياري"
                dir="ltr"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/Admin/requests"
              />
            </>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "جاري الإرسال…" : "إرسال التعميم"}
          </Button>
        </form>
      </Card>

      <div className="mt-4 max-w-lg">
      <Card>
        <h2 className="mb-2 text-lg font-bold text-primary">تجربة البريد</h2>
        <p className="mb-3 text-sm text-brand-gray">
          يُرسل رسالة RTL قصيرة إلى بريدك للتحقق من إعدادات SMTP الرسمية.
        </p>
        <Button type="button" variant="secondary" disabled={testing} onClick={() => void sendTestEmail()}>
          {testing ? "جاري الإرسال…" : "إرسال بريد تجريبي"}
        </Button>
      </Card>
      </div>
    </AdminShell>
  );
}
