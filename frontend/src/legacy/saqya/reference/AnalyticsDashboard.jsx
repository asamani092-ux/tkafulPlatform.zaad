import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Heart,
  Package,
  MapPin,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Filter
} from 'lucide-react'

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('month') // 'week', 'month', 'quarter', 'year'
  
  // بيانات الإحصائيات الرئيسية
  const [mainStats, setMainStats] = useState({
    totalDonations: 1247,
    totalAmount: 485000,
    activeCases: 89,
    completedCases: 1158,
    totalBeneficiaries: 3420,
    averageCompletionTime: 5.2,
    satisfactionRate: 4.7,
    monthlyGrowth: 15.3
  })

  // بيانات التبرعات الشهرية
  const [monthlyDonations, setMonthlyDonations] = useState([
    { month: 'يناير', amount: 45000, count: 120, beneficiaries: 280 },
    { month: 'فبراير', amount: 52000, count: 135, beneficiaries: 320 },
    { month: 'مارس', amount: 48000, count: 125, beneficiaries: 295 },
    { month: 'أبريل', amount: 58000, count: 145, beneficiaries: 350 },
    { month: 'مايو', amount: 62000, count: 155, beneficiaries: 380 },
    { month: 'يونيو', amount: 55000, count: 140, beneficiaries: 335 }
  ])

  // بيانات توزيع أنواع التبرعات
  const [donationTypes, setDonationTypes] = useState([
    { name: 'طعام', value: 45, amount: 218250, color: '#8B5CF6' },
    { name: 'ملابس', value: 25, amount: 121250, color: '#10B981' },
    { name: 'أدوية', value: 15, amount: 72750, color: '#F59E0B' },
    { name: 'تعليم', value: 10, amount: 48500, color: '#EF4444' },
    { name: 'سكن', value: 5, amount: 24250, color: '#6B7280' }
  ])

  // بيانات الأداء اليومي
  const [dailyPerformance, setDailyPerformance] = useState([
    { day: 'السبت', donations: 12, completed: 8, pending: 4 },
    { day: 'الأحد', donations: 15, completed: 12, pending: 3 },
    { day: 'الاثنين', donations: 18, completed: 14, pending: 4 },
    { day: 'الثلاثاء', donations: 22, completed: 18, pending: 4 },
    { day: 'الأربعاء', donations: 20, completed: 16, pending: 4 },
    { day: 'الخميس', donations: 25, completed: 20, pending: 5 },
    { day: 'الجمعة', donations: 16, completed: 12, pending: 4 }
  ])

  // بيانات التوزيع الجغرافي
  const [geographicData, setGeographicData] = useState([
    { city: 'الرياض', donations: 450, amount: 185000, percentage: 38 },
    { city: 'جدة', donations: 320, amount: 135000, percentage: 28 },
    { city: 'الدمام', donations: 180, amount: 75000, percentage: 15 },
    { city: 'مكة المكرمة', donations: 150, amount: 62000, percentage: 13 },
    { city: 'المدينة المنورة', donations: 90, amount: 38000, percentage: 8 },
    { city: 'أخرى', donations: 57, amount: 25000, percentage: 5 }
  ])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (number) => {
    return new Intl.NumberFormat('ar-SA').format(number)
  }

  const getGrowthIcon = (growth) => {
    return growth > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">لوحة التحكم والمؤشرات</h1>
          <p className="text-gray-600 mt-1">نظرة شاملة على أداء منصة كفالات السقيا</p>
        </div>
        
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="quarter">هذا الربع</option>
            <option value="year">هذا العام</option>
          </select>
          
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* المؤشرات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التبرعات</CardTitle>
            <Heart className="h-4 w-4 text-alzad-burgundy" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">
              {formatNumber(mainStats.totalDonations)}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              {getGrowthIcon(mainStats.monthlyGrowth)}
              <span className="mr-1">+{mainStats.monthlyGrowth}% من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            <DollarSign className="h-4 w-4 text-alzad-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">
              {formatCurrency(mainStats.totalAmount)}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              {getGrowthIcon(12.5)}
              <span className="mr-1">+12.5% من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستفيدين</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">
              {formatNumber(mainStats.totalBeneficiaries)}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              {getGrowthIcon(8.3)}
              <span className="mr-1">+8.3% من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الرضا</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">
              {mainStats.satisfactionRate}/5
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              {getGrowthIcon(2.1)}
              <span className="mr-1">+2.1% من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية الرئيسية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* رسم بياني للتبرعات الشهرية */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">التبرعات الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyDonations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'amount' ? formatCurrency(value) : formatNumber(value),
                    name === 'amount' ? 'المبلغ' : name === 'count' ? 'العدد' : 'المستفيدين'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stackId="1"
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* رسم دائري لأنواع التبرعات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">توزيع أنواع التبرعات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={donationTypes}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {donationTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'النسبة']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* الأداء اليومي والتوزيع الجغرافي */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الأداء اليومي */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">الأداء اليومي</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" stackId="a" fill="#10B981" name="مكتمل" />
                <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="في الانتظار" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* التوزيع الجغرافي */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">التوزيع الجغرافي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {geographicData.map((city, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{city.city}</span>
                    <span className="text-sm text-gray-600">{city.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-alzad-burgundy h-2 rounded-full transition-all duration-300"
                      style={{ width: `${city.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatNumber(city.donations)} تبرع</span>
                    <span>{formatCurrency(city.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* مؤشرات الأداء التفصيلية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حالات نشطة</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{mainStats.activeCases}</div>
            <p className="text-xs text-muted-foreground">قيد التنفيذ حالياً</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حالات مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mainStats.completedCases}</div>
            <p className="text-xs text-muted-foreground">تم إنجازها بنجاح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط وقت الإنجاز</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{mainStats.averageCompletionTime}</div>
            <p className="text-xs text-muted-foreground">أيام في المتوسط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل النمو</CardTitle>
            <TrendingUp className="h-4 w-4 text-alzad-burgundy" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">+{mainStats.monthlyGrowth}%</div>
            <p className="text-xs text-muted-foreground">نمو شهري</p>
          </CardContent>
        </Card>
      </div>

      {/* تنبيهات ومؤشرات مهمة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-alzad-burgundy flex items-center">
            <AlertTriangle className="w-5 h-5 ml-2 text-yellow-500" />
            تنبيهات ومؤشرات مهمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-yellow-800">حالات تحتاج متابعة</div>
                  <div className="text-2xl font-bold text-yellow-600">12</div>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-red-800">حالات متأخرة</div>
                  <div className="text-2xl font-bold text-red-600">3</div>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-800">معدل الإنجاز</div>
                  <div className="text-2xl font-bold text-green-600">92%</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsDashboard

