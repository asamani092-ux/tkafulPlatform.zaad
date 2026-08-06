import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Button from "../../ui/Button";
import Tabs from "../../ui/Tabs";
import Breadcrumb from "../../ui/Breadcrumb";
import BeneficiaryCard from "../../ui/BeneficiaryCard";
import { EmptyState } from "../../feedback/PageStates";
import Skeleton from "../../ui/Skeleton";

interface ServiceRequest { id: number; service_title: string; beneficiary_name: string; beneficiary_contact: string; details: string; status: string }

const TABS = [
  { key: "", label: "الكل" },
  { key: "PENDING", label: "قيد المراجعة" },
  { key: "APPROVED", label: "مقبولة" },
  { key: "DONE", label: "منجزة" },
];
const statusLabel: Record<string, string> = { PENDING: "قيد المراجعة", APPROVED: "مقبول", REJECTED: "مرفوض", DONE: "منجز" };

export default function ServiceRequests() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [tab, setTab] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (status: string) => {
    setLoading(true);
    const url = status ? `/api/service-requests/?status=${status}` : `/api/service-requests/`;
    authFetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (access) load(tab); }, [tab, access]);

  const act = async (id: number, action: "approve" | "reject" | "mark_done") => {
    try {
      const res = await authFetch(`/api/service-requests/${id}/${action}/`, { method: "POST" });
      if (!res.ok) throw new Error();
      success({ title: "تم تنفيذ العملية بنجاح" });
      load(tab);
    } catch { error({ title: "خطأ", description: "تعذّر تنفيذ العملية" }); }
  };

  return (
    <AdminShell>
      <Breadcrumb items={[{ label: "الإدارة", href: "/Admin" }, { label: "طلبات الخدمات" }]} />
      <h1 className="mb-4 text-2xl font-bold text-primary">طلبات الخدمات</h1>
      <div className="mb-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
      {loading ? (
        <Skeleton lines={4} height="var(--space-16)" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.length === 0 ? (
            <EmptyState title="لا توجد طلبات" message="ستظهر طلبات الخدمات هنا بعد استقبالها." />
          ) : (
            items.map((r) => (
              <BeneficiaryCard
                key={r.id}
                name={r.beneficiary_name}
                contact={`${r.service_title} · ${r.beneficiary_contact}`}
                details={r.details}
                status={statusLabel[r.status] || r.status}
                statusTone={r.status === "DONE" || r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}
                actions={r.status === "PENDING" ? (
                  <>
                    <Button onClick={() => act(r.id, "approve")}>قبول</Button>
                    <Button variant="secondary" onClick={() => act(r.id, "reject")}>رفض</Button>
                    <Button variant="secondary" onClick={() => act(r.id, "mark_done")}>إنجاز</Button>
                  </>
                ) : undefined}
              />
            ))
          )}
        </div>
      )}
    </AdminShell>
  );
}
