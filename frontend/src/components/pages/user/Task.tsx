import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { API_BASE_URL } from "../../../config";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Tabs from "../../ui/Tabs";
import ProgressBar from "../../ui/ProgressBar";

interface Subtask { id?: number; title: string; completed: boolean }
interface Task {
  id: number; title: string; description: string; status: string;
  project_name: string; progress: number; subtasks: Subtask[];
}

const TABS = [
  { key: "قيد التنفيذ", label: "قيد التنفيذ" },
  { key: "في الانتظار", label: "جديدة" },
  { key: "معلقة", label: "معلقة" },
  { key: "مكتملة", label: "مكتملة" },
  { key: "ملغاة", label: "ملغية" },
];

export default function UserTasks() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState("قيد التنفيذ");
  const authHeaders = { Authorization: `Bearer ${access}` };

  const load = () => {
    fetch(`${API_BASE_URL}/api/user/my-tasks/`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTasks((d.results || []).map((t: Task) => ({ ...t, subtasks: t.subtasks || [] }))))
      .catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(); }, [access]);

  const toggleSub = (taskId: number, idx: number) => {
    setTasks((prev) => prev.map((t) => t.id === taskId
      ? { ...t, subtasks: t.subtasks.map((s, i) => (i === idx ? { ...s, completed: !s.completed } : s)) }
      : t));
  };

  const saveTask = async (task: Task) => {
    const total = task.subtasks.length;
    const done = task.subtasks.filter((s) => s.completed).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : task.progress;
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/tasks/${task.id}/update-progress/`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ progress, subtasks: task.subtasks.map((s) => ({ text: s.title, done: s.completed })) }),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم حفظ التقدّم", description: task.title });
      load();
    } catch { error({ title: "خطأ", description: "تعذّر حفظ التقدّم" }); }
  };

  const withdraw = async (task: Task) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/tasks/${task.id}/withdraw/`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" } });
      if (!res.ok) throw new Error();
      success({ title: "تم الانسحاب", description: task.title });
      load();
    } catch { error({ title: "خطأ", description: "تعذّر الانسحاب" }); }
  };

  const filtered = tasks.filter((t) => t.status === tab);

  return (
    <UserShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">مهامي</h1>
      <div className="mb-6"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card><p className="text-center text-sm text-brand-gray">لا توجد مهام في هذه الحالة.</p></Card>
        ) : (
          filtered.map((task) => (
            <Card key={task.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary">{task.title}</h3>
                <Badge variant="primary">{task.project_name}</Badge>
              </div>
              <p className="mb-3 text-sm text-brand-gray">{task.description}</p>
              <div className="mb-3"><span className="me-2 text-sm">{task.progress}%</span><ProgressBar value={task.progress} /></div>
              {task.subtasks.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {task.subtasks.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={s.completed} onChange={() => toggleSub(task.id, i)} disabled={task.status === "مكتملة" || task.status === "ملغاة"} />
                      <span style={{ textDecoration: s.completed ? "line-through" : "none", color: "var(--tmkeen-brand-gray)" }}>{s.title}</span>
                    </li>
                  ))}
                </ul>
              )}
              {task.status !== "مكتملة" && task.status !== "ملغاة" && (
                <div className="flex gap-2">
                  <Button onClick={() => saveTask(task)}>حفظ التقدّم</Button>
                  <Button variant="secondary" onClick={() => withdraw(task)}>انسحاب</Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </UserShell>
  );
}
