import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Button from "../../ui/Button";

interface Req { id: number; name: string; email: string; phone: string; location: string; qualification: string; skills: string[] }

export default function VolunteerRequests() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState<Req[]>([]);

  const load = () => {
    authFetch(`/api/admin/volunteer-requests/`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => d && setItems(d.results || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(); }, [access]);

  const act = async (id: number, action: "accept" | "reject") => {
    try {
      const res = await authFetch(`/api/admin/volunteer-requests/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error();
      success({ title: action === "accept" ? "تم قبول المتطوع" : "تم رفض الطلب" });
      load();
    } catch { error({ title: "خطأ", description: "تعذّر تنفيذ العملية" }); }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">طلبات انضمام المتطوعين</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد طلبات معلّقة.</p></Card> :
          items.map((r) => (
            <Card key={r.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">{r.name}</h3>
                <Badge variant="warning">بانتظار الموافقة</Badge>
              </div>
              <p className="text-xs text-brand-gray">{r.email} · {r.phone}</p>
              <p className="mb-1 text-xs text-brand-gray">{r.location} · {r.qualification}</p>
              {r.skills?.length > 0 && <div className="mb-3 mt-2 flex flex-wrap gap-1">{r.skills.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}</div>}
              <div className="flex gap-2">
                <Button onClick={() => act(r.id, "accept")}>قبول</Button>
                <Button variant="secondary" onClick={() => act(r.id, "reject")}>رفض</Button>
              </div>
            </Card>
          ))}
      </div>
    </AdminShell>
  );
}
