import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { DashboardSettingsProvider } from "./contexts/DashboardSettingsContext";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

// Public / general
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

// User (volunteer) pages
import UserMain from "./components/pages/user/Main";
import UserTasks from "./components/pages/user/Task";
import UserSettings from "./components/pages/user/Setting";
import PersonalInfo from "./components/pages/user/PersonalInfo";

// Admin pages
import AdminMain from "./components/pages/admin/main";
import VolunteerRequests from "./components/pages/admin/VolunteerRequests";
import VolunteerApplications from "./components/pages/admin/VolunteerApplications";
import VolunteerManagement from "./components/pages/admin/VolunteerManagement";
import AddProjectPage from "./components/pages/admin/AddProject";
import ProjectIdeas from "./components/pages/admin/ProjectIdeas";
import Reports from "./components/pages/admin/Reports";
import ServiceRequests from "./components/pages/admin/ServiceRequests";

// Unified executive dashboard (project 2)
import ExecutiveDashboard from "./components/pages/ExecutiveDashboard";
import ManageDashboard from "./components/pages/ManageDashboard";

// Saqya sponsorships module (project 3)
import SaqyaHome from "./components/pages/saqya";

function AppContent() {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();
  const isUserPage = pathname.startsWith("/user");
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminSignIn = pathname === "/admin/signin";
  const isSaqyaPage = pathname.startsWith("/saqya");
  const hideChrome = isUserPage || isSaqyaPage || (isAdminPage && !isAdminSignIn);

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      {!hideChrome && <Navbar />}
      <main className="flex-1">
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
          <Route path="/user/main" element={<UserMain />} />
          <Route path="/user/tasks" element={<UserTasks />} />
          <Route path="/user/settings" element={<UserSettings />} />
          <Route path="/user/personal-info" element={<PersonalInfo />} />
          <Route path="/Admin" element={<AdminMain />} />
          <Route path="/Admin/requests" element={<VolunteerRequests />} />
          <Route path="/Admin/applications" element={<VolunteerApplications />} />
          <Route path="/Admin/management" element={<VolunteerManagement />} />
          <Route path="/Admin/tasks" element={<AddProjectPage />} />
          <Route path="/Admin/ideas" element={<ProjectIdeas />} />
          <Route path="/Admin/reports" element={<Reports />} />
          <Route path="/Admin/service-requests" element={<ServiceRequests />} />
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/executive/manage" element={<ManageDashboard />} />
          <Route path="/saqya" element={<SaqyaHome />} />
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
