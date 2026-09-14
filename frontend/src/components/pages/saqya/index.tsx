import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { usePlatformSettings } from "../../../contexts/PlatformSettingsContext";
import DonorPortal from "./DonorPortal";
import SupplierPortal from "./SupplierPortal";
import RepresentativePortal from "./RepresentativePortal";
import AdminPortal from "./AdminPortal";
import Card from "../../ui/Card";
import Button from "../../ui/Button";

/**
 * موزّع بوابات كفالات السقيا حسب دور المستخدم.
 * البوابات تبقى في الشجرة؛ تُعرض فقط إن roles_can_login[role] === true.
 */
export default function SaqyaHome() {
  const { user, isAuthenticated } = useAuth();
  const { settings } = usePlatformSettings();
  const { slug } = useParams();
  const canLogin = settings.roles_can_login || {};

  if (!isAuthenticated || !user) {
    return (
      <div className="page-shell p-10 text-center" dir="rtl">
        <Card>
          <h2 className="mb-2 text-xl font-bold text-primary">كفالات السقيا</h2>
          <p className="text-brand-gray">الرجاء تسجيل الدخول للوصول إلى بوابتك.</p>
          <Link to="/signin" className="mt-4 inline-block"><Button>تسجيل الدخول</Button></Link>
        </Card>
      </div>
    );
  }

  const role = user.role;
  if (
    role !== "admin" &&
    role !== "manager" &&
    role !== "employee" &&
    canLogin[role as keyof typeof canLogin] === false
  ) {
    return (
      <div className="page-shell p-10 text-center" dir="rtl">
        <Card>
          <h2 className="mb-2 text-xl font-bold text-primary">الدخول غير مفعّل</h2>
          <p className="text-brand-gray">هذا الدور معطّل في إعدادات المنصّة (403).</p>
        </Card>
      </div>
    );
  }

  switch (role) {
    case "admin":
    case "manager":
      return <AdminPortal projectSlug={slug} />;
    case "donor":
      return <DonorPortal projectSlug={slug} />;
    case "supplier":
      return <SupplierPortal />;
    case "representative":
      return <RepresentativePortal />;
    default:
      return (
        <div className="page-shell p-10 text-center" dir="rtl">
          <Card>
            <h2 className="mb-2 text-xl font-bold text-primary">غير متاح لدورك</h2>
            <p className="text-brand-gray">وحدة كفالات السقيا متاحة للمتبرّعين والموردين والمندوبين والمشرفين.</p>
          </Card>
        </div>
      );
  }
}
