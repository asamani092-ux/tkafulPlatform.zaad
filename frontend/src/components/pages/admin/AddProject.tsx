import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { API_BASE_URL } from "../../../config";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";

const EMPTY = {
  title: "", category: "", desc: "", target_audience: "", beneficiaries: "",
  location: "", donation_amount: "", start_date: "", end_date: "",
  implementation_requirements: "", project_goals: "",
};

export default function AddProjectPage() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category) { error({ title: "حقول مطلوبة", description: "اسم المشروع ونوعه مطلوبان" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/projects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
        body: JSON.stringify({
          ...form,
          beneficiaries: Number(form.beneficiaries) || 0,
          donation_amount: Number(form.donation_amount) || 0,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم إضافة المشروع بنجاح" });
      setForm(EMPTY);
    } catch { error({ title: "خطأ", description: "تعذّر إضافة المشروع" }); }
    setSubmitting(false);
  };

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">إضافة مشروع</h1>
      <Card>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="اسم المشروع" value={form.title} onChange={(e) => set("title", e.target.value)} />
          <Select label="نوع المشروع" value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">اختر النوع</option><option value="أساسي">أساسي</option><option value="مجتمعي">مجتمعي</option><option value="مؤسسي">مؤسسي</option>
          </Select>
          <Input label="الفئة المستهدفة" value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)} />
          <Input type="number" label="عدد المستفيدين" value={form.beneficiaries} onChange={(e) => set("beneficiaries", e.target.value)} />
          <Input label="موقع التنفيذ" value={form.location} onChange={(e) => set("location", e.target.value)} />
          <Input type="number" label="مبلغ التبرع" value={form.donation_amount} onChange={(e) => set("donation_amount", e.target.value)} />
          <Input type="date" label="تاريخ البداية" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          <Input type="date" label="تاريخ الانتهاء المتوقع" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          <div className="md:col-span-2">
            <label className="label-field">وصف المشروع</label>
            <textarea className="input-field" style={{ resize: "none" }} rows={3} value={form.desc} onChange={(e) => set("desc", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">متطلبات التنفيذ</label>
            <textarea className="input-field" style={{ resize: "none" }} rows={2} value={form.implementation_requirements} onChange={(e) => set("implementation_requirements", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">أهداف المشروع</label>
            <textarea className="input-field" style={{ resize: "none" }} rows={2} value={form.project_goals} onChange={(e) => set("project_goals", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>{submitting ? "جاري الحفظ…" : "إضافة المشروع"}</Button>
          </div>
        </form>
      </Card>
    </AdminShell>
  );
}
