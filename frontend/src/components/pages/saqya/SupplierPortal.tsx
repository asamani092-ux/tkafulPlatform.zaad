import { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { API_BASE_URL } from "../../../config";
import SaqyaShell from "../../layout/SaqyaShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";

interface Order { id: number; sponsorship_type: string; status: string; }

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار", assigned: "مُسند", preparing: "قيد التحضير",
  ready: "جاهز", delivered: "مُسلَّم", completed: "مكتمل", cancelled: "ملغى",
};

export default function SupplierPortal() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoiceFor, setInvoiceFor] = useState<Order | null>(null);
  const [inv, setInv] = useState({ invoice_number: "", amount: "", total_amount: "" });
  const [file, setFile] = useState<File | null>(null);

  const load = () => authFetch("/api/saqya/orders/").then((r) => (r.ok ? r.json() : null)).then((d) => d && setOrders(d.results || d)).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (id: number, a: string) => {
    const res = await authFetch(`/api/saqya/orders/${id}/${a}/`, { method: "POST" });
    if (res.ok) { success({ title: "تم التحديث" }); load(); } else error({ title: "تعذّر التحديث" });
  };

  const submitInvoice = async () => {
    if (!invoiceFor) return;
    const fd = new FormData();
    fd.append("order", String(invoiceFor.id));
    fd.append("invoice_number", inv.invoice_number);
    fd.append("amount", inv.amount);
    fd.append("total_amount", inv.total_amount || inv.amount);
    if (file) fd.append("file", file);
    // FormData: لا نضبط Content-Type يدوياً
    const res = await fetch(`${API_BASE_URL}/api/saqya/invoices/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      body: fd,
    });
    if (res.ok) { success({ title: "تم رفع الفاتورة" }); setInvoiceFor(null); setInv({ invoice_number: "", amount: "", total_amount: "" }); setFile(null); }
    else error({ title: "تعذّر رفع الفاتورة" });
  };

  return (
    <SaqyaShell>
      <h2 className="mb-4 text-xl font-bold text-primary">طلبات التوريد المسندة</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {orders.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد طلبات مسندة.</p></Card> :
          orders.map((o) => (
            <Card key={o.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">طلب #{o.id} — {o.sponsorship_type}</h3>
                <Badge variant="primary">{STATUS_AR[o.status] || o.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {o.status === "assigned" && <Button onClick={() => act(o.id, "prepare")}>بدء التحضير</Button>}
                {o.status === "preparing" && <Button onClick={() => act(o.id, "ready")}>جاهز للتسليم</Button>}
                <Button variant="secondary" onClick={() => setInvoiceFor(o)}>رفع فاتورة</Button>
              </div>
            </Card>
          ))}
      </div>

      <Modal open={!!invoiceFor} onClose={() => setInvoiceFor(null)} title="رفع فاتورة">
        <div className="space-y-3">
          <Input label="رقم الفاتورة" value={inv.invoice_number} onChange={(e) => setInv({ ...inv, invoice_number: e.target.value })} />
          <Input type="number" label="المبلغ" value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })} />
          <Input type="number" label="الإجمالي" value={inv.total_amount} onChange={(e) => setInv({ ...inv, total_amount: e.target.value })} />
          <div>
            <label className="label-field">ملف الفاتورة</label>
            <input type="file" className="input-field" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex gap-2"><Button onClick={submitInvoice}>رفع</Button><Button variant="secondary" onClick={() => setInvoiceFor(null)}>إلغاء</Button></div>
        </div>
      </Modal>
    </SaqyaShell>
  );
}
