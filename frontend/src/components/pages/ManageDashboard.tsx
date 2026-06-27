import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";

const STAFF_ROLES = ["admin", "manager", "employee"];
type Employee = { id: number; name: string };

export default function ManageDashboard() {
  const { access, user } = useAuth();
  const { success, error } = useToast();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [section, setSection] = useState({ title: "", unit: "نشاطًا", total: "", actual: "", expected: "", closed: "", in_progress: "", near: "", late: "", review: "", not_started: "" });
  const [employee, setEmployee] = useState({ name: "", role: "", completed_tasks: "", progress: "" });
  const [task, setTask] = useState({ title: "", initiative: "", completed_date: "", progress: "", employee: "" });

  useEffect(() => {
    if (!isStaff) return;
    fetch(`${API_BASE_URL}/api/dashboard/employees/`).then((r) => (r.ok ? r.json() : [])).then((d) => setEmployees(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isStaff]);

  const num = (v: string) => (v === "" ? 0 : Number(v));
  const post = async (path: string, body: Record<string, unknown>, ok: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/${path}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { error({ title: "تعذّر الحفظ", description: "تحقّق من الصلاحية والحقول" }); return false; }
      success({ title: ok });
      return true;
    } catch { error({ title: "خطأ في الاتصال" }); return false; }
  };

  if (!isStaff) {
    return (
      <div className="page-shell p-10 text-center">
        <Card>
          <h2 className="mb-2 text-xl font-bold text-primary">صلاحية مطلوبة</h2>
          <p className="text-brand-gray">هذه الشاشة مخصّصة لطاقم الإدارة. الرجاء تسجيل الدخول بحساب موظف/مشرف.</p>
          <Link to="/signin" className="mt-4 inline-block"><Button>تسجيل الدخول</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="px-6 py-8 text-white" style={{ background: "linear-gradient(to left, var(--tmkeen-primary), var(--tmkeen-secondary))" }}>
        <div className="mx-auto flex max-w-page items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">تغذية اللوحة التنفيذية</h1>
            <p className="mt-2" style={{ opacity: 0.9 }}>إضافة أقسام وموظفين ومهام منجزة — {user?.name}</p>
          </div>
          <Link to="/executive" className="rounded-lg px-4 py-2 font-bold text-white" style={{ background: "rgba(255,255,255,.15)" }}>عرض اللوحة</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-page gap-6 px-4 py-8 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-primary">إضافة بطاقة قسم</h2>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const ok = await post("sections", { title: section.title, unit: section.unit, total: num(section.total), actual: num(section.actual), expected: num(section.expected), closed: num(section.closed), in_progress: num(section.in_progress), near: num(section.near), late: num(section.late), review: num(section.review), not_started: num(section.not_started) }, "تم حفظ بطاقة القسم بنجاح");
            if (ok) setSection({ title: "", unit: "نشاطًا", total: "", actual: "", expected: "", closed: "", in_progress: "", near: "", late: "", review: "", not_started: "" });
          }}>
            <Input label="القسم" value={section.title} onChange={(e) => setSection({ ...section, title: e.target.value })} />
            <Input label="الوحدة" value={section.unit} onChange={(e) => setSection({ ...section, unit: e.target.value })} />
            <Input type="number" label="الإجمالي" value={section.total} onChange={(e) => setSection({ ...section, total: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" label="الواقع %" value={section.actual} onChange={(e) => setSection({ ...section, actual: e.target.value })} />
              <Input type="number" label="المفترض %" value={section.expected} onChange={(e) => setSection({ ...section, expected: e.target.value })} />
              <Input type="number" label="مغلق" value={section.closed} onChange={(e) => setSection({ ...section, closed: e.target.value })} />
              <Input type="number" label="قيد التنفيذ" value={section.in_progress} onChange={(e) => setSection({ ...section, in_progress: e.target.value })} />
              <Input type="number" label="قريب" value={section.near} onChange={(e) => setSection({ ...section, near: e.target.value })} />
              <Input type="number" label="متأخر" value={section.late} onChange={(e) => setSection({ ...section, late: e.target.value })} />
              <Input type="number" label="تحت المراجعة" value={section.review} onChange={(e) => setSection({ ...section, review: e.target.value })} />
              <Input type="number" label="لم يحن" value={section.not_started} onChange={(e) => setSection({ ...section, not_started: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">حفظ القسم</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-primary">إضافة أداء موظف</h2>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const ok = await post("employees", { name: employee.name, role: employee.role, completed_tasks: num(employee.completed_tasks), progress: num(employee.progress) }, "تم حفظ الموظف بنجاح");
            if (ok) setEmployee({ name: "", role: "", completed_tasks: "", progress: "" });
          }}>
            <Input label="اسم الموظف" value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} />
            <Input label="المسمى" value={employee.role} onChange={(e) => setEmployee({ ...employee, role: e.target.value })} />
            <Input type="number" label="المهام المنجزة" value={employee.completed_tasks} onChange={(e) => setEmployee({ ...employee, completed_tasks: e.target.value })} />
            <Input type="number" label="مستوى التقدم %" value={employee.progress} onChange={(e) => setEmployee({ ...employee, progress: e.target.value })} />
            <Button type="submit" className="w-full">حفظ الموظف</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-primary">إضافة مهمة منجزة</h2>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const ok = await post("staff-tasks", { title: task.title, initiative: task.initiative, completed_date: task.completed_date || null, progress: num(task.progress), employee: task.employee ? Number(task.employee) : null }, "تم حفظ المهمة بنجاح");
            if (ok) setTask({ title: "", initiative: "", completed_date: "", progress: "", employee: "" });
          }}>
            <Input label="اسم المهمة" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
            <Input label="المبادرة" value={task.initiative} onChange={(e) => setTask({ ...task, initiative: e.target.value })} />
            <Input type="date" label="تاريخ الإنجاز" value={task.completed_date} onChange={(e) => setTask({ ...task, completed_date: e.target.value })} />
            <Input type="number" label="التقدم %" value={task.progress} onChange={(e) => setTask({ ...task, progress: e.target.value })} />
            <Select label="المسؤول" value={task.employee} onChange={(e) => setTask({ ...task, employee: e.target.value })}>
              <option value="">— اختياري —</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </Select>
            <Button type="submit" className="w-full">حفظ المهمة</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
