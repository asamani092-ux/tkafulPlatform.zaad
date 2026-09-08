import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Modal from "../../ui/Modal";
import { LoadingState } from "../../feedback/PageStates";

interface Stats { volunteer_hours: number; rating: number; completed_tasks: number; points: number }
interface Opportunity { id: number; title: string; category: string; location: string; estimated_hours: number; organization: string }
interface UserTask { id: number; title: string; status: string; project_name: string; description: string }

/**
 * لوحة المتطوع: إحصائيات + فرص + مهام مُسندة (موصولة بـ /api/user/my-stats و my-tasks).
 * تعقيد التحميل: O(n) للمهام/الفرص.
 */
export default function UserMain() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [stats, setStats] = useState<Stats>({ volunteer_hours: 0, rating: 0, completed_tasks: 0, points: 0 });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState<Opportunity | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<UserTask | null>(null);

  const load = useCallback(async () => {
    if (!access) return;
    setLoading(true);
    try {
      const [statsRes, oppRes, tasksRes] = await Promise.all([
        authFetch(`/api/user/my-stats/`),
        authFetch(`/api/user/opportunities/`),
        authFetch(`/api/user/my-tasks/`),
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats({
          volunteer_hours: Number(d.volunteer_hours ?? 0),
          rating: Number(d.rating ?? 0),
          completed_tasks: Number(d.completed_tasks ?? 0),
          points: Number(d.points ?? 0),
        });
      }
      if (oppRes.ok) {
        const d = await oppRes.json();
        const list = Array.isArray(d) ? d : d.results || [];
        setOpportunities(list.map((p: Record<string, unknown>) => ({
          id: Number(p.id),
          title: String(p.title || p.desc || "فرصة تطوع"),
          category: String(p.category || "تطوّع"),
          location: String(p.location || "غير محدد"),
          estimated_hours: Number(p.estimated_hours || p.hours || 0),
          organization: String(p.organization || "منظمة تكافل"),
        })));
      }
      if (tasksRes.ok) {
        const d = await tasksRes.json();
        const list = Array.isArray(d) ? d : d.results || [];
        setTasks(
          list
            .map((t: Record<string, unknown>) => ({
              id: Number(t.id),
              title: String(t.title || ""),
              status: String(t.status || ""),
              project_name: String(t.project_name || t.project || ""),
              description: String(t.description || ""),
            }))
            .filter((t: UserTask) => t.status !== "مكتملة"),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [access]);

  useEffect(() => { void load(); }, [load]);

  const confirmApply = async () => {
    if (!applyTarget) return;
    try {
      const res = await authFetch(`/api/user/opportunities/${applyTarget.id}/apply/`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        success({ title: "تم تقديم طلبك بنجاح", description: applyTarget.title });
        void load();
      } else error({ title: "تعذّر التقديم", description: data.message || data.detail || "حاول مرة أخرى" });
    } catch { error({ title: "خطأ", description: "تعذّر تقديم الطلب" }); }
    setApplyTarget(null);
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    try {
      const res = await authFetch(`/api/user/tasks/${withdrawTarget.id}/withdraw/`, { method: "POST" });
      if (res.ok) {
        setTasks((p) => p.filter((t) => t.id !== withdrawTarget.id));
        success({ title: "تم الانسحاب بنجاح", description: withdrawTarget.title });
        void load();
      } else error({ title: "خطأ", description: "تعذّر الانسحاب" });
    } catch { error({ title: "خطأ", description: "تعذّر الانسحاب" }); }
    setWithdrawTarget(null);
  };

  const statCards = [
    { label: "ساعات تطوعية", value: stats.volunteer_hours },
    { label: "التقييم", value: typeof stats.rating === "number" ? stats.rating.toFixed(1) : stats.rating },
    { label: "مهام منجزة", value: stats.completed_tasks },
    { label: "نقاط المتطوع", value: stats.points },
  ];

  return (
    <UserShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-primary">إحصائيات المتطوع</h1>
        <Link to="/user/tasks" className="text-sm font-bold text-primary hover:underline">عرض كل مهامي ←</Link>
      </div>

      {loading ? (
        <LoadingState title="جاري تحميل إحصائياتك ومهامك…" />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((s) => (
              <Card key={s.label}>
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-primary">{s.value}</div>
                  <div className="mt-1 text-xs text-brand-gray">{s.label}</div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-xl font-bold text-primary">فرص تطوعية مقترحة</h2>
              <div className="space-y-3">
                {opportunities.length === 0 ? (
                  <Card><p className="text-center text-sm text-brand-gray">لا توجد فرص متاحة حالياً.</p></Card>
                ) : opportunities.map((o) => (
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
                {tasks.length === 0 ? (
                  <Card>
                    <p className="text-center text-sm text-brand-gray">
                      لا توجد مهام مُسندة لك حالياً. عند إسناد مهمة من الإدارة تظهر هنا وفي «مهامي».
                    </p>
                  </Card>
                ) : tasks.map((t) => (
                  <Card key={t.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-bold text-primary">{t.title}</h3>
                      <Badge variant="warning">{t.status}</Badge>
                    </div>
                    <p className="mb-3 text-xs text-brand-gray">{t.project_name || "—"}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link to="/user/tasks"><Button variant="secondary">إدارة التقدّم</Button></Link>
                      <Button variant="ghost" onClick={() => setWithdrawTarget(t)}>انسحاب</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <Modal open={!!applyTarget} onClose={() => setApplyTarget(null)} title="تأكيد التقدّم">
        <p className="mb-4 text-sm text-brand-gray">هل أنت متأكد من التقدّم لـ «{applyTarget?.title}»؟</p>
        <div className="flex gap-2">
          <Button onClick={confirmApply}>نعم، تأكيد</Button>
          <Button variant="secondary" onClick={() => setApplyTarget(null)}>إلغاء</Button>
        </div>
      </Modal>
      <Modal open={!!withdrawTarget} onClose={() => setWithdrawTarget(null)} title="تأكيد الانسحاب">
        <p className="mb-4 text-sm text-brand-gray">هل أنت متأكد من الانسحاب من «{withdrawTarget?.title}»؟</p>
        <div className="flex gap-2">
          <Button onClick={confirmWithdraw}>نعم، انسحاب</Button>
          <Button variant="secondary" onClick={() => setWithdrawTarget(null)}>إلغاء</Button>
        </div>
      </Modal>
    </UserShell>
  );
}
