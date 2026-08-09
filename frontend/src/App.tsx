import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
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
const VolunteerRequests = lazy(() => import("./components/pages/admin/VolunteerRequests"));
const VolunteerApplications = lazy(() => import("./components/pages/admin/VolunteerApplications"));
const VolunteerManagement = lazy(() => import("./components/pages/admin/VolunteerManagement"));
const AddProjectPage = lazy(() => import("./components/pages/admin/AddProject"));
const ProjectIdeas = lazy(() => import("./components/pages/admin/ProjectIdeas"));
const Reports = lazy(() => import("./components/pages/admin/Reports"));
const ServiceRequests = lazy(() => import("./components/pages/admin/ServiceRequests"));
const WaterSupplyRequests = lazy(() => import("./components/pages/admin/WaterSupplyRequests"));
const SponsorshipsHub = lazy(() => import("./components/pages/admin/SponsorshipsHub"));

const ExecutiveDashboard = lazy(() => import("./components/pages/ExecutiveDashboard"));
const ManageDashboard = lazy(() => import("./components/pages/ManageDashboard"));
const SaqyaHome = lazy(() => import("./components/pages/saqya"));

const ProjectLanding = lazy(() => import("./components/pages/projects/ProjectLanding"));
const ProjectMapPage = lazy(() => import("./components/pages/projects/ProjectMapPage"));
const MapsAggregator = lazy(() => import("./components/pages/projects/MapsAggregator"));
const PlatformProjects = lazy(() => import("./components/pages/admin/PlatformProjects"));
const MapsAdmin = lazy(() => import("./components/pages/admin/MapsAdmin"));
const UatPage = lazy(() => import("./components/pages/uat"));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

function AppContent() {
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

          {/* 1. المشاريع */}
          <Route path="/Admin/projects" element={<Lazy><ProtectedRoute requiredRole="staff"><PlatformProjects /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/projects/create" element={<Lazy><ProtectedRoute requiredRole="admin"><AddProjectPage /></ProtectedRoute></Lazy>} />

          {/* 2. المتطوعون */}
          <Route path="/Admin/volunteers" element={<Lazy><ProtectedRoute requiredRole="admin"><VolunteerManagement /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/volunteers/applications" element={<Lazy><ProtectedRoute requiredRole="admin"><VolunteerApplications /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/volunteers/join-requests" element={<Lazy><ProtectedRoute requiredRole="admin"><VolunteerRequests /></ProtectedRoute></Lazy>} />

          {/* 3. الطلبات */}
          <Route path="/Admin/requests" element={<Lazy><ProtectedRoute requiredRole="admin"><ServiceRequests /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/requests/water-supply" element={<Lazy><ProtectedRoute requiredRole="admin"><WaterSupplyRequests /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/requests/suggestions" element={<Lazy><ProtectedRoute requiredRole="admin"><ProjectIdeas /></ProtectedRoute></Lazy>} />

          {/* 4. الكفالات */}
          <Route path="/Admin/sponsorships" element={<Lazy><ProtectedRoute requiredRole="staff"><SponsorshipsHub /></ProtectedRoute></Lazy>} />

          {/* 5. الخرائط */}
          <Route path="/Admin/maps" element={<Lazy><ProtectedRoute requiredRole="staff"><MapsAdmin /></ProtectedRoute></Lazy>} />

          {/* 6. الكادر */}
          <Route path="/Admin/staff" element={<Lazy><ProtectedRoute requiredRole="orgStaff"><ExecutiveDashboard /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/staff/manage" element={<Lazy><ProtectedRoute requiredRole="orgStaff"><ManageDashboard /></ProtectedRoute></Lazy>} />

          {/* 7. التقارير */}
          <Route path="/Admin/reports" element={<Lazy><ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute></Lazy>} />

          {/* توافق خلفي: كل المسارات القديمة */}
          {ACTIVE_LEGACY_REDIRECTS.map((r) => (
            <Route key={r.from} path={r.from} element={<Navigate to={r.to} replace />} />
          ))}

          {/* —— صفحات المشاريع العامة —— */}
          <Route path="/projects/:slug" element={<Lazy><ProjectLanding /></Lazy>} />
          <Route path="/projects/:slug/map" element={<Lazy><ProjectMapPage /></Lazy>} />
          <Route path="/projects/:slug/sponsorships" element={<Lazy><SaqyaHome /></Lazy>} />
          <Route path="/map" element={<Lazy><MapsAggregator /></Lazy>} />

          <Route path="/uat" element={<Lazy><UatPage /></Lazy>} />

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
      <ToastProvider>
        <DashboardSettingsProvider>
          <Router>
            <AppContent />
          </Router>
        </DashboardSettingsProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
