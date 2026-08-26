import { useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import DataTable from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import { LoadingState, ErrorState, EmptyState } from "../../feedback/PageStates";
import { authFetch } from "../../../lib/api";
import { ACTION_AR, ACTION_OPTIONS, activityQuery, type ActivityFilters } from "../../../admin/activityLog";
import { labelAr } from "../../../i18n/labels";

interface Row {
  id: number;
  actor: number | null;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  summary: string;
  created_at: string;
}

interface Paginated {
  count: number;
  results: Row[];
}

const empty: ActivityFilters = { actor: "", action: "", date_from: "", date_to: "" };

/** سجل النشاط — قراءة فقط. */
export default function ActivityLogAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActivityFilters>(empty);
  const [applied, setApplied] = useState<ActivityFilters>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async (p = page, f = applied) => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(`/api/activity-logs/?${activityQuery(f, p)}`);
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
    void load(page, applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, applied]);

  const columns: Column<Row>[] = [
    { key: "created_at", header: "الوقت", render: (r) => r.created_at.slice(0, 16).replace("T", " ") },
    { key: "actor_email", header: "المنفّذ", render: (r) => r.actor_email || "—" },
    { key: "action", header: "الإجراء", render: (r) => labelAr(ACTION_AR, r.action) },
    { key: "target_type", header: "الهدف", render: (r) => (r.target_type ? `${r.target_type} #${r.target_id}` : "—") },
    { key: "summary", header: "الملخص" },
  ];

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">سجل النشاط</h1>
      <Card className="mb-4">
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setApplied({ ...filters });
          }}
        >
          <Input label="معرّف المنفّذ" value={filters.actor} onChange={(e) => setFilters({ ...filters, actor: e.target.value })} />
          <Select label="الإجراء" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">الكل</option>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Input type="date" label="من تاريخ" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          <Input type="date" label="إلى تاريخ" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          <div className="flex items-end">
            <Button type="submit">تصفية</Button>
          </div>
        </form>
      </Card>
      {loading && <LoadingState />}
      {error && <ErrorState message="تعذّر تحميل السجل" />}
      {!loading && !error && rows.length === 0 && <EmptyState title="لا توجد أحداث" />}
      {!loading && !error && rows.length > 0 && (
        <Card>
          <DataTable columns={columns} rows={rows} />
          <div className="mt-3 flex items-center justify-between text-sm text-brand-gray">
            <span>{count} حدث</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
              <Button type="button" variant="secondary" disabled={page * 25 >= count} onClick={() => setPage((p) => p + 1)}>التالي</Button>
            </div>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
