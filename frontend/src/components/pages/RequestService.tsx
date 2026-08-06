import { useState, useEffect } from "react";
import { useToast } from "../../contexts/ToastContext";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import HeroBand from "../ui/HeroBand";
import Stepper from "../ui/Stepper";
import Breadcrumb from "../ui/Breadcrumb";

interface Service {
  id: number;
  title: string;
}

const STEPS = [
  { key: "service", label: "اختيار الخدمة" },
  { key: "beneficiary", label: "بيانات المستفيد" },
  { key: "details", label: "التفاصيل والإرسال" },
];

export default function RequestService() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ service: "", beneficiary_name: "", beneficiary_contact: "", details: "" });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public-services/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setServices(d.results || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.service || !formData.beneficiary_name || !formData.beneficiary_contact) {
      error({ title: "الرجاء ملء جميع الحقول المطلوبة", description: "نوع الخدمة والاسم ومعلومات التواصل مطلوبة" });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/public-service-request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم إرسال طلبك بنجاح", description: "سيتم مراجعة طلبك والتواصل معك قريباً" });
      setFormData({ service: "", beneficiary_name: "", beneficiary_contact: "", details: "" });
      setStep(0);
    } catch {
      error({ title: "حدث خطأ", description: "لم يتم إرسال الطلب، حاول مرة أخرى" });
    }
  };

  return (
    <div>
      <HeroBand title="طلب خدمة" subtitle="املأ النموذج وسنراجع طلبك في أقرب وقت." />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Breadcrumb items={[{ label: "الرئيسية", href: "/" }, { label: "طلب خدمة" }]} />
        <Card>
          <Stepper steps={STEPS} current={step} />
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 0 && (
              <>
                <Select label="نوع الخدمة" value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} disabled={loading} required>
                  <option value="">{loading ? "جاري التحميل…" : "اختر الخدمة المطلوبة"}</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </Select>
                <Button type="button" className="w-full" disabled={!formData.service} onClick={() => setStep(1)}>التالي</Button>
              </>
            )}
            {step === 1 && (
              <>
                <Input label="اسم المستفيد" placeholder="مثال: مسجد النور، محمد أحمد…" value={formData.beneficiary_name} onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })} required />
                <Input label="معلومات التواصل" placeholder="رقم الجوال أو البريد الإلكتروني" value={formData.beneficiary_contact} onChange={(e) => setFormData({ ...formData, beneficiary_contact: e.target.value })} required />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(0)}>رجوع</Button>
                  <Button type="button" className="flex-1" disabled={!formData.beneficiary_name || !formData.beneficiary_contact} onClick={() => setStep(2)}>التالي</Button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div>
                  <label className="label-field" htmlFor="details">تفاصيل الطلب</label>
                  <textarea
                    id="details"
                    rows={4}
                    className="input-field"
                    style={{ resize: "none" }}
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    placeholder="اكتب تفاصيل إضافية عن احتياجاتك…"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)}>رجوع</Button>
                  <Button type="submit" className="flex-1">إرسال الطلب</Button>
                </div>
              </>
            )}
          </form>
        </Card>
      </main>
    </div>
  );
}
