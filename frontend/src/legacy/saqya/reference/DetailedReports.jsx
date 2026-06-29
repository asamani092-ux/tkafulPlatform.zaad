import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import { 
  Download, 
  Filter, 
  Calendar, 
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
  Clock,
  Star,
  Search
} from 'lucide-react'

const DetailedReports = () => {
  const [reportType, setReportType] = useState('donations')
  const [dateRange, setDateRange] = useState('month')
  const [searchTerm, setSearchTerm] = useState('')

  // بيانات التقارير المختلفة
  const [donationReports, setDonationReports] = useState([
    {
      id: 1,
      donorName: "أحمد محمد السالم",
      amount: 500,
      type: "طعام",
      status: "completed",
      date: "2024-01-15",
      beneficiary: "عائلة أبو أحمد",
      location: "الرياض - حي النسيم",
      completionTime: 3
    },
    {
      id: 2,
      donorName: "فاطمة علي أحمد",
      amount: 300,
      type: "ملابس",
      status: "in_progress",
      date: "2024-01-18",
      beneficiary: "عائلة أم فاطمة",
      location: "جدة - حي الصفا",
      completionTime: null
    },
    {
      id: 3,
      donorName: "محمد سالم الغامدي",
      amount: 800,
      type: "أدوية",
      status: "completed",
      date: "2024-01-10",
      beneficiary: "الأخ أبو محمد",
      location: "الدمام - حي الفيصلية",
      completionTime: 2
    }
  ])

  const [supplierReports, setSupplierReports] = useState([
    {
      id: 1,
      supplierName: "مؤسسة الغامدي للتموين",
      ordersCount: 45,
      totalAmount: 22500,
      averageRating: 4.8,
      completionRate: 95,
      averageDeliveryTime: 2.5
    },
    {
      id: 2,
      supplierName: "متجر الأمل للملابس",
      ordersCount: 32,
      totalAmount: 16000,
      averageRating: 4.6,
      completionRate: 92,
      averageDeliveryTime: 3.1
    },
    {
      id: 3,
      supplierName: "صيدلية النور",
      ordersCount: 28,
      totalAmount: 35000,
      averageRating: 4.9,
      completionRate: 98,
      averageDeliveryTime: 1.8
    }
  ])

  const [representativeReports, setRepresentativeReports] = useState([
    {
      id: 1,
      representativeName: "عبدالله الزهراني",
      tasksCompleted: 85,
      averageRating: 4.7,
      area: "الرياض الشمال",
      averageCompletionTime: 1.2,
      documentationRate: 98
    },
    {
      id: 2,
      representativeName: "سالم الأحمدي",
      tasksCompleted: 72,
      averageRating: 4.5,
      area: "جدة الشرق",
      averageCompletionTime: 1.5,
      documentationRate: 95
    },
    {
      id: 3,
      representativeName: "خالد المطيري",
      tasksCompleted: 68,
      averageRating: 4.6,
      area: "الدمام الغرب",
      averageCompletionTime: 1.3,
      documentationRate: 97
    }
  ])

  const [performanceData, setPerformanceData] = useState([
    { month: 'يناير', donations: 120, completion: 95, satisfaction: 4.6 },
    { month: 'فبراير', donations: 135, completion: 92, satisfaction: 4.7 },
    { month: 'مارس', donations: 125, completion: 96, satisfaction: 4.5 },
    { month: 'أبريل', donations: 145, completion: 94, satisfaction: 4.8 },
    { month: 'مايو', donations: 155, completion: 97, satisfaction: 4.7 },
    { month: 'يونيو', donations: 140, completion: 93, satisfaction: 4.6 }
  ])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-SA')
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { label: "مكتمل", color: "bg-green-100 text-green-800" },
      in_progress: { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-800" },
      pending: { label: "في الانتظار", color: "bg-yellow-100 text-yellow-800" }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const exportReport = () => {
    // هنا يتم تصدير التقرير
    console.log('تصدير التقرير:', reportType, dateRange)
  }

  const filteredDonations = donationReports.filter(donation =>
    donation.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donation.beneficiary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donation.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">التقارير المفصلة</h1>
          <p className="text-gray-600 mt-1">تقارير شاملة ومفصلة عن أداء النظام</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            <option value="donations">تقرير التبرعات</option>
            <option value="suppliers">تقرير الموردين</option>
            <option value="representatives">تقرير المندوبين</option>
            <option value="performance">تقرير الأداء</option>
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="quarter">هذا الربع</option>
            <option value="year">هذا العام</option>
          </select>
          
          <Button onClick={exportReport} className="bg-alzad-burgundy hover:bg-alzad-burgundy/90">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* تقرير التبرعات */}
      {reportType === 'donations' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="البحث في التبرعات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-alzad-burgundy">تفاصيل التبرعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">المتبرع</th>
                      <th className="text-right p-3">المبلغ</th>
                      <th className="text-right p-3">النوع</th>
                      <th className="text-right p-3">المستفيد</th>
                      <th className="text-right p-3">الموقع</th>
                      <th className="text-right p-3">التاريخ</th>
                      <th className="text-right p-3">الحالة</th>
                      <th className="text-right p-3">وقت الإنجاز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonations.map((donation) => (
                      <tr key={donation.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{donation.donorName}</td>
                        <td className="p-3 font-semibold text-alzad-burgundy">
                          {formatCurrency(donation.amount)}
                        </td>
                        <td className="p-3">{donation.type}</td>
                        <td className="p-3">{donation.beneficiary}</td>
                        <td className="p-3 text-gray-600">{donation.location}</td>
                        <td className="p-3">{formatDate(donation.date)}</td>
                        <td className="p-3">{getStatusBadge(donation.status)}</td>
                        <td className="p-3">
                          {donation.completionTime ? `${donation.completionTime} أيام` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* تقرير الموردين */}
      {reportType === 'suppliers' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-alzad-burgundy">تقرير أداء الموردين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3">اسم المورد</th>
                    <th className="text-right p-3">عدد الطلبات</th>
                    <th className="text-right p-3">إجمالي المبلغ</th>
                    <th className="text-right p-3">التقييم</th>
                    <th className="text-right p-3">معدل الإنجاز</th>
                    <th className="text-right p-3">متوسط وقت التسليم</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierReports.map((supplier) => (
                    <tr key={supplier.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{supplier.supplierName}</td>
                      <td className="p-3">{supplier.ordersCount}</td>
                      <td className="p-3 font-semibold text-alzad-burgundy">
                        {formatCurrency(supplier.totalAmount)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {supplier.averageRating}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-green-600 font-medium">
                          {supplier.completionRate}%
                        </span>
                      </td>
                      <td className="p-3">{supplier.averageDeliveryTime} أيام</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* تقرير المندوبين */}
      {reportType === 'representatives' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-alzad-burgundy">تقرير أداء المندوبين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3">اسم المندوب</th>
                    <th className="text-right p-3">المهام المكتملة</th>
                    <th className="text-right p-3">التقييم</th>
                    <th className="text-right p-3">المنطقة</th>
                    <th className="text-right p-3">متوسط وقت الإنجاز</th>
                    <th className="text-right p-3">معدل التوثيق</th>
                  </tr>
                </thead>
                <tbody>
                  {representativeReports.map((rep) => (
                    <tr key={rep.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{rep.representativeName}</td>
                      <td className="p-3">{rep.tasksCompleted}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {rep.averageRating}
                        </div>
                      </td>
                      <td className="p-3">{rep.area}</td>
                      <td className="p-3">{rep.averageCompletionTime} ساعة</td>
                      <td className="p-3">
                        <span className="text-green-600 font-medium">
                          {rep.documentationRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* تقرير الأداء */}
      {reportType === 'performance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-alzad-burgundy">مؤشرات الأداء الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="donations" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    name="عدد التبرعات"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completion" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="معدل الإنجاز (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-alzad-burgundy">متوسط التبرعات الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-alzad-burgundy">137</div>
                <p className="text-sm text-gray-600">تبرع شهرياً</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-alzad-burgundy">متوسط معدل الإنجاز</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">94.5%</div>
                <p className="text-sm text-gray-600">معدل إنجاز ممتاز</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-alzad-burgundy">متوسط الرضا</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">4.65</div>
                <p className="text-sm text-gray-600">من 5 نجوم</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailedReports

