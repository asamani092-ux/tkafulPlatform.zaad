import { useState } from 'react'
import SupplierLayout from './SupplierLayout'
import SupplierDashboard from './SupplierDashboard'
import OrderManagement from './OrderManagement'

const SupplierPanel = () => {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <SupplierDashboard />
      case 'orders':
        return <OrderManagement />
      case 'invoices':
        return <InvoicesPage />
      case 'analytics':
        return <AnalyticsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <SupplierDashboard />
    }
  }

  return (
    <SupplierLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </SupplierLayout>
  )
}

// مكونات مؤقتة للصفحات الأخرى
const InvoicesPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">إدارة الفواتير</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة الفواتير قيد التطوير...</p>
    </div>
  </div>
)

const AnalyticsPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">التقارير والإحصائيات</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة التقارير قيد التطوير...</p>
    </div>
  </div>
)

const SettingsPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">إعدادات المورد</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة الإعدادات قيد التطوير...</p>
    </div>
  </div>
)

export default SupplierPanel

