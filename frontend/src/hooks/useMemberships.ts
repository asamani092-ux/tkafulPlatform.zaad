import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export interface Membership {
  project: number;
  project_slug: string;
  project_name: string;
  role: string;
  project_tools?: string[];
}

interface MembershipsState {
  loading: boolean;
  isSuperAdmin: boolean;
  memberships: Membership[];
}

/** عضويات المستخدم الحالي في المشاريع (للوحة الأدمن الموحّدة role-scoped). */
export function useMemberships(): MembershipsState {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<MembershipsState>({
    loading: true,
    isSuperAdmin: false,
    memberships: [],
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setState({ loading: false, isSuperAdmin: false, memberships: [] });
      return;
    }
    let cancelled = false;
    authFetch("/api/platform/my-memberships/")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch");
        const data = await res.json();
        if (!cancelled) {
          setState({
            loading: false,
            isSuperAdmin: !!data.is_super_admin,
            memberships: data.memberships || [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            loading: false,
            isSuperAdmin: user?.role === "admin",
            memberships: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role]);

  return state;
}
