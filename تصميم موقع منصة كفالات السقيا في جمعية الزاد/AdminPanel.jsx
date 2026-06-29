import { useState } from 'react'
import AdminLayout from './AdminLayout'
import AdminDashboard from './AdminDashboard'
import SponsorshipManagement from './SponsorshipManagement'
import UserManagement from './UserManagement'

const AdminPanel = () => {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard />
      case 'sponsorships':
        return <SponsorshipManagement />
      case 'users':
        return <UserManagement />
      case 'reports':
        return <ReportsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </AdminLayout>
  )
}

// مكونات مؤقتة للصفحات الأخرى
const ReportsPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">التقارير</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة التقارير قيد التطوير...</p>
    </div>
  </div>
)

const SettingsPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">الإعدادات</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة الإعدادات قيد التطوير...</p>
    </div>
  </div>
)

export default AdminPanel

