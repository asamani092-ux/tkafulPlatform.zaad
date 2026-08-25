import { useEffect, useState } from "react";
import AdminShell from "../../layout/AdminShell";
import Card from "../../ui/Card";
import { LoadingState, ErrorState } from "../../feedback/PageStates";
import { authFetch } from "../../../lib/api";
import { roleHasCapability, type CapabilityRow, type RoleRow } from "../../../admin/rolesMatrix";

interface Catalog {
  roles: RoleRow[];
  capabilities: CapabilityRow[];
}

/** مصفوفة الأدوار × القدرات — قراءة فقط. */
export default function RolesAdmin() {
  const [data, setData] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    authFetch("/api/roles/")
      .then((r) => {
        if (!r.ok) throw new Error("fetch");
        return r.json();
      })
      .then((payload: Catalog) => setData(payload))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <h1 className="mb-2 text-2xl font-bold text-primary">الأدوار والصلاحيات</h1>
      <p className="mb-4 text-sm text-brand-gray">
        الأدوار ثابتة في النظام. راجع هذه المصفوفة قبل تعيين الدور من صفحة المستخدمين.
      </p>
      {loading && <LoadingState />}
      {error && <ErrorState message="تعذّر تحميل كتالوج الأدوار" />}
      {data && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky start-0 bg-surface p-2 text-start font-bold text-primary">القدرة</th>
                {data.roles.map((role) => (
                  <th key={role.id} className="p-2 text-center font-bold text-primary" title={role.description}>
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.capabilities.map((cap) => (
                <tr key={cap.id} className="border-t border-surface-border">
                  <td className="sticky start-0 bg-surface p-2 font-semibold text-primary">{cap.label}</td>
                  {data.roles.map((role) => {
                    const on = roleHasCapability(role, cap.id);
                    return (
                      <td key={role.id} className="p-2 text-center" aria-label={`${role.label}: ${on ? "مسموح" : "غير مسموح"}`}>
                        {on ? <span className="font-bold text-primary">✓</span> : <span className="text-brand-gray">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AdminShell>
  );
}
