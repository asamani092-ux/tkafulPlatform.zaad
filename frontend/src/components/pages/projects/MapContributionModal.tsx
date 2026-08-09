import { useState } from "react";
import { EXTERNAL_STORE_URL } from "../../../config";
import Modal from "../../ui/Modal";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Select from "../../ui/Select";
import { submitMapContribution } from "./api";
import { optionLabel, optionValue } from "./filters";
import type { MapFieldDef, PublicMapItem } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  mapId: number;
  item: PublicMapItem | null;
  fields: MapFieldDef[];
  donationUrl?: string;
  donationLabel?: string;
}

/** نافذة التعهد للخرائط الجديدة — تُرسل إلى /api/maps/public/{id}/contributions/. */
export default function MapContributionModal({
  open, onClose, mapId, item, fields, donationUrl = "", donationLabel = "تبرع الآن",
}: Props) {
  const storeUrl = donationUrl || EXTERNAL_STORE_URL;
  const categoryField = fields.find((f) => f.key === "product" && f.type === "select");
  const [mode, setMode] = useState<"self_distribution" | "delegate_association">("self_distribution");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    category: categoryField ? optionValue(categoryField.options[0] ?? "") : "",
    quantity: "1",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submitSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const result = await submitMapContribution(mapId, {
      item: item?.id ?? null,
      category: form.category,
      name: form.name,
      phone: form.phone,
      mode: "self_distribution",
      quantity: Number(form.quantity),
      note: form.note,
    });
    setBusy(false);
    if (!result.ok) {
      setErr(result.error || "تعذّر إرسال التعهد");
      return;
    }
    setDone(true);
  };

  const delegate = () => {
    if (!storeUrl) return;
    const url = new URL(storeUrl);
    if (form.category) url.searchParams.set("product", form.category);
    if (item) url.searchParams.set("item", String(item.id));
    window.location.href = url.toString();
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? `تعهد — ${item.name}` : "تعهد عام"} wide>
      {done ? (
        <div className="space-y-3 text-center">
          <p className="text-sm font-bold text-primary">تم استلام تعهدكم بنجاح</p>
          <Button onClick={onClose}>إغلاق</Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className={`btn-secondary${mode === "self_distribution" ? " ring-2 ring-primary" : ""}`}
              onClick={() => setMode("self_distribution")}>توزيع ذاتي</button>
            <button type="button" className={`btn-secondary${mode === "delegate_association" ? " ring-2 ring-primary" : ""}`}
              onClick={() => setMode("delegate_association")}>تفويض للجمعية</button>
          </div>

          {mode === "delegate_association" && !storeUrl && (
            <div className="mb-3"><Badge variant="warning">تجريبي — بانتظار رابط التبرع (يُضبط من إدارة المشاريع)</Badge></div>
          )}

          {categoryField && (
            <Select label={categoryField.label} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categoryField.options.map((o) => (
                <option key={optionValue(o)} value={optionValue(o)}>{optionLabel(o)}</option>
              ))}
            </Select>
          )}

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
              <p className="text-sm text-brand-gray">سيتم تحويلك لإتمام التبرّع نيابة عن الجمعية.</p>
              {storeUrl ? (
                <Button onClick={delegate}>{donationLabel}</Button>
              ) : null}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
