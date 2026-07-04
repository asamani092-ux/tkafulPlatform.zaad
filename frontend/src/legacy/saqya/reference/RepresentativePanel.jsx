import { useState } from 'react'
import RepresentativeLayout from './RepresentativeLayout'
import RepresentativeDashboard from './RepresentativeDashboard'
import TaskManagement from './TaskManagement'

const RepresentativePanel = () => {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <RepresentativeDashboard />
      case 'tasks':
        return <TaskManagement />
      case 'documentation':
        return <DocumentationPage />
      case 'reports':
        return <ReportsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <RepresentativeDashboard />
    }
  }

  return (
    <RepresentativeLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </RepresentativeLayout>
  )
}

// مكونات مؤقتة للصفحات الأخرى
const DocumentationPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">التوثيق والتقارير</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة التوثيق قيد التطوير...</p>
    </div>
  </div>
)

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
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">إعدادات المندوب</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة الإعدادات قيد التطوير...</p>
    </div>
  </div>
)

export default RepresentativePanel

