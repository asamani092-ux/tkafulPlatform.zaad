import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Users,
  ArrowLeft,
  Home
} from 'lucide-react'
import AnalyticsDashboard from './AnalyticsDashboard'
import DetailedReports from './DetailedReports'
import logo from '../../assets/logo.png'

const AnalyticsPanel = ({ onBackToHome }) => {
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'reports'

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AnalyticsDashboard />
      case 'reports':
        return <DetailedReports />
      default:
        return <AnalyticsDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <img src={logo} alt="جمعية الزاد" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-alzad-burgundy">منصة كفالات السقيا</h1>
              <p className="text-xs text-gray-600">لوحة التحكم والمؤشرات</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            <Button
              variant="outline"
              onClick={onBackToHome}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8 space-x-reverse">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'dashboard'
                  ? 'border-alzad-burgundy text-alzad-burgundy'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                لوحة التحكم
              </div>
            </button>
            
            <button
              onClick={() => setCurrentView('reports')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'reports'
                  ? 'border-alzad-burgundy text-alzad-burgundy'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                التقارير المفصلة
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="flex-1">
        {renderCurrentView()}
      </main>
    </div>
  )
}

export default AnalyticsPanel

