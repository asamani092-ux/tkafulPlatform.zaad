import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
}

const MembershipsContext = createContext<MembershipsContextValue | undefined>(undefined);

export function MembershipsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setIsSuperAdmin(false);
      setMemberships([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    authFetch("/api/platform/my-memberships/")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch");
        const data = await res.json();
        if (cancelled) return;
        setIsSuperAdmin(!!data.is_super_admin);
        setMemberships(data.memberships || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsSuperAdmin(user?.role === "admin");
        setMemberships([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role]);

  const access = useMemo(
    () => buildAdminAccess(user?.role, isSuperAdmin, memberships),
    [user?.role, isSuperAdmin, memberships],
  );

  const value = useMemo(
    () => ({ loading, isSuperAdmin, memberships, access }),
    [loading, isSuperAdmin, memberships, access],
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
