import AdminShell from "../../layout/AdminShell";
import AdminPortal from "../saqya/AdminPortal";
import { Link, useParams } from "react-router-dom";

/**
 * إدارة كفالات مشروع داخل غلاف لوحة الإدارة (جلسة مشتركة، بلا خروج منفصل).
 * المسار العام /projects/:slug/sponsorships يبقى لبوابة المتبرّع/المورّد/المندوب.
 */
export default function ProjectSponsorshipsAdmin() {
  const { slug } = useParams();
  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">إدارة الكفالات</h1>
          <p className="text-sm text-brand-gray">ضمن لوحة الإدارة — المشروع: {slug}</p>
        </div>
        <Link to="/Admin/projects" className="text-sm font-bold text-primary hover:underline">
          ← العودة للمشاريع
        </Link>
      </div>
      <AdminPortal projectSlug={slug} embedded />
    </AdminShell>
  );
}
