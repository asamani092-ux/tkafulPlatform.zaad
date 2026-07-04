import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { DashboardSettingsProvider } from "./contexts/DashboardSettingsContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import { LoadingState } from "./components/feedback/PageStates";
import { ForbiddenPage, NotFoundPage } from "./components/pages/ErrorPages";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

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
import AdminSignIn from "./components/pages/admin/AdminSignIn";

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

const ExecutiveDashboard = lazy(() => import("./components/pages/ExecutiveDashboard"));
const ManageDashboard = lazy(() => import("./components/pages/ManageDashboard"));
const SaqyaHome = lazy(() => import("./components/pages/saqya"));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

function AppContent() {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();
  const isUserPage = pathname.startsWith("/user");
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminSignIn = pathname === "/admin/signin";
  const isSaqyaPage = pathname.startsWith("/saqya");
  const isErrorPage = pathname === "/403" || pathname === "/404";
  const hideChrome = isUserPage || isSaqyaPage || (isAdminPage && !isAdminSignIn) || isErrorPage;

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted" dir="rtl">
      {!hideChrome && <Navbar />}
      <main className="flex-1 overflow-x-hidden">
        <Routes>
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
          <Route path="/admin/signin" element={<AdminSignIn />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />

          <Route path="/user/main" element={<Lazy><ProtectedRoute requiredRole="authenticated"><UserMain /></ProtectedRoute></Lazy>} />
          <Route path="/user/tasks" element={<Lazy><ProtectedRoute requiredRole="authenticated"><UserTasks /></ProtectedRoute></Lazy>} />
          <Route path="/user/settings" element={<Lazy><ProtectedRoute requiredRole="authenticated"><UserSettings /></ProtectedRoute></Lazy>} />
          <Route path="/user/personal-info" element={<Lazy><ProtectedRoute requiredRole="authenticated"><PersonalInfo /></ProtectedRoute></Lazy>} />

          <Route path="/Admin" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><AdminMain /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/requests" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><VolunteerRequests /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/applications" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><VolunteerApplications /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/management" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><VolunteerManagement /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/tasks" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><AddProjectPage /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/ideas" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><ProjectIdeas /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/reports" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><Reports /></ProtectedRoute></Lazy>} />
          <Route path="/Admin/service-requests" element={<Lazy><ProtectedRoute requiredRole="admin" signInPath="/admin/signin"><ServiceRequests /></ProtectedRoute></Lazy>} />

          <Route path="/executive" element={<Lazy><ExecutiveDashboard /></Lazy>} />
          <Route path="/executive/manage" element={<Lazy><ManageDashboard /></Lazy>} />
          <Route path="/saqya" element={<Lazy><SaqyaHome /></Lazy>} />

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
