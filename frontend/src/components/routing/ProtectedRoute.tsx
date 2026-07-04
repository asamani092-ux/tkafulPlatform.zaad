import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

type RequiredRole = "admin" | "authenticated";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: RequiredRole;
  signInPath?: string;
}

/** يحمي المسارات حسب الدور — يُحوّل غير المصرّح لصفحة الدخول أو 403. */
export default function ProtectedRoute({
  children,
  requiredRole,
  signInPath = "/signin",
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={signInPath} replace state={{ from: location.pathname }} />;
  }

  if (requiredRole === "admin" && user?.role !== "admin") {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
