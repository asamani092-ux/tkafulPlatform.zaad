import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import NotificationPreferencesPanel from "../../notifications/NotificationPreferencesPanel";

/** إعدادات حساب الإدارة — تفضيلات الإشعارات داخل AdminShell دون الخروج للبوابة. */
export default function AdminAccountSettings() {
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">إعدادات الحساب</h1>
      <Card>
        <NotificationPreferencesPanel />
      </Card>
    </AdminShell>
  );
}
