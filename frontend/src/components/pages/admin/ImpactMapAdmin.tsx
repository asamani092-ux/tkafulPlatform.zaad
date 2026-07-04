import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import AdminShell from "../../layout/AdminShell";
import Tabs from "../../ui/Tabs";
import DataTable from "../../ui/DataTable";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Modal from "../../ui/Modal";
import { LoadingState, EmptyState } from "../../feedback/PageStates";

type TabKey = "regions" | "products" | "outlets" | "contributions" | "distributions";

const TABS = [
  { key: "regions", label: "المناطق" },
  { key: "products", label: "المنتجات" },
  { key: "outlets", label: "المنافذ" },
  { key: "contributions", label: "التعهدات" },
  { key: "distributions", label: "سجلات التوزيع" },
];

const ADMIN_BASE = "/api/map/admin";

/** لوحة إدارة خارطة تفقدهم — CRUD + إجراءات حالة التعهد. */
export default function ImpactMapAdmin() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [tab, setTab] = useState<TabKey>("regions");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "create" | "edit"; data: Record<string, string> }>({
    open: false, mode: "create", data: {},
  });

  const endpoint = `${ADMIN_BASE}/${tab === "distributions" ? "distribution-records" : tab}/`;

  const load = useCallback(() => {
    if (!access) return;
    setLoading(true);
    authFetch(endpoint)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : d.results || []))
      .catch(() => error({ title: "تعذّر التحميل" }))
      .finally(() => setLoading(false));
  }, [access, endpoint, error]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const isEdit = modal.mode === "edit" && modal.data.id;
    const url = isEdit ? `${endpoint}${modal.data.id}/` : endpoint;
    const method = isEdit ? "PATCH" : "POST";
    const body: Record<string, unknown> = { ...modal.data };
    delete body.id;
    for (const k of Object.keys(body)) {
      if (["center_lat", "center_lng", "lat", "lng", "order", "target_families", "quantity", "families_served", "quantity_distributed", "region", "product"].includes(k) && body[k] !== "") {
        body[k] = Number(body[k]);
      }
      if (k === "is_active") body[k] = body[k] === "true" || body[k] === true;
    }
    const res = await authFetch(url, { method, body: JSON.stringify(body) });
    if (res.ok) {
      success({ title: isEdit ? "تم التحديث" : "تم الإنشاء" });
      setModal({ open: false, mode: "create", data: {} });
      load();
    } else {
      error({ title: "تعذّر الحفظ" });
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("حذف؟")) return;
    const res = await authFetch(`${endpoint}${id}/`, { method: "DELETE" });
    if (res.ok) { success({ title: "تم الحذف" }); load(); }
    else error({ title: "تعذّر الحذف" });
  };

  const contribAction = async (id: number, action: "approve" | "fulfill" | "cancel") => {
    const res = await authFetch(`${ADMIN_BASE}/contributions/${id}/${action}/`, { method: "POST" });
    if (res.ok) { success({ title: "تم تحديث الحالة" }); load(); }
    else error({ title: "تعذّر التنفيذ" });
  };

  const openCreate = () => setModal({ open: true, mode: "create", data: defaultForm(tab) });
  const openEdit = (row: Record<string, unknown>) => {
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) data[k] = v == null ? "" : String(v);
    setModal({ open: true, mode: "edit", data });
  };

  const columnsFor = () => {
    switch (tab) {
      case "regions":
        return [
          { key: "name", header: "الاسم" },
          { key: "slug", header: "المعرّف" },
          { key: "priority", header: "الأولوية" },
          { key: "is_active", header: "نشط", render: (r: Record<string, unknown>) => (r.is_active ? "نعم" : "لا") },
          { key: "actions", header: "", render: (r: Record<string, unknown>) => actionBtns(r) },
        ];
      case "products":
        return [
          { key: "name", header: "الاسم" },
          { key: "slug", header: "المعرّف" },
          { key: "target_families", header: "المستهدف" },
          { key: "actions", header: "", render: (r: Record<string, unknown>) => actionBtns(r) },
        ];
      case "outlets":
        return [
          { key: "name", header: "الاسم" },
          { key: "type", header: "النوع" },
          { key: "region", header: "المنطقة" },
          { key: "actions", header: "", render: (r: Record<string, unknown>) => actionBtns(r) },
        ];
      case "contributions":
        return [
          { key: "name", header: "المتعهد" },
          { key: "phone", header: "الجوال" },
          { key: "region_name", header: "المنطقة" },
          { key: "product_name", header: "المنتج" },
          { key: "status", header: "الحالة" },
          { key: "actions", header: "", render: (r: Record<string, unknown>) => (
            <div className="flex flex-wrap gap-1">
              <Button variant="secondary" onClick={() => contribAction(Number(r.id), "approve")}>اعتماد</Button>
              <Button variant="secondary" onClick={() => contribAction(Number(r.id), "fulfill")}>تنفيذ</Button>
              <Button variant="secondary" onClick={() => contribAction(Number(r.id), "cancel")}>إلغاء</Button>
            </div>
          ) },
        ];
      default:
        return [
          { key: "region_name", header: "المنطقة" },
          { key: "product_name", header: "المنتج" },
          { key: "families_served", header: "أسر" },
          { key: "quantity_distributed", header: "كمية" },
          { key: "date", header: "التاريخ" },
          { key: "actions", header: "", render: (r: Record<string, unknown>) => actionBtns(r) },
        ];
    }
  };

  const actionBtns = (r: Record<string, unknown>) => (
    <div className="flex gap-1">
      <Button variant="secondary" onClick={() => openEdit(r)}>تعديل</Button>
      <Button variant="secondary" onClick={() => remove(Number(r.id))}>حذف</Button>
    </div>
  );

  const formFields = () => {
    switch (tab) {
      case "regions":
        return (
          <>
            <Input label="الاسم" value={modal.data.name || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} />
            <Input label="slug" value={modal.data.slug || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, slug: e.target.value } })} dir="ltr" />
            <Input label="center_lat" value={modal.data.center_lat || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, center_lat: e.target.value } })} dir="ltr" />
            <Input label="center_lng" value={modal.data.center_lng || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, center_lng: e.target.value } })} dir="ltr" />
            <Select label="priority" value={modal.data.priority || "medium"} onChange={(e) => setModal({ ...modal, data: { ...modal.data, priority: e.target.value } })}>
              <option value="high">high</option><option value="medium">medium</option><option value="low">low</option>
            </Select>
            <Input label="order" type="number" value={modal.data.order || "0"} onChange={(e) => setModal({ ...modal, data: { ...modal.data, order: e.target.value } })} />
          </>
        );
      case "products":
        return (
          <>
            <Input label="الاسم" value={modal.data.name || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} />
            <Input label="slug" value={modal.data.slug || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, slug: e.target.value } })} dir="ltr" />
            <Input label="icon" value={modal.data.icon || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, icon: e.target.value } })} />
            <Input label="target_families" type="number" value={modal.data.target_families || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, target_families: e.target.value } })} />
          </>
        );
      case "outlets":
        return (
          <>
            <Input label="الاسم" value={modal.data.name || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} />
            <Select label="type" value={modal.data.type || "sale_point"} onChange={(e) => setModal({ ...modal, data: { ...modal.data, type: e.target.value } })}>
              <option value="sale_point">sale_point</option><option value="permanent_corner">permanent_corner</option><option value="participation_point">participation_point</option>
            </Select>
            <Input label="lat" value={modal.data.lat || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, lat: e.target.value } })} dir="ltr" />
            <Input label="lng" value={modal.data.lng || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, lng: e.target.value } })} dir="ltr" />
            <Input label="region (id)" value={modal.data.region || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, region: e.target.value } })} />
            <Input label="address" value={modal.data.address || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, address: e.target.value } })} />
          </>
        );
      default:
        return (
          <>
            <Input label="region (id)" value={modal.data.region || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, region: e.target.value } })} />
            <Input label="product (id)" value={modal.data.product || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, product: e.target.value } })} />
            <Input label="families_served" type="number" value={modal.data.families_served || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, families_served: e.target.value } })} />
            <Input label="quantity_distributed" type="number" value={modal.data.quantity_distributed || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, quantity_distributed: e.target.value } })} />
            <Input label="date" type="date" value={modal.data.date || ""} onChange={(e) => setModal({ ...modal, data: { ...modal.data, date: e.target.value } })} />
          </>
        );
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">خارطة تفقدهم — الإدارة</h1>
      <Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} />
      <div className="mb-4 mt-4 flex justify-between">
        {tab !== "contributions" && <Button onClick={openCreate}>إضافة</Button>}
      </div>
      <Card>
        {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <DataTable columns={columnsFor()} rows={rows as Record<string, unknown>[]} />
          </div>
        )}
      </Card>
      <Modal open={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.mode === "create" ? "إضافة" : "تعديل"} wide>
        <div className="space-y-3">{formFields()}</div>
        <div className="mt-4 flex gap-2">
          <Button onClick={save}>حفظ</Button>
          <Button variant="secondary" onClick={() => setModal({ ...modal, open: false })}>إلغاء</Button>
        </div>
      </Modal>
    </AdminShell>
  );
}

function defaultForm(tab: TabKey): Record<string, string> {
  if (tab === "regions") return { priority: "medium", order: "0", is_active: "true" };
  if (tab === "outlets") return { type: "sale_point" };
  if (tab === "distributions") return { date: new Date().toISOString().slice(0, 10) };
  return {};
}
