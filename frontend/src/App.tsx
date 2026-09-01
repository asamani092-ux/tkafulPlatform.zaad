import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { registerSessionExpiredHandler } from "./lib/authEvents";
import { PlatformSettingsProvider } from "./contexts/PlatformSettingsContext";
import { MembershipsProvider } from "./contexts/MembershipsContext";
import { ToastProvider } from "./contexts/ToastContext";
import { DashboardSettingsProvider } from "./contexts/DashboardSettingsContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import { LoadingState } from "./components/feedback/PageStates";
import { ForbiddenPage, NotFoundPage } from "./components/pages/ErrorPages";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { ACTIVE_LEGACY_REDIRECTS } from "./admin/domains";

// Public / general (eager — small landing pages)
import Home from "./components/pages/Home";
import Projects from "./components/pages/Projects";
import Services from "./components/pages/Services";
import Volunteers from "./components/pages/Volunteers";
import About from "./components/pages/About";
import Suggest from "./components/pages/Suggest";
import RequestService from "./components/pages/RequestService";
import WaterSupplyRequestPage from "./components/pages/WaterSupplyRequestPage";
import SignIn from "./components/pages/Auth/SignIn";
import SignUp from "./components/pages/Auth/SignUp";

// Code-split heavy portals
const UserMain = lazy(() => import("./components/pages/user/Main"));
const UserTasks = lazy(() => import("./components/pages/user/Task"));
const UserSettings = lazy(() => import("./components/pages/user/Setting"));
const PersonalInfo = lazy(() => import("./components/pages/user/PersonalInfo"));

const AdminMain = lazy(() => import("./components/pages/admin/main"));
const UsersAdmin = lazy(() => import("./components/pages/admin/UsersAdmin"));
const VolunteersAdmin = lazy(() => import("./components/pages/admin/VolunteersAdmin"));
const Reports = lazy(() => import("./components/pages/admin/Reports"));
const RequestFormsAdmin = lazy(() => import("./components/pages/admin/RequestFormsAdmin"));
const DynamicFormPage = lazy(() => import("./components/pages/DynamicFormPage"));

const ExecutiveDashboard = lazy(() => import("./components/pages/ExecutiveDashboard"));
const ManageDashboard = lazy(() => import("./components/pages/ManageDashboard"));
const SaqyaHome = lazy(() => import("./components/pages/saqya"));

const ProjectLanding = lazy(() => import("./components/pages/projects/ProjectLanding"));
const ProjectMapPage = lazy(() => import("./components/pages/projects/ProjectMapPage"));
const MapsAggregator = lazy(() => import("./components/pages/projects/MapsAggregator"));
const PlatformProjects = lazy(() => import("./components/pages/admin/PlatformProjects"));
const MapsAdmin = lazy(() => import("./components/pages/admin/MapsAdmin"));
const PlatformSettingsPage = lazy(() => import("./components/pages/admin/PlatformSettings"));
const BroadcastAdmin = lazy(() => import("./components/pages/admin/BroadcastAdmin"));
const RolesAdmin = lazy(() => import("./components/pages/admin/RolesAdmin"));
const ActivityLogAdmin = lazy(() => import("./components/pages/admin/ActivityLogAdmin"));
const ProjectTypesAdmin = lazy(() => import("./components/pages/admin/ProjectTypesAdmin"));
const PublicStaticPage = lazy(() => import("./components/pages/PublicStaticPage"));
// Dead-code-eliminated unless VITE_ENABLE_UAT === "true" (production builds omit the chunk).
const UatPage = import.meta.env.VITE_ENABLE_UAT === "true"
  ? lazy(() => import("./components/pages/uat"))
  : null;

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

/**
 * يربط انتهاء الجلسة (من طبقة الـ API) بتنقّل React Router دون إعادة تحميل (RC-B).
 * يتجاهل الإشعار إن كنا أصلاً في صفحة الدخول لتفادي الحلقات.
 */
function useSessionExpiryRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  useEffect(() => {
    return registerSessionExpiredHandler(() => {
      // تفريغ حالة السياق (مسح التخزين تم في طبقة الـ API) دون طلب شبكة إضافي.
      void logout();
      if (!location.pathname.toLowerCase().startsWith("/signin")) {
        const next = encodeURIComponent(location.pathname + location.search);
        navigate(`/signin?next=${next}`, { replace: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.pathname]);
}

function AppContent() {
  useSessionExpiryRedirect();
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();
  const isUserPage = pathname.startsWith("/user");
  const isAdminPage = pathname.startsWith("/admin");
  const isSaqyaPage =
    pathname.startsWith("/saqya") ||
    (pathname.startsWith("/projects/") && pathname.endsWith("/sponsorships"));
  const isErrorPage = pathname === "/403" || pathname === "/404";
  const hideChrome = isUserPage || isSaqyaPage || isAdminPage || isErrorPage;

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted" dir="rtl">
      {!hideChrome && <Navbar />}
      <main className="flex-1 overflow-x-hidden">
        <Routes>
          {/* —— الموقع العام —— */}
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/services" element={<Services />} />
          <Route path="/volunteers" element={<Volunteers />} />
          <Route path="/about" element={<About />} />
          <Route path="/pages/:slug" element={<Lazy><PublicStaticPage /></Lazy>} />
          <Route path="/suggest" element={<Suggest />} />
          <Route path="/request-service" element={<RequestService />} />
          <Route path="/services/water-supply" element={<WaterSupplyRequestPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />

          <Route path="/user/main" element={<Lazy><ProtectedRoute requiredRole="authenticated"><UserMain /></ProtectedRoute></Lazy>} />
          <Route path="/user/tasks" element={<Lazy><ProtectedRoute requiredRole="authenticated"><UserTasks /></ProtectedRoute></Lazy>} />
          <Route path="/user/settings" element={<Lazy><ProtectedRoute requiredRole="authenticated"><UserSettings /></ProtectedRoute></Lazy>} />
          <Route path="/user/personal-info" element={<Lazy><ProtectedRoute requiredRole="authenticated"><PersonalInfo /></ProtectedRoute></Lazy>} />

          {/* —— لوحة الإدارة بنطاقات العمل —— */}
          <Route path="/Admin" element={<Lazy><ProtectedRoute requiredRole="admin"><AdminMain /></ProtectedRoute></Lazy>} />

          {/* 1. المشاريع — الإنشاء داخل القائمة؛ /create يُحوّل توافقياً (domains.ts) */}
          <Route path="/Admin/projects" element={<Lazy><ProtectedRoute requiredRole="staff"><PlatformProjects /></ProtectedRoute></Lazy>} />

          {/* 2. المستخدمون */}
          <Route path="/Admin/users" element={<Lazy><ProtectedRoute requiredRole="admin"><UsersAdmin /></ProtectedRoute></Lazy>} />

          {/* 3. المتطوعون — صفحة موحّدة بثلاثة أقسام (المسارات القديمة تفتح القسم المناسب) */}
          <Route path="/Admin/volunteers" element={<Lazy><ProtectedRoute requiredRole="admin"><VolunteersAdmin defaultTab="volunteers" /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/volunteers/applications" element={<Lazy><ProtectedRoute requiredRole="admin"><VolunteersAdmin defaultTab="applications" /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/volunteers/join-requests" element={<Lazy><ProtectedRoute requiredRole="admin"><VolunteersAdmin defaultTab="joins" /></ProtectedRoute></Lazy>} />

          {/* 4. الطلبات — نظام النماذج الديناميكية الموحّد؛ المسارات الثابتة تُحوَّل */}
          <Route path="/Admin/requests/forms" element={<Lazy><ProtectedRoute requiredRole="admin"><RequestFormsAdmin /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/requests" element={<Navigate to="/Admin/requests/forms" replace />} />
          <Route path="/Admin/requests/water-supply" element={<Navigate to="/Admin/requests/forms" replace />} />
          <Route path="/Admin/requests/suggestions" element={<Navigate to="/Admin/requests/forms" replace />} />

          {/* 5. الخرائط — الكفالات صارت أداة داخل بطاقة المشروع (/Admin/sponsorships يُحوّل) */}
          <Route path="/Admin/maps" element={<Lazy><ProtectedRoute requiredRole="staff"><MapsAdmin /></ProtectedRoute></Lazy>} />

          {/* 6. الكادر */}
          <Route path="/Admin/staff" element={<Lazy><ProtectedRoute requiredRole="orgStaff"><ExecutiveDashboard /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/staff/manage" element={<Lazy><ProtectedRoute requiredRole="orgStaff"><ManageDashboard /></ProtectedRoute></Lazy>} />

          {/* 8. التقارير */}
          <Route path="/Admin/reports" element={<Lazy><ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute></Lazy>} />

          {/* 9. إعدادات المنصّة */}
          <Route path="/Admin/settings" element={<Lazy><ProtectedRoute requiredRole="admin"><PlatformSettingsPage /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/settings/broadcast" element={<Lazy><ProtectedRoute requiredRole="admin"><BroadcastAdmin /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/settings/roles" element={<Lazy><ProtectedRoute requiredRole="admin"><RolesAdmin /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/settings/activity" element={<Lazy><ProtectedRoute requiredRole="admin"><ActivityLogAdmin /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/settings/project-types" element={<Lazy><ProtectedRoute requiredRole="admin"><ProjectTypesAdmin /></ProtectedRoute></Lazy>} />

          {/* توافق خلفي: كل المسارات القديمة */}
          {ACTIVE_LEGACY_REDIRECTS.map((r) => (
            <Route key={r.from} path={r.from} element={<Navigate to={r.to} replace />} />
          ))}

          {/* —— صفحات المشاريع العامة —— */}
          <Route path="/projects/:slug" element={<Lazy><ProjectLanding /></Lazy>} />
          <Route path="/projects/:slug/map" element={<Lazy><ProjectMapPage /></Lazy>} />
          <Route path="/projects/:slug/sponsorships" element={<Lazy><SaqyaHome /></Lazy>} />
          <Route path="/map" element={<Lazy><MapsAggregator /></Lazy>} />
          <Route path="/forms/:slug" element={<Lazy><DynamicFormPage /></Lazy>} />

          {UatPage ? <Route path="/uat" element={<Lazy><UatPage /></Lazy>} /> : null}

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!hideChrome && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlatformSettingsProvider>
        <MembershipsProvider>
          <ToastProvider>
            <DashboardSettingsProvider>
              <Router>
                <AppContent />
              </Router>
            </DashboardSettingsProvider>
          </ToastProvider>
        </MembershipsProvider>
      </PlatformSettingsProvider>
    </AuthProvider>
  );
}
