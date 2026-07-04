import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
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
import 'leaflet/dist/leaflet.css'

// إصلاح أيقونات Leaflet الافتراضية
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const RealSaqyaMap = ({ onBackToHome }) => {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)

  // إحداثيات بريدة الحقيقية
  const buraidahCenter = [26.3274, 43.9750]

  // بيانات المواقع الحقيقية في بريدة مع إحداثيات دقيقة
  const locations = [
    // المساجد
    {
      id: 1,
      name: 'الجامع الكبير ببريدة',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الصفراء',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: [26.3274, 43.9750],
      beneficiaries: 150,
      lastUpdate: '2024-01-15',
      address: 'حي الصفراء، بريدة'
    },
    {
      id: 2,
      name: 'جامع خادم الحرمين الشريفين',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الإسكان',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: [26.3350, 43.9800],
      beneficiaries: 200,
      lastUpdate: '2024-01-10',
      address: 'حي الإسكان، بريدة'
    },
    {
      id: 3,
      name: 'مسجد الأمير عبد الإله',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الصفراء',
      saqyaType: 'sponsorship',
      status: 'pending',
      coordinates: [26.3200, 43.9700],
      beneficiaries: 120,
      lastUpdate: null,
      address: 'حي الصفراء، بريدة'
    },
    {
      id: 4,
      name: 'جامع الراجحي',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'الريان',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: [26.3400, 43.9850],
      beneficiaries: 180,
      lastUpdate: '2024-01-12',
      address: 'حي الريان، بريدة'
    },
    {
      id: 5,
      name: 'مسجد الملك فهد',
      type: 'mosque',
      category: 'مسجد',
      neighborhood: 'النهضة',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: [26.3450, 43.9900],
      beneficiaries: 220,
      lastUpdate: '2024-01-18',
      address: 'حي النهضة، بريدة'
    },
    
    // الدور النسائية
    {
      id: 6,
      name: 'دار البيان النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'الصفراء',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: [26.3250, 43.9720],
      beneficiaries: 80,
      lastUpdate: '2024-01-14',
      address: 'حي الصفراء، بريدة'
    },
    {
      id: 7,
      name: 'دار الفضيلة النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'المنتزه',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: [26.3300, 43.9780],
      beneficiaries: 65,
      lastUpdate: '2024-01-08',
      address: 'حي المنتزه، بريدة'
    },
    {
      id: 8,
      name: 'دار البشائر النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'الخليج',
      saqyaType: 'sponsorship',
      status: 'pending',
      coordinates: [26.3380, 43.9820],
      beneficiaries: 90,
      lastUpdate: null,
      address: 'حي الخليج، بريدة'
    },
    {
      id: 9,
      name: 'دار الضياء النسائية',
      type: 'women_center',
      category: 'دار نسائية',
      neighborhood: 'النازية',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: [26.3150, 43.9650],
      beneficiaries: 75,
      lastUpdate: '2024-01-11',
      address: 'حي النازية، بريدة'
    },

    // الجمعيات
    {
      id: 10,
      name: 'جمعية البر الخيرية ببريدة',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'الإسكان',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: [26.3320, 43.9770],
      beneficiaries: 300,
      lastUpdate: '2024-01-13',
      address: 'حي الإسكان، بريدة'
    },
    {
      id: 11,
      name: 'جمعية الزاد للخدمات الإنسانية',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'الفايزية',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: [26.3280, 43.9730],
      beneficiaries: 250,
      lastUpdate: '2024-01-16',
      address: 'حي الفايزية، طريق الملك سعود، بريدة'
    },
    {
      id: 12,
      name: 'جمعية التنمية الأسرية (أسرة)',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'النهضة',
      saqyaType: 'sponsorship',
      status: 'pending',
      coordinates: [26.3470, 43.9920],
      beneficiaries: 180,
      lastUpdate: null,
      address: 'حي النهضة، بريدة'
    },
    {
      id: 13,
      name: 'جمعية أصدقاء المرضى',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'الريان',
      saqyaType: 'free_support',
      status: 'covered',
      coordinates: [26.3380, 43.9880],
      beneficiaries: 120,
      lastUpdate: '2024-01-09',
      address: 'حي الريان، بريدة'
    },
    {
      id: 14,
      name: 'جمعية الإحسان',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'الخليج',
      saqyaType: 'sponsorship',
      status: 'covered',
      coordinates: [26.3360, 43.9840],
      beneficiaries: 160,
      lastUpdate: '2024-01-17',
      address: 'حي الخليج، بريدة'
    },
    {
      id: 15,
      name: 'جمعية الملك عبد العزيز النسائية',
      type: 'charity',
      category: 'جمعية خيرية',
      neighborhood: 'المنتزه',
      saqyaType: 'free_support',
      status: 'pending',
      coordinates: [26.3310, 43.9790],
      beneficiaries: 140,
      lastUpdate: null,
      address: 'حي المنتزه، بريدة'
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

  // إنشاء أيقونات مخصصة
  const createCustomIcon = (type, status, saqyaType) => {
    let color = status === 'covered' ? '#22c55e' : '#f97316' // أخضر للمغطاة، برتقالي للانتظار
    let iconHtml = ''
    
    if (type === 'mosque') {
      iconHtml = `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <span style="color: white; font-size: 14px;">🕌</span>
      </div>`
    } else if (type === 'women_center') {
      iconHtml = `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <span style="color: white; font-size: 14px;">👥</span>
      </div>`
    } else if (type === 'charity') {
      iconHtml = `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <span style="color: white; font-size: 14px;">❤️</span>
      </div>`
    }

    // إضافة مؤشر نوع السقيا
    const saqyaColor = saqyaType === 'sponsorship' ? '#9f1239' : '#d97706'
    iconHtml += `<div style="position: absolute; top: -5px; right: -5px; background-color: ${saqyaColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`

    return L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
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
              <p className="text-xs text-gray-600">مدينة بريدة - المملكة العربية السعودية</p>
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
            <div className="mt-3 text-center">
              <div className="text-sm text-gray-600">إجمالي المواقع: {stats.total}</div>
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

        {/* الخارطة الواقعية */}
        <div className="flex-1 relative">
          <MapContainer
            center={buraidahCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {filteredLocations.map((location) => (
              <Marker
                key={location.id}
                position={location.coordinates}
                icon={createCustomIcon(location.type, location.status, location.saqyaType)}
                eventHandlers={{
                  click: () => setSelectedLocation(location)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-bold text-gray-900 mb-1">{location.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{location.category}</p>
                    <p className="text-xs text-gray-500 mb-2">{location.address}</p>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs ${getSaqyaTypeColor(location.saqyaType)} text-white`}>
                        {getSaqyaTypeText(location.saqyaType)}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(location.status)} text-white`}>
                        {location.status === 'covered' ? 'مغطاة' : 'في الانتظار'}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-600">
                      <div>المستفيدون: {location.beneficiaries}</div>
                      {location.lastUpdate && (
                        <div>آخر تحديث: {location.lastUpdate}</div>
                      )}
                    </div>

                    {location.status === 'pending' && (
                      <button className="w-full mt-2 bg-alzad-burgundy text-white text-xs py-1 px-2 rounded">
                        تقديم طلب كفالة
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* مفتاح الخارطة */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
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

          {/* معلومات الخارطة */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
            <h2 className="font-bold text-alzad-burgundy">خارطة السقيا - بريدة</h2>
            <p className="text-xs text-gray-600">المساجد والدور النسائية والجمعيات</p>
            <p className="text-xs text-gray-500 mt-1">خرائط حقيقية مدعومة بـ OpenStreetMap</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RealSaqyaMap

