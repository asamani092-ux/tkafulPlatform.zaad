import { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import SaqyaShell from "../../layout/SaqyaShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";
import ProgressBar from "../../ui/ProgressBar";

interface Sponsorship {
  id: number; amount: string; type: string; description: string; status: string;
  total_funded: number; remaining: number; is_fully_funded: boolean; beneficiaries_count: number;
}

const STATUS_AR: Record<string, string> = {
  pending: "قيد المراجعة", approved: "معتمدة", rejected: "مرفوضة",
  in_progress: "قيد التنفيذ", completed: "مكتملة", cancelled: "ملغاة",
};

export default function DonorPortal() {
  const { success, error } = useToast();
  const [items, setItems] = useState<Sponsorship[]>([]);
  const [form, setForm] = useState({ amount: "", type: "سقيا", description: "", beneficiaries_count: "1", location: "" });
  const [payTarget, setPayTarget] = useState<Sponsorship | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const load = () => {
    authFetch("/api/saqya/sponsorships/").then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setItems(d.results || d)).catch(() => {});
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch("/api/saqya/sponsorships/", {
      method: "POST",
      body: JSON.stringify({ ...form, amount: Number(form.amount), beneficiaries_count: Number(form.beneficiaries_count) }),
    });
    if (res.ok) { success({ title: "تم إنشاء الكفالة" }); setForm({ amount: "", type: "سقيا", description: "", beneficiaries_count: "1", location: "" }); load(); }
    else error({ title: "تعذّر الإنشاء" });
  };

  const pay = async () => {
    if (!payTarget) return;
    const res = await authFetch(`/api/saqya/sponsorships/${payTarget.id}/pay/`, {
      method: "POST", body: JSON.stringify({ amount: Number(payAmount), method: "online" }),
    });
    const data = await res.json();
    if (res.ok) { success({ title: "تم تسجيل الدفعة", description: `الحالة: ${STATUS_AR[data.status] || data.status}` }); }
    else error({ title: "تعذّر الدفع", description: data.detail });
    setPayTarget(null); setPayAmount(""); load();
  };

  return (
    <SaqyaShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-primary">إنشاء كفالة جديدة</h2>
          <form className="space-y-3" onSubmit={create}>
            <Input type="number" label="المبلغ المستهدف" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <Input label="نوع الكفالة" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
            <Input label="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input type="number" label="عدد المستفيدين" value={form.beneficiaries_count} onChange={(e) => setForm({ ...form, beneficiaries_count: e.target.value })} />
            <div>
              <label className="label-field">الوصف</label>
              <textarea className="input-field" style={{ resize: "none" }} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">إنشاء الكفالة</Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-primary">كفالاتي</h2>
          <div className="space-y-3">
            {items.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد كفالات بعد.</p></Card> :
              items.map((s) => {
                const pct = Number(s.amount) > 0 ? Math.round((s.total_funded / Number(s.amount)) * 100) : 0;
                return (
                  <Card key={s.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-bold text-primary">{s.type} — {Number(s.amount).toLocaleString("en-US")} ر.س</h3>
                      <Badge variant={s.status === "completed" ? "success" : s.status === "rejected" ? "danger" : "warning"}>{STATUS_AR[s.status] || s.status}</Badge>
                    </div>
                    <p className="mb-2 text-xs text-brand-gray">{s.description}</p>
                    <div className="mb-2"><span className="me-2 text-sm">مموّل {s.total_funded} / {Number(s.amount)} ({pct}%)</span><ProgressBar value={pct} /></div>
                    {!s.is_fully_funded && s.status !== "rejected" && s.status !== "completed" && (
                      <Button variant="secondary" onClick={() => { setPayTarget(s); setPayAmount(String(s.remaining)); }}>دفع</Button>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      </div>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="دفع للكفالة">
        <p className="mb-3 text-sm text-brand-gray">المتبقّي: {payTarget?.remaining} ر.س</p>
        <Input type="number" label="مبلغ الدفعة" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        <div className="mt-3 flex gap-2"><Button onClick={pay}>تأكيد الدفع</Button><Button variant="secondary" onClick={() => setPayTarget(null)}>إلغاء</Button></div>
      </Modal>
    </SaqyaShell>
  );
}
