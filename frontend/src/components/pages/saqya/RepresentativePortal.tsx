import { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { API_BASE_URL } from "../../../config";
import SaqyaShell from "../../layout/SaqyaShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";

interface Order { id: number; sponsorship_type: string; status: string; }

const STATUS_AR: Record<string, string> = {
  assigned: "مُسند", preparing: "قيد التحضير", ready: "جاهز",
  delivered: "مُسلَّم", completed: "مكتمل",
};

export default function RepresentativePortal() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [docFor, setDocFor] = useState<Order | null>(null);
  const [doc, setDoc] = useState({ type: "photo", title: "", latitude: "", longitude: "", location_name: "" });
  const [file, setFile] = useState<File | null>(null);

  const load = () => authFetch("/api/saqya/orders/").then((r) => (r.ok ? r.json() : null)).then((d) => d && setOrders(d.results || d)).catch(() => {});
  useEffect(() => { load(); }, []);

  const deliver = async (id: number) => {
    const res = await authFetch(`/api/saqya/orders/${id}/deliver/`, { method: "POST" });
    if (res.ok) { success({ title: "تم تسجيل التسليم" }); load(); } else error({ title: "تعذّر التحديث" });
  };

  const submitDoc = async () => {
    if (!docFor || !file) { error({ title: "الملف مطلوب" }); return; }
    const fd = new FormData();
    fd.append("order", String(docFor.id));
    fd.append("type", doc.type);
    fd.append("title", doc.title);
    if (doc.latitude) fd.append("latitude", doc.latitude);
    if (doc.longitude) fd.append("longitude", doc.longitude);
    if (doc.location_name) fd.append("location_name", doc.location_name);
    fd.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/saqya/documentation/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      body: fd,
    });
    if (res.ok) { success({ title: "تم رفع التوثيق" }); setDocFor(null); setFile(null); setDoc({ type: "photo", title: "", latitude: "", longitude: "", location_name: "" }); }
    else error({ title: "تعذّر رفع التوثيق" });
  };

  return (
    <SaqyaShell>
      <h2 className="mb-4 text-xl font-bold text-primary">مهامي الميدانية</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {orders.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد مهام مسندة.</p></Card> :
          orders.map((o) => (
            <Card key={o.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">طلب #{o.id} — {o.sponsorship_type}</h3>
                <Badge variant="primary">{STATUS_AR[o.status] || o.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {o.status === "ready" && <Button onClick={() => deliver(o.id)}>تأكيد التسليم</Button>}
                <Button variant="secondary" onClick={() => setDocFor(o)}>رفع توثيق</Button>
              </div>
            </Card>
          ))}
      </div>

      <Modal open={!!docFor} onClose={() => setDocFor(null)} title="رفع توثيق ميداني">
        <div className="space-y-3">
          <Select label="النوع" value={doc.type} onChange={(e) => setDoc({ ...doc, type: e.target.value })}>
            <option value="photo">صورة</option><option value="video">فيديو</option><option value="document">مستند</option><option value="receipt">إيصال</option>
          </Select>
          <Input label="العنوان" value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="خط العرض (lat)" value={doc.latitude} onChange={(e) => setDoc({ ...doc, latitude: e.target.value })} />
            <Input label="خط الطول (lng)" value={doc.longitude} onChange={(e) => setDoc({ ...doc, longitude: e.target.value })} />
          </div>
          <Input label="اسم الموقع" value={doc.location_name} onChange={(e) => setDoc({ ...doc, location_name: e.target.value })} />
          <div>
            <label className="label-field">الملف</label>
            <input type="file" className="input-field" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex gap-2"><Button onClick={submitDoc}>رفع</Button><Button variant="secondary" onClick={() => setDocFor(null)}>إلغاء</Button></div>
        </div>
      </Modal>
    </SaqyaShell>
  );
}
