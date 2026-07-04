import { useState } from "react";
import { API_BASE_URL, EXTERNAL_STORE_URL } from "../../../config";
import Modal from "../../ui/Modal";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Select from "../../ui/Select";
import type { MapProduct, MapRegion, ContributionMode } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  region: MapRegion | null;
  products: MapProduct[];
  defaultProductSlug?: string;
}

/** نافذة التعهد — توزيع ذاتي أو تفويض للجمعية (متجر خارجي). */
export default function ContributionModal({ open, onClose, region, products, defaultProductSlug }: Props) {
  const [mode, setMode] = useState<ContributionMode>("self_distribution");
  const [form, setForm] = useState({
    name: "", phone: "", product: defaultProductSlug || products[0]?.slug || "",
    quantity: "1", note: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/map/contributions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          region: region.slug,
          product: form.product,
          quantity: Number(form.quantity),
          mode: "self_distribution",
          note: form.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.phone?.[0] || data.quantity?.[0] || data.detail || "تعذّر إرسال التعهد";
        setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
        return;
      }
      onClose();
    } catch {
      setErr("تعذّر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  };

  const delegate = () => {
    if (!region || !form.product) return;
    if (!EXTERNAL_STORE_URL) return;
    const url = new URL(EXTERNAL_STORE_URL);
    url.searchParams.set("product", form.product);
    url.searchParams.set("region", region.slug);
    window.location.href = url.toString();
  };

  if (!region) return null;

  return (
    <Modal open={open} onClose={onClose} title={`تعهد — ${region.name}`} wide>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={`btn-secondary${mode === "self_distribution" ? " ring-2 ring-primary" : ""}`}
          onClick={() => setMode("self_distribution")}>توزيع ذاتي</button>
        <button type="button" className={`btn-secondary${mode === "delegate_association" ? " ring-2 ring-primary" : ""}`}
          onClick={() => setMode("delegate_association")}>تفويض للجمعية</button>
      </div>

      {!EXTERNAL_STORE_URL && mode === "delegate_association" && (
        <div className="mb-3"><Badge variant="warning">تجريبي — بانتظار رابط المتجر</Badge></div>
      )}

      <Select label="المنتج" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
        {products.map((p) => (
          <option key={p.slug} value={p.slug}>{p.icon} {p.name}</option>
        ))}
      </Select>

      {mode === "self_distribution" ? (
        <form className="mt-4 space-y-3" onSubmit={submitSelf}>
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="05XXXXXXXX" dir="ltr" required />
          <Input label="الكمية" type="number" min={1} max={1000} value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <Input label="ملاحظة (اختياري)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit" disabled={busy}>{busy ? "جاري الإرسال…" : "إرسال التعهد"}</Button>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-brand-gray">سيتم تحويلك للمتجر الخارجي لإتمام التبرّع نيابة عن الجمعية.</p>
          <Button onClick={delegate} disabled={!EXTERNAL_STORE_URL}>الانتقال للمتجر</Button>
        </div>
      )}
    </Modal>
  );
}
