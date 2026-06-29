import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Button from "../../ui/Button";
import Tabs from "../../ui/Tabs";

interface ServiceRequest { id: number; service_title: string; beneficiary_name: string; beneficiary_contact: string; details: string; status: string }

const TABS = [
  { key: "", label: "الكل" },
  { key: "PENDING", label: "قيد المراجعة" },
  { key: "APPROVED", label: "مقبولة" },
  { key: "DONE", label: "منجزة" },
];
const statusLabel: Record<string, string> = { PENDING: "قيد المراجعة", APPROVED: "مقبول", REJECTED: "مرفوض", DONE: "منجز" };

export default function ServiceRequests() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [tab, setTab] = useState("");

  const load = (status: string) => {
    const url = status ? `/api/service-requests/?status=${status}` : `/api/service-requests/`;
    authFetch(url).then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(tab); }, [tab, access]);

  const act = async (id: number, action: "approve" | "reject" | "mark_done") => {
    try {
      const res = await authFetch(`/api/service-requests/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error();
      success({ title: "تم تنفيذ العملية بنجاح" });
      load(tab);
    } catch { error({ title: "خطأ", description: "تعذّر تنفيذ العملية" }); }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">طلبات الخدمات</h1>
      <div className="mb-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد طلبات.</p></Card> :
          items.map((r) => (
            <Card key={r.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">{r.service_title}</h3>
                <Badge variant={r.status === "DONE" || r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{statusLabel[r.status] || r.status}</Badge>
              </div>
              <p className="text-sm text-brand-gray">{r.beneficiary_name} · {r.beneficiary_contact}</p>
              {r.details && <p className="mb-3 mt-1 text-xs text-brand-gray">{r.details}</p>}
              {r.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button onClick={() => act(r.id, "approve")}>قبول</Button>
                  <Button variant="secondary" onClick={() => act(r.id, "reject")}>رفض</Button>
                  <Button variant="secondary" onClick={() => act(r.id, "mark_done")}>إنجاز</Button>
                </div>
              )}
            </Card>
          ))}
      </div>
    </AdminShell>
  );
}
