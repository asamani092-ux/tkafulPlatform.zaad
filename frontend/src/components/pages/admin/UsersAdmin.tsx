import { useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import DataTable from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import { LoadingState, ErrorState, EmptyState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { ROLE_AR, ROLE_OPTIONS, labelAr } from "../../../i18n/labels";
import { extractErrorDetail, type AdminUserRow } from "../../../admin/userManagement";

interface Paginated {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminUserRow[];
}

const emptyForm = { email: "", name: "", role: "user", password: "", is_active: true };

export default function UsersAdmin() {
  const toast = useToast();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<AdminUserRow | null>(null);
  const [del, setDel] = useState<AdminUserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(p) });
    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);
    if (status === "active") params.set("is_active", "true");
    if (status === "disabled") params.set("is_active", "false");
    try {
      const res = await authFetch(`/api/accounts/users/?${params.toString()}`);
      if (!res.ok) throw new Error("fetch");
      const data = (await res.json()) as Paginated;
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role, status]);

  const columns: Column<AdminUserRow>[] = [
      { key: "name", header: "الاسم", render: (r) => r.name || "—" },
      { key: "email", header: "البريد" },
      {
        key: "role",
        header: "الدور",
        render: (r) => <Badge>{labelAr(ROLE_AR, r.role)}</Badge>,
      },
      {
        key: "is_active",
        header: "الحالة",
        render: (r) => (
          <Badge variant={r.is_active ? "success" : "danger"}>{r.is_active ? "نشط" : "معطّل"}</Badge>
        ),
      },
      {
        key: "date_joined",
        header: "تاريخ الانضمام",
        render: (r) => (r.date_joined ? r.date_joined.slice(0, 10) : "—"),
      },
      {
        key: "actions",
        header: "إجراءات",
        render: (r) => (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="secondary" onClick={() => { setEdit(r); setForm({ ...emptyForm, email: r.email, name: r.name, role: r.role, is_active: r.is_active }); }}>تعديل</Button>
            <Button type="button" variant="secondary" onClick={() => void toggleActive(r)}>{r.is_active ? "تعطيل" : "تفعيل"}</Button>
            <Button type="button" variant="secondary" onClick={() => setDel(r)}>حذف</Button>
          </div>
        ),
      },
    ];

  const apiError = async (res: Response) => extractErrorDetail(await res.json().catch(() => null));

  const toggleActive = async (row: AdminUserRow) => {
    const res = await authFetch(`/api/accounts/users/${row.id}/set_active/`, {
      method: "POST",
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    if (!res.ok) {
      toast.error({ title: await apiError(res) });
      return;
    }
    toast.success({ title: row.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب" });
    void load();
  };

  const saveAdd = async () => {
    setBusy(true);
    try {
      const res = await authFetch("/api/accounts/users/", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          role: form.role,
          password: form.password,
        }),
      });
      if (!res.ok) {
        toast.error({ title: await apiError(res) });
        return;
      }
      toast.success({ title: "تم إنشاء المستخدم" });
      setAddOpen(false);
      setForm(emptyForm);
      void load(1);
      setPage(1);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      const res = await authFetch(`/api/accounts/users/${edit.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: form.name, role: form.role, is_active: form.is_active }),
      });
      if (!res.ok) {
        toast.error({ title: await apiError(res) });
        return;
      }
      toast.success({ title: "تم حفظ التعديلات" });
      setEdit(null);
      void load();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try {
      const res = await authFetch(`/api/accounts/users/${del.id}/`, { method: "DELETE" });
      if (!res.ok) {
        toast.error({ title: await apiError(res) });
        return;
      }
      toast.success({ title: "تم حذف المستخدم" });
      setDel(null);
      void load();
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(count / 25));

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">إدارة المستخدمين</h1>
        <Button type="button" onClick={() => { setForm(emptyForm); setAddOpen(true); }}>إضافة مستخدم</Button>
      </div>

      <Card>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); void load(1); } }}
            placeholder="الاسم أو البريد"
          />
          <Select label="الدور" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">كل الأدوار</option>
            {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="الحالة" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">الكل</option>
            <option value="active">نشط</option>
            <option value="disabled">معطّل</option>
          </Select>
        </div>
        <Button type="button" variant="secondary" className="mb-4" onClick={() => { setPage(1); void load(1); }}>تطبيق البحث</Button>

        {loading && <LoadingState title="جاري تحميل المستخدمين…" />}
        {error && <ErrorState title="تعذّر التحميل" message="تحقّق من الاتصال أو صلاحية المشرف." />}
        {!loading && !error && rows.length === 0 && <EmptyState title="لا يوجد مستخدمون" />}
        {!loading && !error && rows.length > 0 && <DataTable columns={columns} rows={rows} />}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-brand-gray">
            <span>الصفحة {page} من {pages} — {count} مستخدم</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
              <Button type="button" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة مستخدم">
        <div className="space-y-3">
          <Input label="البريد" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="الدور" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="كلمة المرور الأولية" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="button" disabled={busy} onClick={() => void saveAdd()}>{busy ? "جاري الحفظ…" : "إنشاء"}</Button>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="تعديل مستخدم">
        <div className="space-y-3">
          <Input label="البريد" dir="ltr" value={form.email} disabled />
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="الدور" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            نشط
          </label>
          <Button type="button" disabled={busy} onClick={() => void saveEdit()}>{busy ? "جاري الحفظ…" : "حفظ"}</Button>
        </div>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="تأكيد الحذف">
        <p className="mb-4 text-sm text-brand-gray">حذف {del?.name || del?.email}؟ لا يمكن التراجع. حذف حسابك أو آخر مشرف مرفوض.</p>
        <div className="flex gap-2">
          <Button type="button" disabled={busy} onClick={() => void confirmDelete()}>حذف</Button>
          <Button type="button" variant="secondary" onClick={() => setDel(null)}>إلغاء</Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
