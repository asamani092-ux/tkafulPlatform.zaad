import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import KpiCard from "../../ui/KpiCard";
import ConfirmDialog from "../../ui/ConfirmDialog";
import TaskCard from "../../ui/TaskCard";
import { EmptyState } from "../../feedback/PageStates";

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

  useEffect(() => {
    if (!access) return;
    authFetch(`/api/user/my-stats/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    authFetch(`/api/user/opportunities/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setOpportunities((d.results || []).map((p: Record<string, unknown>) => ({ id: p.id, title: p.title || p.desc, category: p.category || "تطوّع", location: p.location || "غير محدد", estimated_hours: p.estimated_hours || 0, organization: p.organization || "منظمة تكافل" })))).catch(() => {});
    authFetch(`/api/user/my-tasks/`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setTasks((d.results || []).filter((t: UserTask) => t.status !== "مكتملة"))).catch(() => {});
  }, [access]);

  const confirmApply = async () => {
    if (!applyTarget) return;
    try {
      const res = await authFetch(`/api/user/opportunities/${applyTarget.id}/apply/`, { method: "POST" });
      const data = await res.json();
      if (res.ok) success({ title: "تم تقديم طلبك بنجاح", description: applyTarget.title });
      else error({ title: "تعذّر التقديم", description: data.message || "حاول مرة أخرى" });
    } catch { error({ title: "خطأ", description: "تعذّر تقديم الطلب" }); }
    setApplyTarget(null);
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    try {
      const res = await authFetch(`/api/user/tasks/${withdrawTarget.id}/withdraw/`, { method: "POST" });
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
          <KpiCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-bold text-primary">فرص تطوعية مقترحة</h2>
          <div className="space-y-3">
            {opportunities.length === 0 ? (
              <EmptyState title="لا توجد فرص متاحة حاليًا." />
            ) : (
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
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-bold text-primary">المهام الحالية</h2>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <EmptyState title="لا توجد مهام مُسندة لك حاليًا." />
            ) : (
              tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  title={t.title}
                  status={t.status}
                  projectName={t.project_name}
                  actions={<Button variant="secondary" onClick={() => setWithdrawTarget(t)}>انسحاب</Button>}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!applyTarget}
        onClose={() => setApplyTarget(null)}
        onConfirm={confirmApply}
        title="تأكيد التقدّم"
        confirmLabel="نعم، تأكيد"
      >
        هل أنت متأكد من التقدّم لـ «{applyTarget?.title}»؟
      </ConfirmDialog>
      <ConfirmDialog
        open={!!withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={confirmWithdraw}
        title="تأكيد الانسحاب"
        confirmLabel="نعم، انسحاب"
        destructive
      >
        هل أنت متأكد من الانسحاب من «{withdrawTarget?.title}»؟
      </ConfirmDialog>
    </UserShell>
  );
}
