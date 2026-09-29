import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import HeroBand from "../ui/HeroBand";

export default function Services() {
  return (
    <div>
      <HeroBand title="الخدمات" subtitle="طلبات الخدمة المجتمعية — فرص التطوّع في صفحة المتطوعين." />
      <main className="mx-auto max-w-page px-4 py-10">
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-primary">طلب خدمة</h3>
                <p className="text-sm text-brand-gray">
                  إرسال لمرة واحدة — يمكنك مسح الحقول قبل الإرسال؛ التعديل بعد الإرسال من لوحة الإدارة فقط.
                </p>
              </div>
              <ClipboardList className="text-secondary" size={32} />
            </div>
            <Link to="/request-service"><Button variant="secondary">قدّم طلباً</Button></Link>
          </Card>
          <Card>
            <div className="mb-4">
              <h3 className="mb-2 text-xl font-bold text-primary">التطوّع</h3>
              <p className="text-sm text-brand-gray">
                فرص التطوّع وإحصاءات المتطوعين في صفحة واحدة — اختر مشروعاً وانضم عبر صفحة المشروع.
              </p>
            </div>
            <Link to="/volunteers"><Button variant="secondary">عرض فرص التطوّع</Button></Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
