import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useMembershipsContext } from "../../contexts/MembershipsContext";
import { canAccessAdminPath } from "../../admin/access";
import { LoadingState } from "../feedback/PageStates";

const ORG_STAFF_ROLES = ["admin", "manager", "employee"];

type RequiredRole = "admin" | "authenticated" | "staff" | "orgStaff";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: RequiredRole;
  signInPath?: string;
}

function StaffGate({ children, signInPath }: { children: ReactNode; signInPath: string }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { loading, access } = useMembershipsContext();

  if (!isAuthenticated) {
    return <Navigate to={signInPath} replace state={{ from: location.pathname }} />;
  }
  if (loading) return <LoadingState title="جاري التحقق من الصلاحيات…" />;
  if (!canAccessAdminPath(location.pathname, access)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}

/** يحمي المسارات حسب الدور — يُحوّل غير المصرّح لصفحة الدخول أو 403. */
export default function ProtectedRoute({
  children,
  requiredRole,
  signInPath = "/signin",
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const { loading, isSuperAdmin, access } = useMembershipsContext();

  if (requiredRole === "staff") {
    return <StaffGate signInPath={signInPath}>{children}</StaffGate>;
  }

  if (!isAuthenticated) {
    return <Navigate to={signInPath} replace state={{ from: location.pathname }} />;
  }

  if (requiredRole === "admin") {
    if (loading) return <LoadingState title="جاري التحقق من الصلاحيات…" />;
    if (!access.isGlobalAdmin) return <Navigate to="/403" replace />;
  }

  if (requiredRole === "orgStaff" && !ORG_STAFF_ROLES.includes(user?.role || "")) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
