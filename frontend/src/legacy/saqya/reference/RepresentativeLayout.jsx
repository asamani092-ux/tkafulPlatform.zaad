import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  MapPin, 
  FileText, 
  Camera, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Navigation
} from 'lucide-react'
import logo from '../../assets/logo.png'

const RepresentativeLayout = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      active: currentPage === 'dashboard'
    },
    {
      id: 'tasks',
      label: 'إدارة المهام',
      icon: MapPin,
      active: currentPage === 'tasks'
    },
    {
      id: 'documentation',
      label: 'التوثيق والتقارير',
      icon: Camera,
      active: currentPage === 'documentation'
    },
    {
      id: 'reports',
      label: 'التقارير',
      icon: FileText,
      active: currentPage === 'reports'
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: Settings,
      active: currentPage === 'settings'
    }
  ]

  const handleMenuClick = (pageId) => {
    onPageChange(pageId)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <img src={logo} alt="جمعية الزاد" className="h-8 w-auto" />
            <div>
              <h2 className="text-lg font-bold text-alzad-burgundy">بوابة المندوب</h2>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                    item.active
                      ? 'bg-alzad-burgundy text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-5 h-5 ml-3" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* معلومات المندوب */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse mb-3">
            <div className="w-8 h-8 bg-alzad-burgundy rounded-full flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">عبدالله الزهراني</div>
              <div className="text-xs text-gray-500">مندوب ميداني - الرياض الشمال</div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-gray-600 hover:text-red-600"
          >
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      {/* Overlay للهواتف */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* المحتوى الرئيسي */}
      <div className="flex-1 lg:mr-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="relative hidden md:block">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="البحث في المهام..."
                  className="pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-alzad-burgundy focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 space-x-reverse">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-8 h-8 bg-alzad-burgundy rounded-full flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">عبدالله الزهراني</div>
                  <div className="text-xs text-gray-500">مندوب ميداني</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* المحتوى */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

export default RepresentativeLayout

