import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../config";

/**
 * شاشة تغذية اللوحة التنفيذية (مكافئ Index.html في المشروع الثاني GAS).
 * متاحة لطاقم الإدارة (admin / manager / employee) — تستخدم توكن JWT الموحّد.
 * التصميم معتمد على design-system (Tajawal + ألوان primary/surface).
 */

const FONT = "Tajawal, Tahoma, Arial, sans-serif";
const STAFF_ROLES = ["admin", "manager", "employee"];

type Employee = { id: number; name: string };

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-brand-gray">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-surface-border px-4 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );
}

export default function ManageDashboard() {
  const { access, user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // نماذج
  const [section, setSection] = useState({
    title: "", unit: "نشاطًا", total: "", actual: "", expected: "",
    closed: "", in_progress: "", near: "", late: "", review: "", not_started: "",
  });
  const [employee, setEmployee] = useState({ name: "", role: "", completed_tasks: "", progress: "" });
  const [task, setTask] = useState({ title: "", initiative: "", completed_date: "", progress: "", employee: "" });

  useEffect(() => {
    if (!isStaff) return;
    fetch(`${API_BASE_URL}/api/dashboard/employees/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [isStaff]);

  const post = async (path: string, body: Record<string, unknown>, okText: string) => {
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/${path}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMsg({ kind: "err", text: "تعذّر الحفظ — تحقّق من الصلاحية والحقول" });
        return false;
      }
      setMsg({ kind: "ok", text: okText });
      return true;
    } catch {
      setMsg({ kind: "err", text: "خطأ في الاتصال" });
      return false;
    }
  };

  const num = (v: string) => (v === "" ? 0 : Number(v));

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-surface-muted p-10 text-center" style={{ fontFamily: FONT }} dir="rtl">
        <div className="mx-auto max-w-md rounded-xl border-2 border-surface-border bg-surface p-6">
          <h2 className="mb-2 text-xl font-bold text-primary">صلاحية مطلوبة</h2>
          <p className="text-brand-gray">هذه الشاشة مخصّصة لطاقم الإدارة. الرجاء تسجيل الدخول بحساب موظف/مشرف.</p>
          <Link to="/signin" className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 font-bold text-white">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted" style={{ fontFamily: FONT }} dir="rtl">
      <header className="bg-gradient-to-l from-primary to-secondary px-6 py-8 text-white">
        <div className="mx-auto flex max-w-page items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">تغذية اللوحة التنفيذية</h1>
            <p className="mt-2 text-white/90">إضافة أقسام وموظفين ومهام منجزة — {user?.name}</p>
          </div>
          <Link to="/executive" className="rounded-lg bg-white/15 px-4 py-2 font-bold text-white ring-1 ring-white/30">
            عرض اللوحة ←
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-page space-y-6 px-4 py-8">
        {msg && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              msg.kind === "ok" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#991B1B]"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* بطاقة قسم */}
          <form
            className="rounded-xl border-2 border-surface-border bg-surface p-6 shadow-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await post("sections", {
                title: section.title, unit: section.unit, total: num(section.total),
                actual: num(section.actual), expected: num(section.expected),
                closed: num(section.closed), in_progress: num(section.in_progress),
                near: num(section.near), late: num(section.late),
                review: num(section.review), not_started: num(section.not_started),
              }, "تم حفظ بطاقة القسم بنجاح");
              if (ok) setSection({ title: "", unit: "نشاطًا", total: "", actual: "", expected: "", closed: "", in_progress: "", near: "", late: "", review: "", not_started: "" });
            }}
          >
            <h2 className="mb-4 text-lg font-bold text-primary">إضافة بطاقة قسم</h2>
            <div className="space-y-3">
              <Field label="القسم" value={section.title} onChange={(v) => setSection({ ...section, title: v })} />
              <Field label="الوحدة" value={section.unit} onChange={(v) => setSection({ ...section, unit: v })} />
              <Field label="الإجمالي" type="number" value={section.total} onChange={(v) => setSection({ ...section, total: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="الواقع %" type="number" value={section.actual} onChange={(v) => setSection({ ...section, actual: v })} />
                <Field label="المفترض %" type="number" value={section.expected} onChange={(v) => setSection({ ...section, expected: v })} />
                <Field label="مغلق" type="number" value={section.closed} onChange={(v) => setSection({ ...section, closed: v })} />
                <Field label="قيد التنفيذ" type="number" value={section.in_progress} onChange={(v) => setSection({ ...section, in_progress: v })} />
                <Field label="قريب" type="number" value={section.near} onChange={(v) => setSection({ ...section, near: v })} />
                <Field label="متأخر" type="number" value={section.late} onChange={(v) => setSection({ ...section, late: v })} />
                <Field label="تحت المراجعة" type="number" value={section.review} onChange={(v) => setSection({ ...section, review: v })} />
                <Field label="لم يحن" type="number" value={section.not_started} onChange={(v) => setSection({ ...section, not_started: v })} />
              </div>
              <button type="submit" className="w-full rounded-lg bg-primary px-6 py-2.5 font-bold text-white hover:bg-primary-dark">
                حفظ القسم
              </button>
            </div>
          </form>

          {/* أداء موظف */}
          <form
            className="rounded-xl border-2 border-surface-border bg-surface p-6 shadow-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await post("employees", {
                name: employee.name, role: employee.role,
                completed_tasks: num(employee.completed_tasks), progress: num(employee.progress),
              }, "تم حفظ الموظف بنجاح");
              if (ok) setEmployee({ name: "", role: "", completed_tasks: "", progress: "" });
            }}
          >
            <h2 className="mb-4 text-lg font-bold text-primary">إضافة أداء موظف</h2>
            <div className="space-y-3">
              <Field label="اسم الموظف" value={employee.name} onChange={(v) => setEmployee({ ...employee, name: v })} />
              <Field label="المسمى" value={employee.role} onChange={(v) => setEmployee({ ...employee, role: v })} />
              <Field label="المهام المنجزة" type="number" value={employee.completed_tasks} onChange={(v) => setEmployee({ ...employee, completed_tasks: v })} />
              <Field label="مستوى التقدم %" type="number" value={employee.progress} onChange={(v) => setEmployee({ ...employee, progress: v })} />
              <button type="submit" className="w-full rounded-lg bg-primary px-6 py-2.5 font-bold text-white hover:bg-primary-dark">
                حفظ الموظف
              </button>
            </div>
          </form>

          {/* مهمة منجزة */}
          <form
            className="rounded-xl border-2 border-surface-border bg-surface p-6 shadow-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await post("staff-tasks", {
                title: task.title, initiative: task.initiative,
                completed_date: task.completed_date || null, progress: num(task.progress),
                employee: task.employee ? Number(task.employee) : null,
              }, "تم حفظ المهمة بنجاح");
              if (ok) setTask({ title: "", initiative: "", completed_date: "", progress: "", employee: "" });
            }}
          >
            <h2 className="mb-4 text-lg font-bold text-primary">إضافة مهمة منجزة</h2>
            <div className="space-y-3">
              <Field label="اسم المهمة" value={task.title} onChange={(v) => setTask({ ...task, title: v })} />
              <Field label="المبادرة" value={task.initiative} onChange={(v) => setTask({ ...task, initiative: v })} />
              <Field label="تاريخ الإنجاز" type="date" value={task.completed_date} onChange={(v) => setTask({ ...task, completed_date: v })} />
              <Field label="التقدم %" type="number" value={task.progress} onChange={(v) => setTask({ ...task, progress: v })} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-brand-gray">المسؤول</span>
                <select
                  value={task.employee}
                  onChange={(e) => setTask({ ...task, employee: e.target.value })}
                  className="w-full rounded-lg border border-surface-border px-4 py-2.5 outline-none focus:border-primary"
                >
                  <option value="">— اختياري —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="w-full rounded-lg bg-primary px-6 py-2.5 font-bold text-white hover:bg-primary-dark">
                حفظ المهمة
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
