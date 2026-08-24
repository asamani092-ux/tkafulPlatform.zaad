import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authFetch } from "../lib/api";
import { useAuth } from "./AuthContext";
import { buildAdminAccess, type AdminAccessContext } from "../admin/access";

export interface Membership {
  project: number;
  project_slug: string;
  project_name: string;
  role: string;
  project_tools?: string[];
}

interface MembershipsContextValue {
  loading: boolean;
  isSuperAdmin: boolean;
  memberships: Membership[];
  access: AdminAccessContext;
  /** إعادة جلب العضويات بعد إضافة/إزالة عضو — O(1) استدعاء شبكة. */
  reloadMemberships: () => Promise<void>;
}

const MembershipsContext = createContext<MembershipsContextValue | undefined>(undefined);

export function MembershipsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const reloadMemberships = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setIsSuperAdmin(false);
      setMemberships([]);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/platform/my-memberships/");
      if (!res.ok) throw new Error("fetch");
      const data = await res.json();
      setIsSuperAdmin(!!data.is_super_admin);
      setMemberships(data.memberships || []);
    } catch {
      setIsSuperAdmin(user?.role === "admin");
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    void reloadMemberships();
  }, [reloadMemberships]);

  const access = useMemo(
    () => buildAdminAccess(user?.role, isSuperAdmin, memberships),
    [user?.role, isSuperAdmin, memberships],
  );

  const value = useMemo(
    () => ({ loading, isSuperAdmin, memberships, access, reloadMemberships }),
    [loading, isSuperAdmin, memberships, access, reloadMemberships],
  );

  return <MembershipsContext.Provider value={value}>{children}</MembershipsContext.Provider>;
}

export function useMembershipsContext(): MembershipsContextValue {
  const ctx = useContext(MembershipsContext);
  if (!ctx) {
    throw new Error("useMembershipsContext must be used within MembershipsProvider");
  }
  return ctx;
}
