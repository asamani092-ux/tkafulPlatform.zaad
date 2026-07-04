import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Filter, 
  Heart, 
  MapPin, 
  Users, 
  Calendar,
  DollarSign,
  Gift,
  Eye,
  Star,
  Clock,
  TrendingUp
} from 'lucide-react'

const DonationOpportunities = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [donationAmount, setDonationAmount] = useState('')

  const [opportunities, setOpportunities] = useState([
    {
      id: 101,
      type: "طعام",
      title: "كفالة طعام شهرية لأسرة من 6 أفراد",
      description: "أسرة مكونة من والدين و4 أطفال تحتاج مساعدة في توفير الطعام الأساسي. الوالد عاطل عن العمل والأسرة تواجه صعوبات مالية.",
      targetAmount: 600,
      currentAmount: 150,
      location: "الرياض - حي الملز",
      urgency: "high",
      beneficiariesCount: 6,
      category: "أساسية",
      createdAt: "2024-01-15T10:30:00Z",
      deadline: "2024-01-25",
      donorsCount: 3,
      story: "عائلة أبو سالم تواجه ظروفاً صعبة بعد فقدان الوالد لعمله. الأطفال في سن المدرسة ويحتاجون للتغذية السليمة.",
      items: ["أرز", "زيت", "سكر", "شاي", "معلبات", "خضروات"],
      verified: true
    },
    {
      id: 102,
      type: "تعليم",
      title: "رسوم مدرسية لطالب متفوق",
      description: "طالب متفوق في الثانوية العامة يحتاج مساعدة في دفع الرسوم المدرسية لإكمال تعليمه.",
      targetAmount: 1200,
      currentAmount: 400,
      location: "جدة - حي البلد",
      urgency: "normal",
      beneficiariesCount: 1,
      category: "تعليمية",
      createdAt: "2024-01-12T09:15:00Z",
      deadline: "2024-02-01",
      donorsCount: 2,
      story: "محمد طالب متفوق يحلم بأن يصبح طبيباً. والده مريض ولا يستطيع العمل، والأسرة تحتاج مساعدة لدفع رسوم المدرسة.",
      items: ["رسوم دراسية", "كتب", "قرطاسية"],
      verified: true
    },
    {
      id: 103,
      type: "علاج",
      title: "تكاليف علاج طبيعي لطفل",
      description: "طفل عمره 8 سنوات يحتاج جلسات علاج طبيعي بعد حادث أثر على قدرته على المشي.",
      targetAmount: 2000,
      currentAmount: 800,
      location: "الدمام - حي الشاطئ",
      urgency: "urgent",
      beneficiariesCount: 1,
      category: "طبية",
      createdAt: "2024-01-10T08:45:00Z",
      deadline: "2024-01-30",
      donorsCount: 5,
      story: "أحمد طفل نشيط تعرض لحادث أثر على قدرته على المشي. يحتاج جلسات علاج طبيعي منتظمة للتعافي.",
      items: ["جلسات علاج طبيعي", "أجهزة مساعدة", "أدوية"],
      verified: true
    },
    {
      id: 104,
      type: "ملابس",
      title: "ملابس شتوية لعائلة كبيرة",
      description: "عائلة مكونة من 8 أفراد تحتاج ملابس شتوية مناسبة لمواجهة البرد.",
      targetAmount: 800,
      currentAmount: 200,
      location: "الرياض - حي الشفا",
      urgency: "high",
      beneficiariesCount: 8,
      category: "أساسية",
      createdAt: "2024-01-14T11:20:00Z",
      deadline: "2024-01-28",
      donorsCount: 1,
      story: "عائلة كبيرة تحتاج ملابس شتوية دافئة للأطفال والكبار. الوالد يعمل بأجر قليل لا يكفي لشراء الملابس.",
      items: ["معاطف", "بناطيل", "أحذية", "جوارب"],
      verified: true
    },
    {
      id: 105,
      type: "سكن",
      title: "إيجار شهر لأسرة مهددة بالطرد",
      description: "أسرة مهددة بالطرد من المنزل بسبب تأخر دفع الإيجار لعدة أشهر.",
      targetAmount: 1500,
      currentAmount: 300,
      location: "مكة المكرمة - العزيزية",
      urgency: "urgent",
      beneficiariesCount: 5,
      category: "أساسية",
      createdAt: "2024-01-16T07:30:00Z",
      deadline: "2024-01-22",
      donorsCount: 2,
      story: "أسرة تواجه خطر الطرد من المنزل. الوالد مريض ولا يستطيع العمل، والأسرة تحتاج مساعدة عاجلة.",
      items: ["إيجار شهر واحد"],
      verified: true
    }
  ])

  const categories = [
    { value: 'all', label: 'جميع الفئات' },
    { value: 'أساسية', label: 'احتياجات أساسية' },
    { value: 'طبية', label: 'طبية' },
    { value: 'تعليمية', label: 'تعليمية' }
  ]

  const urgencyLevels = [
    { value: 'all', label: 'جميع المستويات' },
    { value: 'urgent', label: 'عاجل' },
    { value: 'high', label: 'مرتفع' },
    { value: 'normal', label: 'عادي' }
  ]

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      urgent: { label: "عاجل", color: "bg-red-100 text-red-800" },
      high: { label: "مرتفع", color: "bg-orange-100 text-orange-800" },
      normal: { label: "عادي", color: "bg-gray-100 text-gray-800" }
    }
    
    const config = urgencyConfig[urgency] || urgencyConfig.normal
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  const calculateProgress = (current, target) => {
    return Math.round((current / target) * 100)
  }

  const calculateDaysLeft = (deadline) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || opportunity.category === categoryFilter
    const matchesUrgency = urgencyFilter === 'all' || opportunity.urgency === urgencyFilter
    
    return matchesSearch && matchesCategory && matchesUrgency
  })

  const handleDonate = (opportunity) => {
    setSelectedOpportunity(opportunity)
    setShowDonationModal(true)
  }

  const submitDonation = () => {
    if (selectedOpportunity && donationAmount) {
      // هنا يتم إرسال التبرع للخادم
      console.log('تبرع جديد:', {
        opportunityId: selectedOpportunity.id,
        amount: donationAmount
      })
      setShowDonationModal(false)
      setDonationAmount('')
      setSelectedOpportunity(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">فرص التبرع</h1>
          <p className="text-gray-600 mt-1">اكتشف الحالات التي تحتاج مساعدتك</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في الفرص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 w-full sm:w-64"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            {urgencyLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">فرص متاحة</p>
                <p className="text-2xl font-bold text-alzad-burgundy">
                  {filteredOpportunities.length}
                </p>
              </div>
              <Heart className="w-8 h-8 text-alzad-burgundy" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">حالات عاجلة</p>
                <p className="text-2xl font-bold text-red-600">
                  {opportunities.filter(o => o.urgency === 'urgent').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المستفيدين</p>
                <p className="text-2xl font-bold text-blue-600">
                  {opportunities.reduce((sum, o) => sum + o.beneficiariesCount, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المطلوب</p>
                <p className="text-lg font-bold text-alzad-burgundy">
                  {formatCurrency(opportunities.reduce((sum, o) => sum + o.targetAmount, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-alzad-burgundy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الفرص */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOpportunities.map((opportunity) => (
          <Card key={opportunity.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-alzad-burgundy">{opportunity.category}</span>
                    {getUrgencyBadge(opportunity.urgency)}
                    {opportunity.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        موثق
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg text-gray-900 mb-2">
                    {opportunity.title}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {calculateDaysLeft(opportunity.deadline)} يوم متبقي
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{opportunity.description}</p>
              
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">{opportunity.story}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">المبلغ المطلوب:</span>
                  <span className="font-semibold">{formatCurrency(opportunity.targetAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">تم جمع:</span>
                  <span className="text-green-600">{formatCurrency(opportunity.currentAmount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-alzad-burgundy h-3 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress(opportunity.currentAmount, opportunity.targetAmount)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{calculateProgress(opportunity.currentAmount, opportunity.targetAmount)}% مكتمل</span>
                  <span>{opportunity.donorsCount} متبرع</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {opportunity.location}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {opportunity.beneficiariesCount} مستفيد
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(opportunity.createdAt)}
                </div>
              </div>
              
              <div className="text-xs text-gray-600">
                <strong>الأصناف المطلوبة:</strong> {opportunity.items.join(', ')}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-alzad-burgundy hover:bg-alzad-burgundy/90"
                  onClick={() => handleDonate(opportunity)}
                >
                  <Gift className="w-4 h-4 ml-2" />
                  تبرع الآن
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* نافذة التبرع */}
      {showDonationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-alzad-burgundy mb-4">
              تبرع لـ: {selectedOpportunity?.title}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600">المبلغ المطلوب:</div>
                <div className="font-semibold">{formatCurrency(selectedOpportunity?.targetAmount)}</div>
                <div className="text-sm text-green-600">
                  تم جمع: {formatCurrency(selectedOpportunity?.currentAmount)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مبلغ التبرع (ريال سعودي)
                </label>
                <Input
                  type="number"
                  placeholder="أدخل المبلغ"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  min="1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setDonationAmount('100')}
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  100 ريال
                </Button>
                <Button 
                  onClick={() => setDonationAmount('250')}
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  250 ريال
                </Button>
                <Button 
                  onClick={() => setDonationAmount('500')}
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  500 ريال
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={submitDonation}
                className="flex-1 bg-alzad-burgundy hover:bg-alzad-burgundy/90"
                disabled={!donationAmount || donationAmount <= 0}
              >
                <Heart className="w-4 h-4 ml-2" />
                تأكيد التبرع
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDonationModal(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DonationOpportunities

