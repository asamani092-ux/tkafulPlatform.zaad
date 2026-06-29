import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Users,
  Calendar,
  Gift,
  Star,
  Eye,
  Plus
} from 'lucide-react'

const DonorDashboard = () => {
  const [stats, setStats] = useState({
    totalDonations: 12,
    totalAmount: 8500,
    activeDonations: 3,
    completedDonations: 9,
    beneficiaries: 25,
    impactScore: 4.8
  })

  const [recentDonations, setRecentDonations] = useState([
    {
      id: 1,
      type: "طعام",
      description: "كفالة طعام لعائلة محتاجة",
      amount: 500,
      status: "in_progress",
      beneficiaryFamily: "عائلة أبو أحمد",
      location: "الرياض - حي النسيم",
      createdAt: "2024-01-15T10:30:00Z",
      targetDate: "2024-01-20",
      progress: 75
    },
    {
      id: 2,
      type: "ملابس",
      description: "ملابس شتوية للأطفال",
      amount: 300,
      status: "completed",
      beneficiaryFamily: "عائلة أم فاطمة",
      location: "جدة - حي الصفا",
      createdAt: "2024-01-10T09:15:00Z",
      targetDate: "2024-01-18",
      completedAt: "2024-01-17T14:30:00Z",
      progress: 100,
      feedback: "تم التسليم بنجاح والأطفال سعداء جداً بالملابس الجديدة"
    },
    {
      id: 3,
      type: "أدوية",
      description: "أدوية مزمنة لمريض السكري",
      amount: 800,
      status: "pending",
      beneficiaryFamily: "الأخ أبو محمد",
      location: "الدمام - حي الفيصلية",
      createdAt: "2024-01-18T08:45:00Z",
      targetDate: "2024-01-22",
      progress: 25
    }
  ])

  const [availableOpportunities, setAvailableOpportunities] = useState([
    {
      id: 101,
      type: "طعام",
      title: "كفالة طعام شهرية لأسرة من 6 أفراد",
      description: "أسرة تحتاج مساعدة في توفير الطعام الأساسي",
      targetAmount: 600,
      currentAmount: 150,
      location: "الرياض - حي الملز",
      urgency: "high",
      beneficiariesCount: 6,
      category: "أساسية"
    },
    {
      id: 102,
      type: "تعليم",
      title: "رسوم مدرسية لطالب متفوق",
      description: "طالب متفوق يحتاج مساعدة في دفع الرسوم المدرسية",
      targetAmount: 1200,
      currentAmount: 400,
      location: "جدة - حي البلد",
      urgency: "normal",
      beneficiariesCount: 1,
      category: "تعليمية"
    },
    {
      id: 103,
      type: "علاج",
      title: "تكاليف علاج طبيعي لطفل",
      description: "طفل يحتاج جلسات علاج طبيعي",
      targetAmount: 2000,
      currentAmount: 800,
      location: "الدمام - حي الشاطئ",
      urgency: "urgent",
      beneficiariesCount: 1,
      category: "طبية"
    }
  ])

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "في الانتظار", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      in_progress: { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-800", icon: TrendingUp },
      completed: { label: "مكتمل", color: "bg-green-100 text-green-800", icon: CheckCircle }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const IconComponent = config.icon
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

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

  return (
    <div className="p-6 space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">لوحة تحكم المتبرع</h1>
          <p className="text-gray-600 mt-1">مرحباً بك في منصة كفالات السقيا</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="w-4 h-4 ml-2" />
            تتبع التبرعات
          </Button>
          <Button className="bg-alzad-burgundy hover:bg-alzad-burgundy/90">
            <Plus className="w-4 h-4 ml-2" />
            تبرع جديد
          </Button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التبرعات</CardTitle>
            <Heart className="h-4 w-4 text-alzad-burgundy" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">{stats.totalDonations}</div>
            <p className="text-xs text-muted-foreground">+2 هذا الشهر</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            <DollarSign className="h-4 w-4 text-alzad-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">+15% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نشطة</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeDonations}</div>
            <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedDonations}</div>
            <p className="text-xs text-muted-foreground">75% معدل الإنجاز</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستفيدين</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.beneficiaries}</div>
            <p className="text-xs text-muted-foreground">شخص استفاد</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تقييم الأثر</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.impactScore}</div>
            <p className="text-xs text-muted-foreground">من 5 نجوم</p>
          </CardContent>
        </Card>
      </div>

      {/* التبرعات الحديثة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-alzad-burgundy">تبرعاتي الحديثة</CardTitle>
            <Button variant="outline" size="sm">
              عرض جميع التبرعات
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDonations.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="w-10 h-10 bg-alzad-burgundy/10 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-alzad-burgundy" />
                  </div>
                  <div>
                    <div className="font-semibold text-alzad-burgundy">تبرع #{donation.id}</div>
                    <div className="text-sm text-gray-600">
                      {donation.type} - {donation.beneficiaryFamily}
                    </div>
                    <div className="text-xs text-gray-500">
                      {donation.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      {donation.location} - {formatDate(donation.createdAt)}
                    </div>
                    {donation.feedback && (
                      <div className="text-xs text-green-600 mt-1 bg-green-50 p-2 rounded">
                        💬 {donation.feedback}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="text-left">
                    <div className="font-semibold text-alzad-burgundy">
                      {formatCurrency(donation.amount)}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {getStatusBadge(donation.status)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      التقدم: {donation.progress}%
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-alzad-burgundy h-2 rounded-full transition-all duration-300"
                        style={{ width: `${donation.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 space-x-reverse">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* فرص التبرع المتاحة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-alzad-burgundy">فرص تبرع جديدة</CardTitle>
            <Button variant="outline" size="sm">
              عرض المزيد
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-alzad-burgundy">{opportunity.category}</span>
                    {getUrgencyBadge(opportunity.urgency)}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{opportunity.title}</h3>
                    <p className="text-sm text-gray-600">{opportunity.description}</p>
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-alzad-burgundy h-2 rounded-full transition-all duration-300"
                        style={{ width: `${calculateProgress(opportunity.currentAmount, opportunity.targetAmount)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {calculateProgress(opportunity.currentAmount, opportunity.targetAmount)}% مكتمل
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    📍 {opportunity.location} • 👥 {opportunity.beneficiariesCount} مستفيد
                  </div>
                  
                  <Button className="w-full bg-alzad-burgundy hover:bg-alzad-burgundy/90">
                    <Gift className="w-4 h-4 ml-2" />
                    تبرع الآن
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* إحصائيات الأثر */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">أثر تبرعاتك</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">عائلات استفادت</span>
                <span className="font-semibold text-alzad-burgundy">8 عائلات</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">أطفال استفادوا</span>
                <span className="font-semibold text-alzad-burgundy">15 طفل</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">وجبات تم توفيرها</span>
                <span className="font-semibold text-alzad-burgundy">240 وجبة</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">أيام تغطية الاحتياجات</span>
                <span className="font-semibold text-alzad-burgundy">45 يوم</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">شهادات شكر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  "جزاكم الله خيراً على المساعدة. الأطفال سعداء جداً بالملابس الجديدة"
                </p>
                <p className="text-xs text-green-600 mt-1">- عائلة أم فاطمة</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  "بارك الله فيكم. الطعام وصل في الوقت المناسب وساعدنا كثيراً"
                </p>
                <p className="text-xs text-blue-600 mt-1">- عائلة أبو أحمد</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DonorDashboard

