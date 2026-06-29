import { useState } from 'react'
import './App.css'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import AdminPanel from './components/admin/AdminPanel'
import SupplierPanel from './components/supplier/SupplierPanel'
import RepresentativePanel from './components/representative/RepresentativePanel'
import DonorPanel from './components/donor/DonorPanel'
import AnalyticsPanel from './components/analytics/AnalyticsPanel'
import RealSaqyaMap from './components/map/RealSaqyaMap'

function App() {
  const [currentView, setCurrentView] = useState('home') // 'home', 'admin', 'supplier', 'representative', 'donor', 'analytics', 'map'

  if (currentView === 'admin') {
    return <AdminPanel />
  }

  if (currentView === 'supplier') {
    return <SupplierPanel />
  }

  if (currentView === 'representative') {
    return <RepresentativePanel />
  }

  if (currentView === 'donor') {
    return <DonorPanel />
  }

  if (currentView === 'analytics') {
    return <AnalyticsPanel onBackToHome={() => setCurrentView('home')} />
  }

  if (currentView === 'map') {
    return <RealSaqyaMap onBackToHome={() => setCurrentView('home')} />
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <HowItWorks />
        
        {/* أزرار مؤقتة للوصول للبوابات - للاختبار فقط */}
        <div className="py-8 text-center bg-gray-100">
          <div className="space-x-4 space-x-reverse flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setCurrentView('admin')}
              className="bg-alzad-burgundy text-white px-6 py-3 rounded-lg hover:bg-alzad-burgundy/90 transition-colors"
            >
              دخول لوحة الإدارة
            </button>
            <button
              onClick={() => setCurrentView('supplier')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              دخول بوابة المورد
            </button>
            <button
              onClick={() => setCurrentView('representative')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              دخول بوابة المندوب
            </button>
            <button
              onClick={() => setCurrentView('donor')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              دخول بوابة المتبرع
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
            >
              لوحة التحكم والمؤشرات
            </button>
            <button
              onClick={() => setCurrentView('map')}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              خارطة السقيا الواقعية
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default App

