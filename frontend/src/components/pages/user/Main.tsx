import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { API_BASE_URL } from "../../../config";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Modal from "../../ui/Modal";

interface Stats { volunteer_hours: number; rating: number; completed_tasks: number; points: number }
interface Opportunity { id: number; title: string; category: string; location: string; estimated_hours: number; organization: string }
interface UserTask { id: number; title: string; status: string; project_name: string; description: string }

export default function UserMain() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [stats, setStats] = useState<Stats>({ volunteer_hours: 0, rating: 0, completed_tasks: 0, points: 0 });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [applyTarget, setApplyTarget] = useState<Opportunity | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<UserTask | null>(null);

  const authHeaders = { Authorization: `Bearer ${access}` };

  useEffect(() => {
    if (!access) return;
    fetch(`${API_BASE_URL}/api/user/my-stats/`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    fetch(`${API_BASE_URL}/api/user/opportunities/`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setOpportunities((d.results || []).map((p: Record<string, unknown>) => ({ id: p.id, title: p.title || p.desc, category: p.category || "تطوّع", location: p.location || "غير محدد", estimated_hours: p.estimated_hours || 0, organization: p.organization || "منظمة تكافل" })))).catch(() => {});
    fetch(`${API_BASE_URL}/api/user/my-tasks/`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setTasks((d.results || []).filter((t: UserTask) => t.status !== "مكتملة"))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const confirmApply = async () => {
    if (!applyTarget) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/opportunities/${applyTarget.id}/apply/`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" } });
      const data = await res.json();
      if (res.ok) success({ title: "تم تقديم طلبك بنجاح", description: applyTarget.title });
      else error({ title: "تعذّر التقديم", description: data.message || "حاول مرة أخرى" });
    } catch { error({ title: "خطأ", description: "تعذّر تقديم الطلب" }); }
    setApplyTarget(null);
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/tasks/${withdrawTarget.id}/withdraw/`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" } });
      if (res.ok) { setTasks((p) => p.filter((t) => t.id !== withdrawTarget.id)); success({ title: "تم الانسحاب بنجاح", description: withdrawTarget.title }); }
      else error({ title: "خطأ", description: "تعذّر الانسحاب" });
    } catch { error({ title: "خطأ", description: "تعذّر الانسحاب" }); }
    setWithdrawTarget(null);
  };

  const statCards = [
    { label: "ساعات تطوعية", value: stats.volunteer_hours },
    { label: "التقييم", value: stats.rating?.toFixed?.(1) ?? stats.rating },
    { label: "مهام منجزة", value: stats.completed_tasks },
    { label: "نقاط المتطوع", value: stats.points },
  ];

  return (
    <UserShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">إحصائيات المتطوع</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}><div className="text-center"><div className="text-3xl font-extrabold text-primary">{s.value}</div><div className="mt-1 text-xs text-brand-gray">{s.label}</div></div></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-bold text-primary">فرص تطوعية مقترحة</h2>
          <div className="space-y-3">
            {opportunities.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد فرص متاحة حاليًا.</p></Card> :
              opportunities.map((o) => (
                <Card key={o.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="primary">{o.category}</Badge>
                    <span className="text-xs text-brand-gray">{o.estimated_hours} ساعة</span>
                  </div>
                  <h3 className="mb-1 font-bold text-primary">{o.title}</h3>
                  <p className="mb-3 text-xs text-brand-gray">{o.organization} · {o.location}</p>
                  <Button onClick={() => setApplyTarget(o)}>التقدّم الآن</Button>
                </Card>
              ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-bold text-primary">المهام الحالية</h2>
          <div className="space-y-3">
            {tasks.length === 0 ? <Card><p className="text-center text-sm text-brand-gray">لا توجد مهام مُسندة لك حاليًا.</p></Card> :
              tasks.map((t) => (
                <Card key={t.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-bold text-primary">{t.title}</h3>
                    <Badge variant="warning">{t.status}</Badge>
                  </div>
                  <p className="mb-3 text-xs text-brand-gray">{t.project_name}</p>
                  <Button variant="secondary" onClick={() => setWithdrawTarget(t)}>انسحاب</Button>
                </Card>
              ))}
          </div>
        </div>
      </div>

      <Modal open={!!applyTarget} onClose={() => setApplyTarget(null)} title="تأكيد التقدّم">
        <p className="mb-4 text-sm text-brand-gray">هل أنت متأكد من التقدّم لـ «{applyTarget?.title}»؟</p>
        <div className="flex gap-2"><Button onClick={confirmApply}>نعم، تأكيد</Button><Button variant="secondary" onClick={() => setApplyTarget(null)}>إلغاء</Button></div>
      </Modal>
      <Modal open={!!withdrawTarget} onClose={() => setWithdrawTarget(null)} title="تأكيد الانسحاب">
        <p className="mb-4 text-sm text-brand-gray">هل أنت متأكد من الانسحاب من «{withdrawTarget?.title}»؟</p>
        <div className="flex gap-2"><Button onClick={confirmWithdraw}>نعم، انسحاب</Button><Button variant="secondary" onClick={() => setWithdrawTarget(null)}>إلغاء</Button></div>
      </Modal>
    </UserShell>
  );
}
