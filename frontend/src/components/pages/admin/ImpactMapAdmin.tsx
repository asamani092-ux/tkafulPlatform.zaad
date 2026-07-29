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
import { MAP_ICON_KEYS, getMapIcon } from "../map/icons";

type TabKey = "projects" | "layers" | "regions" | "products" | "outlets" | "contributions" | "distributions";

const TABS = [
  { key: "projects", label: "المشاريع" },
  { key: "layers", label: "الطبقات/الأدوات" },
  { key: "regions", label: "المناطق" },
  { key: "products", label: "المنتجات" },
  { key: "outlets", label: "المنافذ" },
  { key: "contributions", label: "التعهدات" },
  { key: "distributions", label: "سجلات التوزيع" },
];

const ADMIN_BASE = "/api/map/admin";
const LAYER_KEYS = ["regions", "outlets", "deliveries", "sponsorships"];

interface ProjectRow { id: number; name: string; slug: string; source_type: string }

/** أيقونة من مكتبة الهوية (lucide) مع معاينة. */
function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const Icon = getMapIcon(value);
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">الأيقونة (icon_key)</label>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-surface-border">
          <Icon size={18} />
        </span>
        <select className="flex-1 rounded-md border border-surface-border bg-surface p-2" dir="ltr"
          value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {MAP_ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
    </div>
  );
}

/** لوحة إدارة الخارطة متعددة المشاريع — CRUD للمشاريع/الطبقات + بيانات المشاريع الذاتية. */
export default function ImpactMapAdmin() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [tab, setTab] = useState<TabKey>("projects");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "create" | "edit"; data: Record<string, string> }>({
    open: false, mode: "create", data: {},
  });

  const endpointFor = (t: TabKey) => {
    if (t === "projects") return `${ADMIN_BASE}/map-projects/`;
    if (t === "layers") return `${ADMIN_BASE}/map-layers/`;
    if (t === "distributions") return `${ADMIN_BASE}/distribution-records/`;
    return `${ADMIN_BASE}/${t}/`;
  };
  const endpoint = endpointFor(tab);

  const loadProjects = useCallback(() => {
    if (!access) return;
    authFetch(`${ADMIN_BASE}/map-projects/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProjectsList((Array.isArray(d) ? d : d.results || []) as ProjectRow[]))
      .catch(() => {});
  }, [access]);

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
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const projectName = (id: unknown) => projectsList.find((p) => String(p.id) === String(id))?.name || id;

  const save = async () => {
    const isEdit = modal.mode === "edit" && modal.data.id;
    const url = isEdit ? `${endpoint}${modal.data.id}/` : endpoint;
    const method = isEdit ? "PATCH" : "POST";
    const body: Record<string, unknown> = { ...modal.data };
    delete body.id;
    delete body.manager_name;
    const numeric = ["center_lat", "center_lng", "lat", "lng", "order", "target_families", "quantity",
      "families_served", "quantity_distributed", "region", "product", "project", "manager"];
    for (const k of Object.keys(body)) {
      if (numeric.includes(k) && body[k] !== "") body[k] = Number(body[k]);
      if (["is_active", "enabled"].includes(k)) body[k] = body[k] === "true" || body[k] === true;
    }
    // kpi_keys: نص مفصول بفواصل → مصفوفة
    if (typeof body.kpi_keys === "string") {
      body.kpi_keys = body.kpi_keys.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (body.manager === "") delete body.manager;
    const res = await authFetch(url, { method, body: JSON.stringify(body) });
    if (res.ok) {
      success({ title: isEdit ? "تم التحديث" : "تم الإنشاء" });
      setModal({ open: false, mode: "create", data: {} });
      load();
      if (tab === "projects") loadProjects();
    } else {
      let detail = "تعذّر الحفظ";
      try { const j = await res.json(); detail = j.detail || JSON.stringify(j); } catch { /* noop */ }
      error({ title: detail });
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("حذف؟")) return;
    const res = await authFetch(`${endpoint}${id}/`, { method: "DELETE" });
    if (res.ok) { success({ title: "تم الحذف" }); load(); if (tab === "projects") loadProjects(); }
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
    for (const [k, v] of Object.entries(row)) {
      data[k] = v == null ? "" : Array.isArray(v) ? v.join(",") : String(v);
    }
    setModal({ open: true, mode: "edit", data });
  };

  const setField = (k: string, v: string) => setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

  const projectSelect = () => (
    <Select label="المشروع" value={modal.data.project || ""} onChange={(e) => setField("project", e.target.value)}>
      <option value="">— اختر —</option>
      {projectsList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </Select>
  );

  const columnsFor = () => {
    switch (tab) {
      case "projects":
        return [
          { key: "name", header: "الاسم", render: (r: Record<string, unknown>) => {
            const Icon = getMapIcon(r.icon_key as string);
            return <span className="flex items-center gap-2"><Icon size={16} style={{ color: r.color as string }} /> {String(r.name)}</span>;
          } },
          { key: "slug", header: "المعرّف" },
          { key: "source_type", header: "المصدر" },
          { key: "manager_name", header: "المسؤول" },
          { key: "is_active", header: "نشط", render: (r: Record<string, unknown>) => (r.is_active ? "نعم" : "لا") },
          { key: "actions", header: "", render: (r: Record<string, unknown>) => actionBtns(r) },
        ];
      case "layers":
        return [
          { key: "project", header: "المشروع", render: (r: Record<string, unknown>) => String(projectName(r.project)) },
          { key: "layer_key", header: "الطبقة" },
          { key: "marker_type", header: "نوع العلامة" },
          { key: "icon_key", header: "الأيقونة", render: (r: Record<string, unknown>) => {
            const Icon = getMapIcon(r.icon_key as string);
            return <Icon size={16} style={{ color: r.color as string }} />;
          } },
          { key: "enabled", header: "مفعّل", render: (r: Record<string, unknown>) => (r.enabled ? "نعم" : "لا") },
          { key: "actions", header: "", render: (r: Record<string, unknown>) => actionBtns(r) },
        ];
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
      case "projects":
        return (
          <>
            <Input label="الاسم" value={modal.data.name || ""} onChange={(e) => setField("name", e.target.value)} />
            <Input label="slug" value={modal.data.slug || ""} onChange={(e) => setField("slug", e.target.value)} dir="ltr" />
            <Select label="المصدر (source_type)" value={modal.data.source_type || "native"} onChange={(e) => setField("source_type", e.target.value)}>
              <option value="native">native (بيانات ذاتية)</option>
              <option value="saqya">saqya (حيّ)</option>
            </Select>
            <IconSelect value={modal.data.icon_key || ""} onChange={(v) => setField("icon_key", v)} />
            <Input label="اللون (color)" value={modal.data.color || "#8B1538"} onChange={(e) => setField("color", e.target.value)} dir="ltr" />
            <Input label="رابط CTA/المتجر" value={modal.data.cta_url || ""} onChange={(e) => setField("cta_url", e.target.value)} dir="ltr" />
            <Input label="المسؤول (manager id)" value={modal.data.manager || ""} onChange={(e) => setField("manager", e.target.value)} dir="ltr" />
            <Input label="order" type="number" value={modal.data.order || "0"} onChange={(e) => setField("order", e.target.value)} />
            <Select label="نشط" value={modal.data.is_active || "true"} onChange={(e) => setField("is_active", e.target.value)}>
              <option value="true">نعم</option><option value="false">لا</option>
            </Select>
          </>
        );
      case "layers":
        return (
          <>
            {projectSelect()}
            <Select label="الطبقة (layer_key)" value={modal.data.layer_key || "regions"} onChange={(e) => setField("layer_key", e.target.value)}>
              {LAYER_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
            <Input label="التسمية (label)" value={modal.data.label || ""} onChange={(e) => setField("label", e.target.value)} />
            <Input label="نوع العلامة (marker_type, اختياري)" value={modal.data.marker_type || ""} onChange={(e) => setField("marker_type", e.target.value)} dir="ltr" />
            <IconSelect value={modal.data.icon_key || ""} onChange={(v) => setField("icon_key", v)} />
            <Input label="اللون (color)" value={modal.data.color || ""} onChange={(e) => setField("color", e.target.value)} dir="ltr" />
            <Input label="المؤشرات (kpi_keys مفصولة بفواصل)" value={modal.data.kpi_keys || ""} onChange={(e) => setField("kpi_keys", e.target.value)} dir="ltr" />
            <Input label="order" type="number" value={modal.data.order || "0"} onChange={(e) => setField("order", e.target.value)} />
            <Select label="مفعّل" value={modal.data.enabled || "true"} onChange={(e) => setField("enabled", e.target.value)}>
              <option value="true">نعم</option><option value="false">لا</option>
            </Select>
          </>
        );
      case "regions":
        return (
          <>
            {projectSelect()}
            <Input label="الاسم" value={modal.data.name || ""} onChange={(e) => setField("name", e.target.value)} />
            <Input label="slug" value={modal.data.slug || ""} onChange={(e) => setField("slug", e.target.value)} dir="ltr" />
            <Input label="center_lat" value={modal.data.center_lat || ""} onChange={(e) => setField("center_lat", e.target.value)} dir="ltr" />
            <Input label="center_lng" value={modal.data.center_lng || ""} onChange={(e) => setField("center_lng", e.target.value)} dir="ltr" />
            <Select label="priority" value={modal.data.priority || "medium"} onChange={(e) => setField("priority", e.target.value)}>
              <option value="high">high</option><option value="medium">medium</option><option value="low">low</option>
            </Select>
            <Input label="order" type="number" value={modal.data.order || "0"} onChange={(e) => setField("order", e.target.value)} />
          </>
        );
      case "products":
        return (
          <>
            {projectSelect()}
            <Input label="الاسم" value={modal.data.name || ""} onChange={(e) => setField("name", e.target.value)} />
            <Input label="slug" value={modal.data.slug || ""} onChange={(e) => setField("slug", e.target.value)} dir="ltr" />
            <Input label="icon" value={modal.data.icon || ""} onChange={(e) => setField("icon", e.target.value)} />
            <Input label="target_families" type="number" value={modal.data.target_families || ""} onChange={(e) => setField("target_families", e.target.value)} />
          </>
        );
      case "outlets":
        return (
          <>
            {projectSelect()}
            <Input label="الاسم" value={modal.data.name || ""} onChange={(e) => setField("name", e.target.value)} />
            <Select label="type" value={modal.data.type || "sale_point"} onChange={(e) => setField("type", e.target.value)}>
              <option value="sale_point">sale_point</option><option value="permanent_corner">permanent_corner</option><option value="participation_point">participation_point</option>
            </Select>
            <Input label="lat" value={modal.data.lat || ""} onChange={(e) => setField("lat", e.target.value)} dir="ltr" />
            <Input label="lng" value={modal.data.lng || ""} onChange={(e) => setField("lng", e.target.value)} dir="ltr" />
            <Input label="region (id)" value={modal.data.region || ""} onChange={(e) => setField("region", e.target.value)} />
            <Input label="address" value={modal.data.address || ""} onChange={(e) => setField("address", e.target.value)} />
          </>
        );
      default:
        return (
          <>
            {projectSelect()}
            <Input label="region (id)" value={modal.data.region || ""} onChange={(e) => setField("region", e.target.value)} />
            <Input label="product (id)" value={modal.data.product || ""} onChange={(e) => setField("product", e.target.value)} />
            <Input label="families_served" type="number" value={modal.data.families_served || ""} onChange={(e) => setField("families_served", e.target.value)} />
            <Input label="quantity_distributed" type="number" value={modal.data.quantity_distributed || ""} onChange={(e) => setField("quantity_distributed", e.target.value)} />
            <Input label="date" type="date" value={modal.data.date || ""} onChange={(e) => setField("date", e.target.value)} />
          </>
        );
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">خارطة الأثر — الإدارة</h1>
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
  if (tab === "projects") return { source_type: "native", color: "#8B1538", order: "0", is_active: "true", icon_key: "MapPin" };
  if (tab === "layers") return { layer_key: "regions", order: "0", enabled: "true", icon_key: "MapPin" };
  if (tab === "regions") return { priority: "medium", order: "0", is_active: "true" };
  if (tab === "outlets") return { type: "sale_point" };
  if (tab === "distributions") return { date: new Date().toISOString().slice(0, 10) };
  return {};
}
