import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { API_BASE_URL } from "../../../config";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Button from "../../ui/Button";

interface Suggestion { id: number; title: string; description: string; submitted_by: string; created_at: string; is_reviewed: boolean }

export default function ProjectIdeas() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState<Suggestion[]>([]);
  const authHeaders = { Authorization: `Bearer ${access}` };

  const load = () => {
    fetch(`${API_BASE_URL}/api/suggestions/`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(); }, [access]);

  const markReviewed = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/suggestions/${id}/`, { method: "PATCH", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ is_reviewed: true }) });
      if (!res.ok) throw new Error();
      success({ title: "تم وضع علامة كمراجَع" }); load();
    } catch { error({ title: "خطأ", description: "تعذّر التحديث" }); }
  };
  const remove = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/suggestions/${id}/`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error();
      success({ title: "تم حذف الاقتراح" }); load();
    } catch { error({ title: "خطأ", description: "تعذّر الحذف" }); }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">أفكار المشاريع (الاقتراحات)</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد اقتراحات.</p></Card> :
          items.map((s) => (
            <Card key={s.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">{s.title}</h3>
                <Badge variant={s.is_reviewed ? "success" : "warning"}>{s.is_reviewed ? "تمت المراجعة" : "جديد"}</Badge>
              </div>
              <p className="mb-2 text-sm text-brand-gray">{s.description}</p>
              <p className="mb-3 text-xs text-brand-gray">{s.submitted_by}</p>
              <div className="flex gap-2">
                {!s.is_reviewed && <Button onClick={() => markReviewed(s.id)}>وضع كمراجَع</Button>}
                <Button variant="secondary" onClick={() => remove(s.id)}>حذف</Button>
              </div>
            </Card>
          ))}
      </div>
    </AdminShell>
  );
}
