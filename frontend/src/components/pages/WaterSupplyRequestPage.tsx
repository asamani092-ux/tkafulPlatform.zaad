import { useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import HeroBand from "../ui/HeroBand";

interface FormData {
  applicantName: string;
  mobileNumber: string;
  applicantRole: string;
  mosqueName: string;
  neighborhood: string;
  locationLink: string;
  worshippersCount: string;
  donorExists: string;
  donorName: string;
  donorPhone: string;
}

const EMPTY: FormData = {
  applicantName: "", mobileNumber: "", applicantRole: "", mosqueName: "", neighborhood: "",
  locationLink: "", worshippersCount: "", donorExists: "", donorName: "", donorPhone: "",
};

export default function WaterSupplyRequestPage() {
  const { success, error } = useToast();
  const [formData, setFormData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (name: keyof FormData, value: string) => {
    if (name === "donorExists" && value === "لا") {
      setFormData((p) => ({ ...p, donorExists: value, donorName: "", donorPhone: "" }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
    setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.applicantName.trim()) e.applicantName = "اسم مقدم الطلب مطلوب";
    if (!formData.mobileNumber.trim()) e.mobileNumber = "رقم الجوال مطلوب";
    else if (!/^\d{9}$/.test(formData.mobileNumber)) e.mobileNumber = "9 أرقام فقط (بدون +966)";
    if (!formData.applicantRole) e.applicantRole = "اختر صفة مقدم الطلب";
    if (!formData.mosqueName.trim()) e.mosqueName = "اسم المسجد مطلوب";
    if (!formData.neighborhood.trim()) e.neighborhood = "اسم الحي مطلوب";
    if (!formData.locationLink.trim()) e.locationLink = "رابط الموقع مطلوب";
    else if (!/^https?:\/\//.test(formData.locationLink)) e.locationLink = "الرابط يجب أن يبدأ بـ http:// أو https://";
    if (!formData.worshippersCount.trim()) e.worshippersCount = "عدد المصلين مطلوب";
    else if (isNaN(Number(formData.worshippersCount)) || Number(formData.worshippersCount) <= 0) e.worshippersCount = "أدخل رقمًا موجبًا";
    if (!formData.donorExists) e.donorExists = "أجب على سؤال المتبرع";
    if (formData.donorExists === "نعم") {
      if (!formData.donorName.trim()) e.donorName = "اسم المتبرع مطلوب";
      if (!formData.donorPhone.trim()) e.donorPhone = "رقم جوال المتبرع مطلوب";
      else if (!/^\d{9}$/.test(formData.donorPhone)) e.donorPhone = "9 أرقام فقط (بدون +966)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public-water-supply-request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم إرسال طلبك بنجاح", description: "شكرًا لتقديمك طلب سقيا الماء، سيتم التواصل معك قريبًا." });
      setFormData(EMPTY);
      setErrors({});
    } catch {
      error({ title: "حدث خطأ", description: "فشل في إرسال الطلب، حاول مرة أخرى." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <HeroBand title="طلب سقيا الماء" subtitle="يرجى تعبئة البيانات التالية لإرسال طلب سقيا الماء للمسجد." />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <h2 className="mb-4 text-xl font-bold text-primary">بيانات مقدم الطلب</h2>
            <div className="space-y-4">
              <Input label="اسم مقدم الطلب" value={formData.applicantName} onChange={(e) => set("applicantName", e.target.value)} error={errors.applicantName} />
              <Input dir="ltr" inputMode="tel" maxLength={9} label="رقم الجوال (بدون +966)" placeholder="5XXXXXXXX" value={formData.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value.replace(/\D/g, ""))} error={errors.mobileNumber} />
              <Select label="صفة مقدم الطلب" value={formData.applicantRole} onChange={(e) => set("applicantRole", e.target.value)} error={errors.applicantRole}>
                <option value="">اختر الصفة</option>
                <option value="إمام">إمام</option>
                <option value="مؤذن">مؤذن</option>
                <option value="غير ذلك">غير ذلك</option>
              </Select>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xl font-bold text-primary">بيانات المسجد</h2>
            <div className="space-y-4">
              <Input label="اسم المسجد" value={formData.mosqueName} onChange={(e) => set("mosqueName", e.target.value)} error={errors.mosqueName} />
              <Input label="اسم الحي" value={formData.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} error={errors.neighborhood} />
              <Input dir="ltr" type="url" label="رابط موقع المسجد" placeholder="https://maps.google.com/..." value={formData.locationLink} onChange={(e) => set("locationLink", e.target.value)} error={errors.locationLink} />
              <Input type="number" min={1} label="عدد المصلين تقريباً" placeholder="مثال: 200" value={formData.worshippersCount} onChange={(e) => set("worshippersCount", e.target.value)} error={errors.worshippersCount} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xl font-bold text-primary">معلومات المتبرع</h2>
            <div className="space-y-4">
              <Select label="هل يوجد متبرع للمسجد؟" value={formData.donorExists} onChange={(e) => set("donorExists", e.target.value)} error={errors.donorExists}>
                <option value="">اختر الإجابة</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </Select>
              {formData.donorExists === "نعم" && (
                <>
                  <Input label="اسم المتبرع" value={formData.donorName} onChange={(e) => set("donorName", e.target.value)} error={errors.donorName} />
                  <Input dir="ltr" inputMode="tel" maxLength={9} label="رقم جوال المتبرع (بدون +966)" placeholder="5XXXXXXXX" value={formData.donorPhone} onChange={(e) => set("donorPhone", e.target.value.replace(/\D/g, ""))} error={errors.donorPhone} />
                </>
              )}
            </div>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "جاري الإرسال…" : "إرسال"}
          </Button>
        </form>
      </main>
    </div>
  );
}
