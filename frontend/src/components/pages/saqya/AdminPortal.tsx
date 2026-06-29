import { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import SaqyaShell from "../../layout/SaqyaShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Select from "../../ui/Select";
import Tabs from "../../ui/Tabs";
import SaqyaMap from "./SaqyaMap";
import type { MapPoint } from "./SaqyaMap";

interface Sponsorship { id: number; type: string; amount: string; status: string; donor_name: string; total_funded: number; }
interface Order { id: number; sponsorship_type: string; status: string; supplier_name: string | null; representative_name: string | null; }
interface Profile { id: number; user: number; name: string; business_name?: string; }

const TABS = [{ key: "sponsorships", label: "الكفالات" }, { key: "orders", label: "الطلبات" }, { key: "map", label: "الخريطة" }];
const SP_STATUS: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمدة", rejected: "مرفوضة", in_progress: "قيد التنفيذ", completed: "مكتملة" };

export default function AdminPortal() {
  const { success, error } = useToast();
  const [tab, setTab] = useState("sponsorships");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Profile[]>([]);
  const [reps, setReps] = useState<Profile[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);

  const j = (p: string) => authFetch(p).then((r) => (r.ok ? r.json() : null));

  const load = () => {
    j("/api/saqya/dashboard/").then((d) => d && setStats(d));
    j("/api/saqya/sponsorships/").then((d) => d && setSponsorships(d.results || d));
    j("/api/saqya/orders/").then((d) => d && setOrders(d.results || d));
    j("/api/saqya/suppliers/").then((d) => d && setSuppliers(d.results || d));
    j("/api/saqya/representatives/").then((d) => d && setReps(d.results || d));
    j("/api/saqya/map/").then((d) => d && setPoints(d.points || []));
  };
  useEffect(load, []);

  const spAct = async (id: number, a: "approve" | "reject") => {
    const res = await authFetch(`/api/saqya/sponsorships/${id}/${a}/`, { method: "POST", body: JSON.stringify({}) });
    if (res.ok) { success({ title: a === "approve" ? "تم الاعتماد" : "تم الرفض" }); load(); } else error({ title: "تعذّر التنفيذ" });
  };

  const assign = async (orderId: number, supplierId: string, repId: string) => {
    const res = await authFetch(`/api/saqya/orders/${orderId}/assign/`, {
      method: "POST", body: JSON.stringify({ supplier_id: supplierId || null, representative_id: repId || null }),
    });
    if (res.ok) { success({ title: "تم الإسناد" }); load(); } else error({ title: "تعذّر الإسناد" });
  };

  const kpis = [
    { label: "إجمالي الكفالات", value: stats.total_sponsorships ?? 0 },
    { label: "قيد التنفيذ", value: stats.active ?? 0 },
    { label: "مكتملة", value: stats.completed ?? 0 },
    { label: "قيد المراجعة", value: stats.pending ?? 0 },
    { label: "إجمالي التمويل", value: Math.round(stats.total_funded ?? 0) },
  ];

  return (
    <SaqyaShell>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}><div className="text-center"><div className="text-2xl font-extrabold text-primary">{k.value.toLocaleString("en-US")}</div><div className="mt-1 text-xs text-brand-gray">{k.label}</div></div></Card>
        ))}
      </div>

      <div className="mb-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === "sponsorships" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sponsorships.map((s) => (
            <Card key={s.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">{s.type} — {Number(s.amount).toLocaleString("en-US")} ر.س</h3>
                <Badge variant={s.status === "completed" ? "success" : s.status === "rejected" ? "danger" : "warning"}>{SP_STATUS[s.status] || s.status}</Badge>
              </div>
              <p className="mb-2 text-xs text-brand-gray">المتبرّع: {s.donor_name} · مموّل: {s.total_funded}</p>
              {s.status === "pending" && (
                <div className="flex gap-2"><Button onClick={() => spAct(s.id, "approve")}>اعتماد</Button><Button variant="secondary" onClick={() => spAct(s.id, "reject")}>رفض</Button></div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <Card key={o.id}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-primary">طلب #{o.id} — {o.sponsorship_type}</h3>
                <Badge variant="primary">{o.status}</Badge>
              </div>
              <p className="mb-2 text-xs text-brand-gray">مورّد: {o.supplier_name || "—"} · مندوب: {o.representative_name || "—"}</p>
              {(o.status === "pending" || o.status === "assigned") && (
                <AssignRow suppliers={suppliers} reps={reps} onAssign={(s, r) => assign(o.id, s, r)} />
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === "map" && <SaqyaMap points={points} />}
    </SaqyaShell>
  );
}

function AssignRow({ suppliers, reps, onAssign }: { suppliers: Profile[]; reps: Profile[]; onAssign: (s: string, r: string) => void }) {
  const [s, setS] = useState("");
  const [r, setR] = useState("");
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Select value={s} onChange={(e) => setS(e.target.value)}><option value="">المورّد</option>{suppliers.map((x) => <option key={x.id} value={x.user}>{x.business_name || x.name}</option>)}</Select>
      <Select value={r} onChange={(e) => setR(e.target.value)}><option value="">المندوب</option>{reps.map((x) => <option key={x.id} value={x.user}>{x.name}</option>)}</Select>
      <Button onClick={() => onAssign(s, r)}>إسناد</Button>
    </div>
  );
}
