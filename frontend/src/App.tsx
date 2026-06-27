import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { DashboardSettingsProvider } from "./contexts/DashboardSettingsContext";
import PageShell from "./components/ui/PageShell";

/**
 * المعمارية الجديدة (Design System).
 * تُضاف المسارات تدريجياً عبر دفعات الترحيل (Phase 3). الأرشيف في src/legacy للرجوع.
 */
function UnderConstruction() {
  return (
    <PageShell>
      <h1 style={{ color: "var(--tmkeen-primary)", fontWeight: 800 }}>قيد إعادة البناء على نظام التصميم…</h1>
      <p style={{ color: "var(--tmkeen-brand-gray)" }}>يجري ترحيل الصفحات على دفعات.</p>
    </PageShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardSettingsProvider>
          <Router>
            <Routes>
              <Route path="*" element={<UnderConstruction />} />
            </Routes>
          </Router>
        </DashboardSettingsProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
