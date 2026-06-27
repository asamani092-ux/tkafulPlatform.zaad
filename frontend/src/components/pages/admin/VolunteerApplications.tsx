import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { API_BASE_URL } from "../../../config";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Button from "../../ui/Button";
import Tabs from "../../ui/Tabs";

interface Application { id: number; volunteer_name: string; volunteer_email: string; project_title: string; status: string; message: string }

const TABS = [
  { key: "قيد المراجعة", label: "قيد المراجعة" },
  { key: "مقبول", label: "مقبولة" },
  { key: "مرفوض", label: "مرفوضة" },
];

export default function VolunteerApplications() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState<Application[]>([]);
  const [tab, setTab] = useState("قيد المراجعة");
  const authHeaders = { Authorization: `Bearer ${access}` };

  const load = (status: string) => {
    fetch(`${API_BASE_URL}/api/admin/applications/?status=${encodeURIComponent(status)}`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null)).then((d) => d && setItems(d.results || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(tab); }, [tab, access]);

  const act = async (id: number, action: "accept" | "reject") => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/applications/${id}/${action}/`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error();
      success({ title: action === "accept" ? "تم قبول الطلب وإنشاء مهمة" : "تم رفض الطلب" });
      load(tab);
    } catch { error({ title: "خطأ", description: "تعذّر تنفيذ العملية" }); }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">طلبات التطوع على المشاريع</h1>
      <div className="mb-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد طلبات.</p></Card> :
          items.map((a) => (
            <Card key={a.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">{a.volunteer_name}</h3>
                <Badge variant={a.status === "مقبول" ? "success" : a.status === "مرفوض" ? "danger" : "warning"}>{a.status}</Badge>
              </div>
              <p className="mb-1 text-xs text-brand-gray">{a.volunteer_email}</p>
              <p className="mb-3 text-sm text-brand-gray">المشروع: {a.project_title}</p>
              {a.status === "قيد المراجعة" && (
                <div className="flex gap-2">
                  <Button onClick={() => act(a.id, "accept")}>قبول</Button>
                  <Button variant="secondary" onClick={() => act(a.id, "reject")}>رفض</Button>
                </div>
              )}
            </Card>
          ))}
      </div>
    </AdminShell>
  );
}
