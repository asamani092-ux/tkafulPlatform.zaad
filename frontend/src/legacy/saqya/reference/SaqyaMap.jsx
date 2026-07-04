import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Filter, 
  Search,
  Building,
  Building2,
  Users,
  Heart,
  Gift,
  ArrowLeft
} from 'lucide-react'
import logo from '../../assets/logo.png'

const SaqyaMap = ({ onBackToHome }) => {
  const [selectedFilter, setSelectedFilter] = useState('all') // 'all', 'mosques', 'women_centers', 'charities'
  const [selectedType, setSelectedType] = useState('all') // 'all', 'sponsorship', 'free_support'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)

  // بيانات وهمية للمواقع في بريدة
  const locations = [
    // المساجد
    {
      id: 1,
      name: 'الجامع الكبير',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الصفراء',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: { lat: 26.3274, lng: 43.9750 },
      beneficiaries: 150,
      lastUpdate: '2024-01-15'
    },
    {
      id: 2,
      name: 'جامع خادم الحرمين الشريفين',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الإسكان',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: { lat: 26.3350, lng: 43.9800 },
      beneficiaries: 200,
      lastUpdate: '2024-01-10'
    },
    {
      id: 3,
      name: 'مسجد الأمير عبد الإله',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الصفراء',
      saqyaType: 'sponsorship',
      status: 'pending',
      coordinates: { lat: 26.3200, lng: 43.9700 },
      beneficiaries: 120,
      lastUpdate: null
    },
    {
      id: 4,
      name: 'جامع الراجحي',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الريان',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: { lat: 26.3400, lng: 43.9850 },
      beneficiaries: 180,
      lastUpdate: '2024-01-12'
    },
    
    // الدور النسائية
    {
      id: 5,
      name: 'دار البيان النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'الصفراء',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: { lat: 26.3250, lng: 43.9720 },
      beneficiaries: 80,
      lastUpdate: '2024-01-14'
    },
    {
      id: 6,
      name: 'دار الفضيلة النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'المنتزه',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: { lat: 26.3300, lng: 43.9780 },
      beneficiaries: 65,
      lastUpdate: '2024-01-08'
    },
    {
      id: 7,
      name: 'دار البشائر النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'الخليج',
      saqyaType: 'sponsorship',
      status: 'pending',
      coordinates: { lat: 26.3380, lng: 43.9820 },
      beneficiaries: 90,
      lastUpdate: null
    },
    {
      id: 8,
      name: 'دار الضياء النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'النازية',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: { lat: 26.3150, lng: 43.9650 },
      beneficiaries: 75,
      lastUpdate: '2024-01-11'
    },

    // الجمعيات
    {
      id: 9,
      name: 'جمعية البر الخيرية',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'الإسكان',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: { lat: 26.3320, lng: 43.9770 },
      beneficiaries: 300,
      lastUpdate: '2024-01-13'
    },
    {
      id: 10,
      name: 'جمعية الزاد للخدمات الإنسانية',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'الفايزية',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: { lat: 26.3280, lng: 43.9730 },
      beneficiaries: 250,
      lastUpdate: '2024-01-16'
    },
    {
      id: 11,
      name: 'جمعية التنمية الأسرية (أسرة)',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'النهضة',
      saqyaType: 'sponsorship',
      status: 'pending',
      coordinates: { lat: 26.3450, lng: 43.9900 },
      beneficiaries: 180,
      lastUpdate: null
    },
    {
      id: 12,
      name: 'جمعية أصدقاء المرضى',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'الريان',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: { lat: 26.3380, lng: 43.9880 },
      beneficiaries: 120,
      lastUpdate: '2024-01-09'
    }
  ]

  // فلترة المواقع
  const filteredLocations = locations.filter(location => {
    const matchesFilter = selectedFilter === 'all' || location.type === selectedFilter
    const matchesType = selectedType === 'all' || location.saqyaType === selectedType
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesType && matchesSearch
  })

  // إحصائيات
  const stats = {
    total: locations.length,
    covered: locations.filter(l => l.status === 'covered').length,
    pending: locations.filter(l => l.status === 'pending').length,
    mosques: locations.filter(l => l.type === 'mosque').length,
    womenCenters: locations.filter(l => l.type === 'women_center').length,
    charities: locations.filter(l => l.type === 'charity').length,
    sponsorship: locations.filter(l => l.saqyaType === 'sponsorship').length,
    freeSupport: locations.filter(l => l.saqyaType === 'free_support').length
  }

  const getLocationIcon = (type) => {
    switch (type) {
      case 'mosque': return <Building className="w-4 h-4" />
      case 'women_center': return <Users className="w-4 h-4" />
      case 'charity': return <Heart className="w-4 h-4" />
      default: return <MapPin className="w-4 h-4" />
    }
  }

  const getStatusColor = (status) => {
    return status === 'covered' ? 'bg-green-500' : 'bg-orange-500'
  }

  const getSaqyaTypeColor = (type) => {
    return type === 'sponsorship' ? 'bg-alzad-burgundy' : 'bg-alzad-gold'
  }

  const getSaqyaTypeText = (type) => {
    return type === 'sponsorship' ? 'طلب كفالة' : 'دعم 20 مجاناً'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <img src={logo} alt="جمعية الزاد" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-alzad-burgundy">خارطة السقيا</h1>
              <p className="text-xs text-gray-600">مدينة بريدة</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onBackToHome}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          {/* إحصائيات سريعة */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.covered}</div>
                <div className="text-xs text-green-600">مغطاة</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                <div className="text-xs text-orange-600">في الانتظار</div>
              </div>
            </div>
          </div>

          {/* فلاتر البحث */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-3">
              {/* البحث */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="البحث في المواقع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alzad-burgundy focus:border-transparent"
                />
              </div>

              {/* فلتر نوع الموقع */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الموقع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`p-2 text-xs rounded-lg border ${
                      selectedFilter === 'all' 
                        ? 'bg-alzad-burgundy text-white border-alzad-burgundy' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    الكل ({stats.total})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('mosque')}
                    className={`p-2 text-xs rounded-lg border flex items-center justify-center gap-1 ${
                      selectedFilter === 'mosque' 
                        ? 'bg-alzad-burgundy text-white border-alzad-burgundy' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Building className="w-3 h-3" />
                    مساجد ({stats.mosques})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('women_center')}
                    className={`p-2 text-xs rounded-lg border flex items-center justify-center gap-1 ${
                      selectedFilter === 'women_center' 
                        ? 'bg-alzad-burgundy text-white border-alzad-burgundy' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    دور نسائية ({stats.womenCenters})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('charity')}
                    className={`p-2 text-xs rounded-lg border flex items-center justify-center gap-1 ${
                      selectedFilter === 'charity' 
                        ? 'bg-alzad-burgundy text-white border-alzad-burgundy' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Heart className="w-3 h-3" />
                    جمعيات ({stats.charities})
                  </button>
                </div>
              </div>

              {/* فلتر نوع السقيا */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع السقيا</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`p-2 text-xs rounded-lg border ${
                      selectedType === 'all' 
                        ? 'bg-alzad-burgundy text-white border-alzad-burgundy' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    جميع الأنواع
                  </button>
                  <button
                    onClick={() => setSelectedType('sponsorship')}
                    className={`p-2 text-xs rounded-lg border flex items-center justify-center gap-1 ${
                      selectedType === 'sponsorship' 
                        ? 'bg-alzad-burgundy text-white border-alzad-burgundy' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Gift className="w-3 h-3" />
                    طلب كفالة ({stats.sponsorship})
                  </button>
                  <button
                    onClick={() => setSelectedType('free_support')}
                    className={`p-2 text-xs rounded-lg border flex items-center justify-center gap-1 ${
                      selectedType === 'free_support' 
                        ? 'bg-alzad-burgundy text-white border-alzad-burgundy' 
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    <Heart className="w-3 h-3" />
                    دعم 20 مجاناً ({stats.freeSupport})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* قائمة المواقع */}
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              المواقع ({filteredLocations.length})
            </h3>
            <div className="space-y-2">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocation(location)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLocation?.id === location.id
                      ? 'border-alzad-burgundy bg-alzad-burgundy/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className="text-alzad-burgundy mt-1">
                        {getLocationIcon(location.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{location.name}</h4>
                        <p className="text-xs text-gray-600">{location.neighborhood}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            className={`text-xs ${getSaqyaTypeColor(location.saqyaType)} text-white`}
                          >
                            {getSaqyaTypeText(location.saqyaType)}
                          </Badge>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(location.status)}`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* الخارطة */}
        <div className="flex-1 relative">
          {/* خارطة وهمية */}
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
            {/* شبكة الخلفية */}
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
                {Array.from({ length: 96 }).map((_, i) => (
                  <div key={i} className="border border-gray-300"></div>
                ))}
              </div>
            </div>

            {/* عنوان الخارطة */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
              <h2 className="font-bold text-alzad-burgundy">خارطة السقيا - بريدة</h2>
              <p className="text-xs text-gray-600">المساجد والدور النسائية والجمعيات</p>
            </div>

            {/* مفتاح الخارطة */}
            <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3">
              <h3 className="font-medium text-sm mb-2">مفتاح الخارطة</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>مغطاة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>في الانتظار</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-alzad-burgundy rounded-full"></div>
                  <span>طلب كفالة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-alzad-gold rounded-full"></div>
                  <span>دعم 20 مجاناً</span>
                </div>
              </div>
            </div>

            {/* نقاط المواقع على الخارطة */}
            {filteredLocations.map((location) => {
              // تحويل الإحداثيات إلى مواضع على الشاشة
              const x = ((location.coordinates.lng - 43.95) / 0.05) * 100
              const y = ((26.35 - location.coordinates.lat) / 0.05) * 100
              
              return (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocation(location)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ 
                    left: `${Math.max(5, Math.min(95, x))}%`, 
                    top: `${Math.max(5, Math.min(95, y))}%` 
                  }}
                >
                  <div className={`relative group`}>
                    {/* النقطة */}
                    <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                      location.status === 'covered' ? 'bg-green-500' : 'bg-orange-500'
                    } ${selectedLocation?.id === location.id ? 'ring-2 ring-alzad-burgundy' : ''}`}>
                    </div>
                    
                    {/* نوع السقيا */}
                    <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                      getSaqyaTypeColor(location.saqyaType)
                    }`}></div>

                    {/* tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {location.name}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* تفاصيل الموقع المحدد */}
          {selectedLocation && (
            <div className="absolute top-4 left-4 w-80 bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="text-alzad-burgundy mt-1">
                    {getLocationIcon(selectedLocation.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedLocation.name}</h3>
                    <p className="text-sm text-gray-600">{selectedLocation.category}</p>
                    <p className="text-xs text-gray-500">حي {selectedLocation.neighborhood}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${getSaqyaTypeColor(selectedLocation.saqyaType)} text-white`}>
                    {getSaqyaTypeText(selectedLocation.saqyaType)}
                  </Badge>
                  <Badge className={`${getStatusColor(selectedLocation.status)} text-white`}>
                    {selectedLocation.status === 'covered' ? 'مغطاة' : 'في الانتظار'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">المستفيدون:</span>
                    <span className="font-medium mr-1">{selectedLocation.beneficiaries}</span>
                  </div>
                  {selectedLocation.lastUpdate && (
                    <div>
                      <span className="text-gray-600">آخر تحديث:</span>
                      <span className="font-medium mr-1">{selectedLocation.lastUpdate}</span>
                    </div>
                  )}
                </div>

                {selectedLocation.status === 'pending' && (
                  <Button className="w-full bg-alzad-burgundy hover:bg-alzad-burgundy/90">
                    تقديم طلب كفالة
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SaqyaMap

