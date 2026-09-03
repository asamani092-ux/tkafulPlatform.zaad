import { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import SaqyaShell from "../../layout/SaqyaShell";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import Textarea from "../../ui/Textarea";
import Modal from "../../ui/Modal";
import ProgressBar from "../../ui/ProgressBar";
import { LoadingState, EmptyState } from "../../feedback/PageStates";
import { labelAr, SPONSORSHIP_STATUS_AR } from "../../../i18n/labels";
import Select from "../../ui/Select";
import { DynamicFieldsInput, type SchemaField } from "../../admin/FieldSchemaBuilder";

interface Sponsorship {
  id: number; amount: string; type: string; description: string; status: string;
  total_funded: number; remaining: number; is_fully_funded: boolean; beneficiaries_count: number;
}


export default function DonorPortal({ projectSlug }: { projectSlug?: string }) {
  const { success, error } = useToast();
  const [items, setItems] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ amount: "", type: "سقيا", description: "", beneficiaries_count: "1", location: "" });
  const [types, setTypes] = useState<{ id: number; name: string; fields: SchemaField[] }[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [typeData, setTypeData] = useState<Record<string, unknown>>({});
  const selectedType = types.find((x) => String(x.id) === selectedTypeId) || null;
  const [contribTarget, setContribTarget] = useState<Sponsorship | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const load = () => {
    setLoading(true);
    authFetch("/api/saqya/sponsorships/")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setItems(d.results || d))
      .catch(() => error({ title: "تعذّر تحميل الكفالات" }))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    if (!projectSlug) return;
    authFetch(`/api/saqya/sponsorship-types/?project=${encodeURIComponent(projectSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTypes(d.results || d))
      .catch(() => undefined);
  }, [projectSlug]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      amount: Number(form.amount),
      description: form.description,
      beneficiaries_count: Number(form.beneficiaries_count),
      location: form.location,
    };
    if (projectSlug) payload.project = projectSlug;
    if (selectedType) {
      payload.sponsorship_type = selectedType.id;
      payload.type_data = typeData;
    } else {
      payload.type = form.type;
    }
    const res = await authFetch("/api/saqya/sponsorships/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      success({ title: "تم إنشاء الكفالة بنجاح" });
      setForm({ amount: "", type: "سقيا", description: "", beneficiaries_count: "1", location: "" });
      setSelectedTypeId("");
      setTypeData({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      const msg = d.type_data || d.type || d.detail || "تحقّق من الحقول وحاول مجدداً";
      error({ title: "تعذّر الإنشاء", description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    }
  };

  const contribute = async () => {
    if (!contribTarget) return;
    setRedirecting(true);
    const res = await authFetch(
      `/api/saqya/sponsorships/${contribTarget.id}/checkout_url/?amount=${encodeURIComponent(contribAmount)}`,
    );
    const data = await res.json();
    setRedirecting(false);
    if (res.ok && data.redirect_url) {
      success({ title: "جاري تحويلك للمتجر", description: "أكمل التبرّع في المتجر الخارجي" });
      window.location.href = data.redirect_url;
    } else {
      error({ title: "تعذّر فتح المتجر", description: data.detail || "رابط المتجر غير مهيّأ" });
    }
    setContribTarget(null);
    setContribAmount("");
  };

  return (
    <SaqyaShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-primary">إنشاء كفالة جديدة</h2>
          <form className="space-y-3" onSubmit={create} aria-label="نموذج إنشاء كفالة">
            <Input type="number" label="المبلغ المستهدف" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            {types.length > 0 ? (
              <Select
                label="نوع الكفالة"
                value={selectedTypeId}
                onChange={(e) => { setSelectedTypeId(e.target.value); setTypeData({}); }}
                required
              >
                <option value="">اختر النوع…</option>
                {types.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
              </Select>
            ) : (
              <Input label="نوع الكفالة" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
            )}
            {selectedType && (selectedType.fields?.length ?? 0) > 0 && (
              <DynamicFieldsInput fields={selectedType.fields} values={typeData} onChange={setTypeData} />
            )}
            <Input label="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input type="number" label="عدد المستفيدين" value={form.beneficiaries_count} onChange={(e) => setForm({ ...form, beneficiaries_count: e.target.value })} />
            <Textarea label="الوصف" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button type="submit" className="w-full">إنشاء الكفالة</Button>
          </form>
        </Card>

        <div className="lg:col-span-2 min-w-0">
          <h2 className="mb-4 text-lg font-bold text-primary">كفالاتي</h2>
          {loading ? <LoadingState /> : items.length === 0 ? (
            <EmptyState title="لا توجد كفالات بعد" message="أنشئ كفالتك الأولى من النموذج." />
          ) : (
            <div className="space-y-3">
              {items.map((s) => {
                const pct = Number(s.amount) > 0 ? Math.round((s.total_funded / Number(s.amount)) * 100) : 0;
                return (
                  <Card key={s.id}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-primary break-words">{s.type} — {Number(s.amount).toLocaleString("en-US")} ر.س</h3>
                      <Badge variant={s.status === "completed" ? "success" : s.status === "rejected" ? "danger" : "warning"}>{labelAr(SPONSORSHIP_STATUS_AR, s.status)}</Badge>
                    </div>
                    <p className="mb-2 text-xs text-brand-gray break-words">{s.description}</p>
                    <div className="mb-2"><span className="me-2 text-sm">مموّل {s.total_funded} / {Number(s.amount)} ({pct}%)</span><ProgressBar value={pct} /></div>
                    {!s.is_fully_funded && s.status !== "rejected" && s.status !== "completed" && (
                      <Button variant="secondary" aria-label={`تبرّع للكفالة ${s.id}`} onClick={() => { setContribTarget(s); setContribAmount(String(s.remaining)); }}>
                        تبرّع / Contribute
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!contribTarget} onClose={() => setContribTarget(null)} title="تبرّع للكفالة">
        <p className="mb-3 text-sm text-brand-gray">سيتم تحويلك إلى المتجر الخارجي لإتمام التبرّع. المتبقّي: {contribTarget?.remaining} ر.س</p>
        <Input type="number" label="مبلغ التبرّع" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={contribute} disabled={redirecting}>{redirecting ? "جاري التحويل…" : "متابعة للمتجر"}</Button>
          <Button variant="secondary" onClick={() => setContribTarget(null)}>إلغاء</Button>
        </div>
      </Modal>
    </SaqyaShell>
  );
}
