import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useMemberships } from "../../hooks/useMemberships";
import { LoadingState } from "../feedback/PageStates";

// staff = مشرف عام أو عضو مشروع (project_admin/editor/viewer) — للوحة الأدمن الموحّدة
// orgStaff = طاقم المؤسسة (admin/manager/employee) — اللوحة التنفيذية (يطابق IsStaffOrReadOnly في الباك إند)
type RequiredRole = "admin" | "authenticated" | "staff" | "orgStaff";

const ORG_STAFF_ROLES = ["admin", "manager", "employee"];

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: RequiredRole;
  signInPath?: string;
}

function StaffGate({ children, signInPath }: { children: ReactNode; signInPath: string }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const { loading, isSuperAdmin, memberships } = useMemberships();

  if (!isAuthenticated) {
    return <Navigate to={signInPath} replace state={{ from: location.pathname }} />;
  }
  if (user?.role === "admin") return <>{children}</>;
  if (loading) return <LoadingState title="جاري التحقق من الصلاحيات…" />;
  if (isSuperAdmin || memberships.length > 0) return <>{children}</>;
  return <Navigate to="/403" replace />;
}

/** يحمي المسارات حسب الدور — يُحوّل غير المصرّح لصفحة الدخول أو 403. */
export default function ProtectedRoute({
  children,
  requiredRole,
  signInPath = "/signin",
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (requiredRole === "staff") {
    return <StaffGate signInPath={signInPath}>{children}</StaffGate>;
  }

  if (!isAuthenticated) {
    return <Navigate to={signInPath} replace state={{ from: location.pathname }} />;
  }

  if (requiredRole === "admin" && user?.role !== "admin") {
    return <Navigate to="/403" replace />;
  }

  if (requiredRole === "orgStaff" && !ORG_STAFF_ROLES.includes(user?.role || "")) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
