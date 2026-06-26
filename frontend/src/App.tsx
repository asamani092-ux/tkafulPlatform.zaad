import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { DashboardSettingsProvider } from './contexts/DashboardSettingsContext';
import { ToastProvider } from './contexts/ToastContext';

// Layouts
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Public Pages
import Home from './components/pages/Home';
import Projects from './components/pages/Projects';
import Services from './components/pages/Services';
import Volunteers from './components/pages/Volunteers';
import SignIn from './components/pages/Auth/SignIn';
import SignUp from './components/pages/Auth/SignUp';
import AdminSignIn from './components/pages/admin/AdminSignIn';
import Suggest from './components/pages/Suggest';
import About from './components/pages/About';
import RequestService from './components/pages/RequestService';
import WaterSupplyRequestPage from './components/pages/WaterSupplyRequestPage.tsx';

// User Pages
import UserMain from './components/pages/user/Main';
import UserTasks from './components/pages/user/Task';
import UserSettings from './components/pages/user/Setting';
import PersonalInfo from './components/pages/user/PersonalInfo';

// Admin Pages
import AdminMain from './components/pages/admin/main';
import VolunteerRequests from './components/pages/admin/VolunteerRequests';
import VolunteerApplications from './components/pages/admin/VolunteerApplications';
import VolunteerManagement from './components/pages/admin/VolunteerManagement';
import AddProjectPage from './components/pages/admin/AddProject';
import ProjectIdeas from './components/pages/admin/ProjectIdeas';
import Reports from './components/pages/admin/Reports';
import ServiceRequests from './components/pages/admin/ServiceRequests';


// هذا الكومبوننت هو اللي يقدر يستخدم useLocation
function AppContent() {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();

  // بدون هيدر وفوتر
  const isUserPage = pathname.startsWith('/user');
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminSignInPage = pathname === '/admin/signin';
  const hidePublicChrome = isUserPage || (isAdminPage && !isAdminSignInPage);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Navbar للصفحات العامة فقط */}
      {!hidePublicChrome && <Navbar />}

      <main className="flex-1">
        <Routes>

          {/* الصفحات العامة */}
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/services" element={<Services />} />
          <Route path="/volunteers" element={<Volunteers />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/admin/signin" element={<AdminSignIn />} />
          <Route path="/suggest" element={<Suggest />} />
          <Route path="/about" element={<About />} />
          <Route path="/request-service" element={<RequestService />} />
          <Route path="/services/water-supply" element={<WaterSupplyRequestPage />} />

          {/* صفحات اليوزر */}
          <Route path="/user/main" element={<UserMain />} />
          <Route path="/user/tasks" element={<UserTasks />} />
          <Route path="/user/settings" element={<UserSettings />} />
          <Route path="/user/personal-info" element={<PersonalInfo />} />

          {/* صفحات الأدمن */}
          <Route path="/Admin" element={<AdminMain />} />
          <Route path="/Admin/requests" element={<VolunteerRequests />} />
          <Route path="/Admin/applications" element={<VolunteerApplications />} />
          <Route path="/Admin/management" element={<VolunteerManagement />} />
          <Route path="/Admin/tasks" element={<AddProjectPage />} />
          <Route path="/Admin/ideas" element={<ProjectIdeas />} />
          <Route path="/Admin/reports" element={<Reports />} />
          <Route path="/Admin/service-requests" element={<ServiceRequests />} />
          {/* تبين نضيف المزيد؟ حاضرة */}
        </Routes>
      </main>

      {/* Footer للصفحات العامة فقط */}
      {!hidePublicChrome && <Footer />}
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
