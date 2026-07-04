import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import DonorPortal from "./DonorPortal";
import SupplierPortal from "./SupplierPortal";
import RepresentativePortal from "./RepresentativePortal";
import AdminPortal from "./AdminPortal";
import Card from "../../ui/Card";
import Button from "../../ui/Button";

/**
 * موزّع بوابات كفالات السقيا حسب دور المستخدم.
 * admin -> لوحة المشرف، donor/supplier/representative -> بوابته.
 */
export default function SaqyaHome() {
  const { user, isAuthenticated } = useAuth();

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

  switch (user.role) {
    case "admin": return <AdminPortal />;
    case "donor": return <DonorPortal />;
    case "supplier": return <SupplierPortal />;
    case "representative": return <RepresentativePortal />;
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
