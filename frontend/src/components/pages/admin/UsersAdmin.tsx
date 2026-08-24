import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import DataTable from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { authFetch } from "../../../lib/api";
import { labelAr, PROFILE_ROLE_AR } from "../../../i18n/labels";

interface PlatformUser {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  is_approved: boolean;
  is_active: boolean;
  city: string;
  phone: string;
  date_joined: string | null;
}

/** إدارة المستخدمين — كل حسابات المنصّة بجميع الأدوار. */
export default function UsersAdmin() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    authFetch("/api/users/")
      .then(async (r) => {
        if (!r.ok) throw new Error("fetch");
        const d = await r.json();
        setUsers(Array.isArray(d) ? d : d.results || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const roles = useMemo(() => {
    const set = new Set(users.map((u) => u.role).filter(Boolean));
    return [...set].sort();
  }, [users]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!needle) return true;
      return [u.name, u.email, u.username, u.city, u.phone, u.role]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [users, q, roleFilter]);

  const cols: Column<PlatformUser>[] = [
    { key: "name", header: "الاسم", render: (r) => r.name || "—" },
    { key: "email", header: "البريد" },
    {
      key: "role",
      header: "الدور",
      render: (r) => <Badge variant="primary">{labelAr(PROFILE_ROLE_AR, r.role)}</Badge>,
    },
    {
      key: "is_approved",
      header: "الاعتماد",
      render: (r) => (
        <Badge variant={r.is_approved ? "success" : "warning"}>
          {r.is_approved ? "معتمد" : "بانتظار الاعتماد"}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "الحساب",
      render: (r) => (
        <Badge variant={r.is_active ? "success" : "danger"}>
          {r.is_active ? "نشط" : "موقوف"}
        </Badge>
      ),
    },
    { key: "city", header: "المدينة", render: (r) => r.city || "—" },
    {
      key: "id",
      header: "",
      render: (r) => (
        <Link className="text-xs font-bold text-primary hover:underline" to={`/Admin/projects`}>
          إضافة لمشروع (معرّف {r.id})
        </Link>
      ),
    },
  ];

  if (loading) return <AdminShell><LoadingState title="جاري تحميل المستخدمين…" /></AdminShell>;
  if (error) {
    return (
      <AdminShell>
        <ErrorState title="تعذّر تحميل المستخدمين" message="تحقّق من الاتصال أو صلاحية المشرف." />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">إدارة المستخدمين</h1>
      <p className="mb-4 text-sm text-brand-gray">
        كل حسابات المنصّة بجميع الأدوار ({users.length}) — متطوّعون، مشرفون، مدراء مشاريع، متبرّعون، مورّدون، مندوبون، كادر.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input label="بحث" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم، بريد، مدينة…" />
        <Select label="الدور" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">كل الأدوار</option>
          {roles.map((role) => (
            <option key={role} value={role}>{labelAr(PROFILE_ROLE_AR, role)}</option>
          ))}
        </Select>
        <Card className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-primary">{filtered.length}</div>
            <div className="text-xs text-brand-gray">نتيجة معروضة</div>
          </div>
        </Card>
      </div>

      <Card>
        <DataTable columns={cols} rows={filtered} />
      </Card>
    </AdminShell>
  );
}
