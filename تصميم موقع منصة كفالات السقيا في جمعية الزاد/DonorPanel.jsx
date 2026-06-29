import { useState } from 'react'
import DonorLayout from './DonorLayout'
import DonorDashboard from './DonorDashboard'
import DonationOpportunities from './DonationOpportunities'

const DonorPanel = () => {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DonorDashboard />
      case 'opportunities':
        return <DonationOpportunities />
      case 'donations':
        return <MyDonationsPage />
      case 'impact':
        return <ImpactTrackingPage />
      case 'reports':
        return <ReportsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DonorDashboard />
    }
  }

  return (
    <DonorLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </DonorLayout>
  )
}

// مكونات مؤقتة للصفحات الأخرى
const MyDonationsPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">تبرعاتي</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة تبرعاتي قيد التطوير...</p>
    </div>
  </div>
)

const ImpactTrackingPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">تتبع الأثر</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة تتبع الأثر قيد التطوير...</p>
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
    <h1 className="text-3xl font-bold text-alzad-burgundy mb-6">إعدادات المتبرع</h1>
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600">صفحة الإعدادات قيد التطوير...</p>
    </div>
  </div>
)

export default DonorPanel

