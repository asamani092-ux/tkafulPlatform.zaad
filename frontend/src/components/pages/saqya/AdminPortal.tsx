import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { usePlatformSettings } from "../../../contexts/PlatformSettingsContext";
import { authFetch } from "../../../lib/api";
import SaqyaShell from "../../layout/SaqyaShell";
import { labelAr, ORDER_STATUS_AR, SPONSORSHIP_STATUS_AR } from "../../../i18n/labels";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Tabs from "../../ui/Tabs";
import SaqyaMap from "./SaqyaMap";
import type { MapPoint } from "./SaqyaMap";
import SponsorshipTypesPanel from "./SponsorshipTypesPanel";
import { EmptyState, LoadingState } from "../../feedback/PageStates";

interface Sponsorship { id: number; type: string; amount: string; status: string; donor_name: string; total_funded: number; }
interface Order { id: number; sponsorship_type: string; status: string; supplier_name: string | null; representative_name: string | null; }
interface Profile { id: number; user: number; name: string; business_name?: string; }

const BASE_TABS = [
  { key: "sponsorships", label: "الكفالات" },
  { key: "orders", label: "الطلبات" },
  { key: "map", label: "الخريطة" },
];

const ORDER_FLOW: Record<string, { next: string; label: string; adminOnly?: boolean }[]> = {
  assigned: [{ next: "prepare", label: "بدء التجهيز" }],
  preparing: [{ next: "ready", label: "جاهز للتسليم" }],
  ready: [{ next: "deliver", label: "تأكيد التسليم" }],
  delivered: [{ next: "complete", label: "إكمال الطلب", adminOnly: true }],
};

export default function AdminPortal({ projectSlug, embedded = false }: { projectSlug?: string; embedded?: boolean }) {
  const Shell = ({ children }: { children: ReactNode }) =>
    embedded ? <div>{children}</div> : <SaqyaShell>{children}</SaqyaShell>;
  const { success, error } = useToast();
  const tabs = projectSlug
    ? [
        { key: "sponsorships", label: "الكفالات" },
        { key: "types", label: "أنواع الكفالات" },
        { key: "orders", label: "الطلبات" },
        { key: "map", label: "الخريطة" },
      ]
    : BASE_TABS;
  const [tab, setTab] = useState("sponsorships");
  const [loading, setLoading] = useState(true);
  const scope = projectSlug ? `?project=${encodeURIComponent(projectSlug)}` : "";
  const [stats, setStats] = useState<Record<string, number>>({});
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Profile[]>([]);
  const [reps, setReps] = useState<Profile[]>([]);
  const [allowedSupplierIds, setAllowedSupplierIds] = useState<number[] | null>(null);
  const [allowedRepIds, setAllowedRepIds] = useState<number[] | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const { settings } = usePlatformSettings();
  const donorPolicy = settings.sponsorship_collect_donor_data || "name_optional";
  const [recordForm, setRecordForm] = useState({
    type: "كفالة عينية",
    kind: "individual",
    sponsor_name: "",
    units_target: "",
  });
  const [recording, setRecording] = useState(false);

  const j = (p: string) => authFetch(p).then((r) => (r.ok ? r.json() : null));

  const recordSponsorship = async () => {
    setRecording(true);
    try {
      const body: Record<string, unknown> = {
        type: recordForm.type,
        kind: recordForm.kind,
      };
      if (projectSlug) body.project = projectSlug;
      if (donorPolicy !== "none" && recordForm.sponsor_name.trim()) {
        body.sponsor_name = recordForm.sponsor_name.trim();
      }
      if (recordForm.kind === "community") {
        body.units_target = Number(recordForm.units_target) || 1;
        body.units_completed = 0;
      }
      const res = await authFetch("/api/saqya/sponsorships/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = typeof d.sponsor_name === "string" ? d.sponsor_name
          : typeof d.detail === "string" ? d.detail
          : "تحقق من الحقول";
        error({ title: "تعذّر التسجيل", description: msg });
        return;
      }
      success({ title: "تم تسجيل الكفالة" });
      setRecordForm({ type: "كفالة عينية", kind: "individual", sponsor_name: "", units_target: "" });
      load();
    } finally {
      setRecording(false);
    }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      j(`/api/saqya/dashboard/${scope}`).then((d) => d && setStats(d)),
      j(`/api/saqya/sponsorships/${scope}`).then((d) => d && setSponsorships(d.results || d)),
      j(`/api/saqya/orders/${scope}`).then((d) => d && setOrders(d.results || d)),
      j("/api/saqya/suppliers/").then((d) => d && setSuppliers(d.results || d)),
      j("/api/saqya/representatives/").then((d) => d && setReps(d.results || d)),
      j("/api/saqya/map/").then((d) => d && setPoints(d.points || [])),
      projectSlug
        ? j(`/api/platform/projects/`).then((d) => {
            const arr = d?.results || d || [];
            const proj = Array.isArray(arr)
              ? arr.find((x: { slug?: string }) => x.slug === projectSlug)
              : null;
            if (!proj) return;
            const sids = proj.allowed_supplier_ids;
            const rids = proj.allowed_representative_ids;
            setAllowedSupplierIds(Array.isArray(sids) && sids.length ? sids.map(Number) : null);
            setAllowedRepIds(Array.isArray(rids) && rids.length ? rids.map(Number) : null);
          })
        : Promise.resolve().then(() => {
            setAllowedSupplierIds(null);
            setAllowedRepIds(null);
          }),
    ]).finally(() => setLoading(false));
  };
  useEffect(load, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const spAct = async (id: number, a: "approve" | "reject") => {
    const res = await authFetch(`/api/saqya/sponsorships/${id}/${a}/`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (res.ok) {
      success({ title: a === "approve" ? "تم الاعتماد" : "تم الرفض" });
      load();
    } else error({ title: "تعذّر التنفيذ" });
  };

  const assign = async (orderId: number, supplierId: string, repId: string) => {
    const res = await authFetch(`/api/saqya/orders/${orderId}/assign/`, {
      method: "POST",
      body: JSON.stringify({
        supplier_id: supplierId || null,
        representative_id: repId || null,
      }),
    });
    if (res.ok) {
      success({ title: "تم الإسناد" });
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      error({ title: "تعذّر الإسناد", description: d.detail || "تحقّق من نطاق المشروع" });
    }
  };

  const orderAct = async (orderId: number, action: string, label: string) => {
    const res = await authFetch(`/api/saqya/orders/${orderId}/${action}/`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (res.ok) {
      success({ title: label });
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      error({ title: "تعذّر تنفيذ الخطوة", description: d.detail || label });
    }
  };

  const assignableSuppliers = allowedSupplierIds
    ? suppliers.filter((x) => allowedSupplierIds.includes(x.user))
    : suppliers;
  const assignableReps = allowedRepIds
    ? reps.filter((x) => allowedRepIds.includes(x.user))
    : reps;

  const kpis = [
    { label: "إجمالي الكفالات", value: stats.total_sponsorships ?? 0 },
    { label: "قيد التنفيذ", value: stats.active ?? 0 },
    { label: "مكتملة", value: stats.completed ?? 0 },
    { label: "قيد المراجعة", value: stats.pending ?? 0 },
    { label: "إجمالي التمويل", value: Math.round(stats.total_funded ?? 0) },
  ];

  return (
    <Shell>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-primary">{k.value.toLocaleString("en-US")}</div>
              <div className="mt-1 text-xs text-brand-gray">{k.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {loading && <LoadingState />}

      {!loading && tab === "types" && projectSlug && (
        <SponsorshipTypesPanel projectSlug={projectSlug} />
      )}

      {!loading && tab === "sponsorships" && (
        <>
          <Card className="mb-4">
            <h3 className="mb-3 font-bold text-primary">تسجيل كفالة إدارية</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="النوع" value={recordForm.type} onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })} />
              <Select label="التصنيف" value={recordForm.kind} onChange={(e) => setRecordForm({ ...recordForm, kind: e.target.value })}>
                <option value="individual">فردية</option>
                <option value="community">مجتمعية</option>
              </Select>
              {donorPolicy !== "none" && (
                <Input
                  label={donorPolicy === "full" ? "اسم المتبرّع" : "اسم المتبرّع (اختياري)"}
                  value={recordForm.sponsor_name}
                  onChange={(e) => setRecordForm({ ...recordForm, sponsor_name: e.target.value })}
                />
              )}
              {recordForm.kind === "community" && (
                <Input
                  label="هدف الوحدات"
                  type="number"
                  value={recordForm.units_target}
                  onChange={(e) => setRecordForm({ ...recordForm, units_target: e.target.value })}
                />
              )}
            </div>
            <Button className="mt-3" disabled={recording} onClick={() => void recordSponsorship()}>
              {recording ? "جاري التسجيل…" : "تسجيل"}
            </Button>
          </Card>
        {sponsorships.length === 0 ? (
          <EmptyState title="لا كفالات في هذا النطاق" message="عند إنشاء المتبرّعين لكفالات جديدة ستظهر هنا للمراجعة." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sponsorships.map((s) => (
              <Card key={s.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-bold text-primary">
                    {s.type} — {Number(s.amount).toLocaleString("en-US")} ر.س
                  </h3>
                  <Badge
                    variant={
                      s.status === "completed" ? "success" : s.status === "rejected" ? "danger" : "warning"
                    }
                  >
                    {labelAr(SPONSORSHIP_STATUS_AR, s.status)}
                  </Badge>
                </div>
                <p className="mb-2 text-xs text-brand-gray">
                  المتبرّع: {s.donor_name} · مموّل: {s.total_funded}
                </p>
                {s.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => spAct(s.id, "approve")}>اعتماد</Button>
                    <Button variant="secondary" onClick={() => spAct(s.id, "reject")}>
                      رفض
                    </Button>
                  </div>
                )}
                {s.status !== "pending" && s.status !== "available" && (
                  <p className="text-xs text-brand-gray">لا إجراءات معلّقة على هذه الكفالة.</p>
                )}
              </Card>
            ))}
          </div>
        )}
        </>
      )}

      {!loading && tab === "orders" && (
        orders.length === 0 ? (
          <EmptyState title="لا طلبات بعد" message="بعد اعتماد كفالة يُنشأ طلب تلقائياً ليُسند ويُكمَل." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {orders.map((o) => {
              const actions = ORDER_FLOW[o.status] || [];
              return (
                <Card key={o.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-bold text-primary">
                      طلب #{o.id} — {o.sponsorship_type}
                    </h3>
                    <Badge variant="primary">{labelAr(ORDER_STATUS_AR, o.status)}</Badge>
                  </div>
                  <p className="mb-2 text-xs text-brand-gray">
                    مورّد: {o.supplier_name || "—"} · مندوب: {o.representative_name || "—"}
                  </p>
                  {(o.status === "pending" || o.status === "assigned") && (
                    <div className="mb-2">
                      {assignableSuppliers.length === 0 && allowedSupplierIds ? (
                        <p className="mb-2 text-xs text-danger">لا مورّدين ضمن نطاق المشروع — عدّل القائمة المسموحة.</p>
                      ) : null}
                      <AssignRow
                        suppliers={assignableSuppliers}
                        reps={assignableReps}
                        onAssign={(s, r) => assign(o.id, s, r)}
                      />
                    </div>
                  )}
                  {actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {actions.map((a) => (
                        <Button
                          key={a.next}
                          variant={a.adminOnly ? "primary" : "secondary"}
                          onClick={() => orderAct(o.id, a.next, a.label)}
                        >
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  {o.status === "completed" && (
                    <p className="text-xs text-brand-gray">اكتملت دورة هذا الطلب.</p>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}

      {!loading && tab === "map" && (
        points.length === 0 ? (
          <EmptyState title="لا نقاط على الخريطة" message="تظهر المواقع بعد تسجيل إحداثيات الكفالات." />
        ) : (
          <SaqyaMap points={points} />
        )
      )}
    </Shell>
  );
}

function AssignRow({
  suppliers,
  reps,
  onAssign,
}: {
  suppliers: Profile[];
  reps: Profile[];
  onAssign: (s: string, r: string) => void;
}) {
  const [s, setS] = useState("");
  const [r, setR] = useState("");
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Select label="المورّد" value={s} onChange={(e) => setS(e.target.value)}>
        <option value="">اختر المورّد</option>
        {suppliers.map((x) => (
          <option key={x.id} value={x.user}>
            {x.business_name || x.name}
          </option>
        ))}
      </Select>
      <Select label="المندوب" value={r} onChange={(e) => setR(e.target.value)}>
        <option value="">اختر المندوب</option>
        {reps.map((x) => (
          <option key={x.id} value={x.user}>
            {x.name}
          </option>
        ))}
      </Select>
      <div className="flex items-end">
        <Button onClick={() => onAssign(s, r)}>إسناد</Button>
      </div>
    </div>
  );
}
