import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Switch from "../../ui/Switch";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { useToast } from "../../../contexts/ToastContext";
import { usePlatformSettings, type RolesCanLogin } from "../../../contexts/PlatformSettingsContext";
import { authFetch } from "../../../lib/api";
import { extractErrorDetail } from "../../../admin/userManagement";
import { type CapabilityRow, type RoleRow } from "../../../admin/rolesMatrix";

interface Catalog {
  roles: RoleRow[];
  capabilities: CapabilityRow[];
}

/** إدارة الأدوار — القدرات ثابتة (SAFE)؛ تفعيل الدخول قابل للتعديل. */
export default function RolesAdmin() {
  const toast = useToast();
  const { applyPublicSettings } = usePlatformSettings();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [rolesCanLogin, setRolesCanLogin] = useState<RolesCanLogin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [rolesRes, settingsRes] = await Promise.all([
        authFetch("/api/roles/"),
        authFetch("/api/settings/"),
      ]);
      if (!rolesRes.ok || !settingsRes.ok) throw new Error("fetch");
      const [rolesData, settingsData] = await Promise.all([rolesRes.json(), settingsRes.json()]);
      setCatalog(rolesData as Catalog);
      setRolesCanLogin(settingsData.roles_can_login as RolesCanLogin);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLogin = async (roleId: keyof RolesCanLogin, next: boolean) => {
    if (!rolesCanLogin) return;
    const updated = { ...rolesCanLogin, [roleId]: next };
    setSavingRole(roleId);
    try {
      const res = await authFetch("/api/settings/", {
        method: "PATCH",
        body: JSON.stringify({ roles_can_login: updated }),
      });
      if (!res.ok) {
        toast.error({ title: extractErrorDetail(await res.json().catch(() => null)) });
        return;
      }
      const data = await res.json();
      setRolesCanLogin(data.roles_can_login as RolesCanLogin);
      applyPublicSettings({ roles_can_login: data.roles_can_login });
      toast.success({ title: next ? "تم تفعيل الدخول للدور" : "تم تعطيل الدخول — بيانات فقط" });
    } finally {
      setSavingRole(null);
    }
  };

  const capLabel = (capId: string) =>
    catalog?.capabilities.find((c) => c.id === capId)?.label ?? capId;

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">الأدوار وتفعيل الدخول</h1>
      <p className="mb-4 text-sm text-brand-gray">
        القدرات ثابتة لحماية النظام؛ تفعيل الدخول قابل للتغيير حسب جهتك.
      </p>
      {loading && <LoadingState />}
      {error && <ErrorState message="تعذّر تحميل الأدوار أو الإعدادات" />}
      {catalog && rolesCanLogin && (
        <div className="space-y-4">
          {catalog.roles.map((role) => {
            const canLogin = Boolean(rolesCanLogin[role.id as keyof RolesCanLogin]);
            const caps = role.capabilities;
            return (
              <Card key={role.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-primary">{role.label}</h2>
                    {role.description && (
                      <p className="mt-0.5 text-xs text-brand-gray">{role.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!canLogin && (
                      <Badge variant="warning">بيانات فقط — لا يسجّل الدخول، يُدار من الإدارة</Badge>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-bold text-primary">القدرات (قراءة فقط)</h3>
                  {caps.length === 0 ? (
                    <p className="text-sm text-brand-gray">لا قدرات إدارية — دور بيانات فقط.</p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                      {caps.map((capId) => (
                        <li key={capId} className="flex items-start gap-1.5">
                          <span className="font-bold text-primary" aria-hidden="true">✓</span>
                          <span>{capLabel(capId)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Switch
                  label="تفعيل تسجيل الدخول"
                  hint={role.id === "admin" ? "لا يمكن تعطيل دخول المشرف" : undefined}
                  checked={canLogin}
                  disabled={role.id === "admin" || savingRole === role.id}
                  onChange={(v) => void toggleLogin(role.id as keyof RolesCanLogin, v)}
                />
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
