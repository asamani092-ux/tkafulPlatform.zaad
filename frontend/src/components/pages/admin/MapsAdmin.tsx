import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Badge from "../../ui/Badge";
import Tabs from "../../ui/Tabs";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { optionLabel, optionValue } from "../projects/filters";
import type { MapFieldDef } from "../projects/types";

interface AdminMap {
  id: number; project: number; project_slug: string; project_name: string;
  title: string; description: string; visibility: string; published_at: string | null;
}
interface AdminLayer { id: number; map: number; name: string; visibility: string; order: number }
interface AdminField extends MapFieldDef { id: number; map: number; is_public: boolean }
interface AdminItem {
  id: number; map: number; layer: number; layer_name: string; lat: number; lng: number;
  name: string; icon: string; data: Record<string, unknown>; status: string;
}
interface AdminContribution {
  id: number; map: number; item: number | null; item_name: string | null; category: string;
  name: string; phone: string; mode: string; quantity: number; note: string; status: string;
}
interface AdminProjectOption { id: number; name: string }

const FIELD_TYPES = ["text", "number", "select", "boolean", "date"] as const;

/** إدارة نظام الخرائط المتعددة — نطاق حسب عضوية المشروع. */
export default function MapsAdmin() {
  const toast = useToast();
  const [maps, setMaps] = useState<AdminMap[]>([]);
  const [projects, setProjects] = useState<AdminProjectOption[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState("layers");

  const [layers, setLayers] = useState<AdminLayer[]>([]);
  const [fields, setFields] = useState<AdminField[]>([]);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [contributions, setContributions] = useState<AdminContribution[]>([]);

  const [mapForm, setMapForm] = useState({ project: "", title: "", visibility: "public" });
  const [layerForm, setLayerForm] = useState({ name: "", visibility: "public" });
  const [fieldForm, setFieldForm] = useState({ key: "", label: "", type: "text", required: false, is_public: true, options: "" });
  const [itemForm, setItemForm] = useState<{ layer: string; name: string; lat: string; lng: string; data: Record<string, string> }>({ layer: "", name: "", lat: "", lng: "", data: {} });

  const selected = maps.find((m) => m.id === selectedId) || null;

  const loadMaps = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [mapsRes, meRes, projectsRes] = await Promise.all([
        authFetch("/api/maps/admin/maps/"),
        authFetch("/api/platform/my-memberships/"),
        authFetch("/api/platform/projects/"),
      ]);
      if (!mapsRes.ok) throw new Error("fetch");
      const data: AdminMap[] = await mapsRes.json();
      setMaps(data);
      if (meRes.ok) setIsSuperAdmin((await meRes.json()).is_super_admin);
      if (projectsRes.ok) setProjects((await projectsRes.json()).map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
      if (data.length && !data.some((m) => m.id === selectedId)) setSelectedId(data[0].id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadChildren = useCallback(async (mapId: number) => {
    const [l, f, i, c] = await Promise.all([
      authFetch(`/api/maps/admin/layers/?map=${mapId}`).then((r) => r.json()),
      authFetch(`/api/maps/admin/fields/?map=${mapId}`).then((r) => r.json()),
      authFetch(`/api/maps/admin/items/?map=${mapId}`).then((r) => r.json()),
      authFetch(`/api/maps/admin/contributions/?map=${mapId}`).then((r) => r.json()),
    ]);
    setLayers((l as AdminLayer[]).filter((x) => x.map === mapId));
    setFields((f as AdminField[]).filter((x) => x.map === mapId));
    setItems(i as AdminItem[]);
    setContributions(c as AdminContribution[]);
  }, []);

  useEffect(() => { void loadMaps(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { if (selectedId) void loadChildren(selectedId); }, [selectedId, loadChildren]);

  const post = async (path: string, body: unknown, okMsg: string) => {
    const res = await authFetch(path, { method: "POST", body: JSON.stringify(body) });
    if (res.ok) {
      toast.success({ title: okMsg });
      if (selectedId) void loadChildren(selectedId);
      return true;
    }
    const data = await res.json().catch(() => ({}));
    const firstError = typeof data === "object" && data ? Object.values(data)[0] : null;
    toast.error({
      title: data.detail || (Array.isArray(firstError) ? firstError[0] : String(firstError || "تعذّر التنفيذ")),
    });
    return false;
  };

  const createMap = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await post("/api/maps/admin/maps/", { project: Number(mapForm.project), title: mapForm.title, visibility: mapForm.visibility }, "تم إنشاء الخريطة");
    if (ok) { setMapForm({ project: "", title: "", visibility: "public" }); void loadMaps(); }
  };

  const togglePublish = async (m: AdminMap) => {
    await post(`/api/maps/admin/maps/${m.id}/${m.published_at ? "unpublish" : "publish"}/`, {}, m.published_at ? "أُلغي النشر" : "تم النشر");
    void loadMaps();
  };

  if (loading) return <AdminShell><LoadingState title="جاري تحميل الخرائط…" /></AdminShell>;
  if (error) return <AdminShell><ErrorState title="تعذّر التحميل" message="تحقّق من الاتصال." /></AdminShell>;

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-extrabold text-primary">إدارة الخرائط</h1>

      {isSuperAdmin && (
        <Card className="mb-4">
          <h2 className="mb-2 text-lg font-bold text-primary">إنشاء خريطة (provisioning — المشرف العام)</h2>
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-4" onSubmit={createMap}>
            <Select label="المشروع" value={mapForm.project} onChange={(e) => setMapForm({ ...mapForm, project: e.target.value })} required>
              <option value="">اختر…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input label="العنوان" value={mapForm.title} onChange={(e) => setMapForm({ ...mapForm, title: e.target.value })} required />
            <Select label="الظهور" value={mapForm.visibility} onChange={(e) => setMapForm({ ...mapForm, visibility: e.target.value })}>
              <option value="public">عامة</option>
              <option value="mixed">مختلطة</option>
              <option value="private">خاصة</option>
            </Select>
            <div className="flex items-end"><Button type="submit">إنشاء</Button></div>
          </form>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {maps.map((m) => (
          <button key={m.id} type="button"
            className={`rounded-full px-3 py-1 text-xs font-bold${m.id === selectedId ? " bg-primary text-white" : " bg-surface border border-surface-border"}`}
            onClick={() => setSelectedId(m.id)}>
            {m.title} — {m.project_name}
          </button>
        ))}
        {maps.length === 0 && <p className="text-brand-gray">لا خرائط ضمن نطاقك.</p>}
      </div>

      {selected && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-primary">{selected.title}</h2>
              <Badge variant={selected.published_at ? "success" : "warning"}>{selected.published_at ? "منشورة" : "غير منشورة"}</Badge>
              <Badge>{selected.visibility}</Badge>
            </div>
            <Button variant="secondary" onClick={() => togglePublish(selected)}>
              {selected.published_at ? "إلغاء النشر" : "نشر"}
            </Button>
          </div>

          <Tabs active={tab} onChange={setTab} tabs={[
            { key: "layers", label: `الطبقات (${layers.length})` },
            { key: "fields", label: `الحقول (${fields.length})` },
            { key: "items", label: `العناصر (${items.length})` },
            { key: "contributions", label: `التعهدات (${contributions.length})` },
          ]} />

          {tab === "layers" && (
            <div className="mt-4 space-y-2">
              {layers.map((l) => (
                <div key={l.id} className="flex items-center gap-3 text-sm">
                  <strong>{l.name}</strong>
                  <Badge variant={l.visibility === "public" ? "success" : "warning"}>{l.visibility === "public" ? "عامة" : "خاصة"}</Badge>
                </div>
              ))}
              <form className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await post("/api/maps/admin/layers/", { map: selected.id, name: layerForm.name, visibility: layerForm.visibility, order: layers.length }, "أُضيفت الطبقة");
                  if (ok) setLayerForm({ name: "", visibility: "public" });
                }}>
                <div className="w-44"><Input label="اسم الطبقة" value={layerForm.name} onChange={(e) => setLayerForm({ ...layerForm, name: e.target.value })} required /></div>
                <div className="w-32">
                  <Select label="الظهور" value={layerForm.visibility} onChange={(e) => setLayerForm({ ...layerForm, visibility: e.target.value })}>
                    <option value="public">عامة</option>
                    <option value="private">خاصة</option>
                  </Select>
                </div>
                <Button type="submit" variant="secondary">إضافة طبقة</Button>
              </form>
            </div>
          )}

          {tab === "fields" && (
            <div className="mt-4 space-y-2">
              {fields.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <strong>{f.label}</strong>
                  <code className="text-xs text-brand-gray" dir="ltr">{f.key}</code>
                  <Badge>{f.type}</Badge>
                  {f.required && <Badge variant="warning">إلزامي</Badge>}
                  <Badge variant={f.is_public ? "success" : "danger"}>{f.is_public ? "عام" : "داخلي"}</Badge>
                </div>
              ))}
              <form className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const options = fieldForm.type === "select"
                    ? fieldForm.options.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
                  const ok = await post("/api/maps/admin/fields/", {
                    map: selected.id, key: fieldForm.key, label: fieldForm.label, type: fieldForm.type,
                    required: fieldForm.required, is_public: fieldForm.is_public, options, order: fields.length,
                  }, "أُضيف الحقل");
                  if (ok) setFieldForm({ key: "", label: "", type: "text", required: false, is_public: true, options: "" });
                }}>
                <Input label="المفتاح (لاتيني)" value={fieldForm.key} onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value })} dir="ltr" required />
                <Input label="التسمية" value={fieldForm.label} onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })} required />
                <Select label="النوع" value={fieldForm.type} onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })}>
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
                {fieldForm.type === "select" && (
                  <Input label="الخيارات (مفصولة بفواصل)" value={fieldForm.options} onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })} />
                )}
                <div className="flex items-end gap-3 text-sm">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={fieldForm.required} onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })} /> إلزامي</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={fieldForm.is_public} onChange={(e) => setFieldForm({ ...fieldForm, is_public: e.target.checked })} /> عام</label>
                </div>
                <div className="flex items-end"><Button type="submit" variant="secondary">إضافة حقل</Button></div>
              </form>
            </div>
          )}

          {tab === "items" && (
            <div className="mt-4">
              <div className="mb-4 max-h-64 space-y-1 overflow-y-auto text-sm">
                {items.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center gap-2">
                    <strong>{i.name}</strong>
                    <span className="text-xs text-brand-gray">({i.layer_name})</span>
                    <span className="text-xs text-brand-gray" dir="ltr">{i.lat.toFixed(4)}, {i.lng.toFixed(4)}</span>
                    <Badge variant={i.status === "active" ? "success" : "warning"}>{i.status}</Badge>
                  </div>
                ))}
                {items.length === 0 && <p className="text-brand-gray">لا عناصر بعد.</p>}
              </div>

              {/* نموذج إدخال ديناميكي مبني على مخطط MapItemField */}
              <h3 className="mb-2 text-sm font-bold text-primary">إضافة عنصر (نموذج ديناميكي من مخطط الخريطة)</h3>
              <form className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data: Record<string, unknown> = {};
                  for (const f of fields) {
                    const raw = itemForm.data[f.key];
                    if (raw === undefined || raw === "") continue;
                    if (f.type === "number") data[f.key] = Number(raw);
                    else if (f.type === "boolean") data[f.key] = raw === "true";
                    else data[f.key] = raw;
                  }
                  const ok = await post("/api/maps/admin/items/", {
                    map: selected.id, layer: Number(itemForm.layer), name: itemForm.name,
                    lat: Number(itemForm.lat), lng: Number(itemForm.lng), data,
                  }, "أُضيف العنصر");
                  if (ok) setItemForm({ layer: itemForm.layer, name: "", lat: "", lng: "", data: {} });
                }}>
                <Select label="الطبقة" value={itemForm.layer} onChange={(e) => setItemForm({ ...itemForm, layer: e.target.value })} required>
                  <option value="">اختر…</option>
                  {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
                <Input label="الاسم" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Lat" value={itemForm.lat} onChange={(e) => setItemForm({ ...itemForm, lat: e.target.value })} dir="ltr" required />
                  <Input label="Lng" value={itemForm.lng} onChange={(e) => setItemForm({ ...itemForm, lng: e.target.value })} dir="ltr" required />
                </div>
                {fields.map((f) => {
                  const value = itemForm.data[f.key] ?? "";
                  const setValue = (v: string) => setItemForm({ ...itemForm, data: { ...itemForm.data, [f.key]: v } });
                  if (f.type === "select") {
                    return (
                      <Select key={f.key} label={`${f.label}${f.required ? " *" : ""}`} value={value} onChange={(e) => setValue(e.target.value)} required={f.required}>
                        <option value="">—</option>
                        {f.options.map((o) => <option key={optionValue(o)} value={optionValue(o)}>{optionLabel(o)}</option>)}
                      </Select>
                    );
                  }
                  if (f.type === "boolean") {
                    return (
                      <Select key={f.key} label={f.label} value={value} onChange={(e) => setValue(e.target.value)}>
                        <option value="">—</option>
                        <option value="true">نعم</option>
                        <option value="false">لا</option>
                      </Select>
                    );
                  }
                  return (
                    <Input key={f.key} label={`${f.label}${f.required ? " *" : ""}`}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={value} onChange={(e) => setValue(e.target.value)} required={f.required} />
                  );
                })}
                <div className="flex items-end"><Button type="submit">إضافة العنصر</Button></div>
              </form>
            </div>
          )}

          {tab === "contributions" && (
            <div className="mt-4 space-y-2 text-sm">
              {contributions.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2">
                  <strong>{c.name}</strong>
                  <span className="text-xs text-brand-gray" dir="ltr">{c.phone}</span>
                  {c.item_name && <span className="text-xs text-brand-gray">{c.item_name}</span>}
                  {c.category && <Badge>{c.category}</Badge>}
                  <span>× {c.quantity}</span>
                  <Badge variant={c.status === "fulfilled" ? "success" : c.status === "cancelled" ? "danger" : "warning"}>{c.status}</Badge>
                  {c.status === "pending" && (
                    <>
                      <button type="button" className="text-xs font-bold text-green-700 hover:underline"
                        onClick={() => post(`/api/maps/admin/contributions/${c.id}/approve/`, {}, "تم الاعتماد")}>اعتماد</button>
                      <button type="button" className="text-xs font-bold text-red-600 hover:underline"
                        onClick={() => post(`/api/maps/admin/contributions/${c.id}/cancel/`, {}, "تم الإلغاء")}>إلغاء</button>
                    </>
                  )}
                  {c.status === "approved" && (
                    <button type="button" className="text-xs font-bold text-primary hover:underline"
                      onClick={() => post(`/api/maps/admin/contributions/${c.id}/fulfill/`, {}, "تم التنفيذ")}>تنفيذ</button>
                  )}
                </div>
              ))}
              {contributions.length === 0 && <p className="text-brand-gray">لا تعهدات بعد.</p>}
            </div>
          )}
        </Card>
      )}
    </AdminShell>
  );
}
