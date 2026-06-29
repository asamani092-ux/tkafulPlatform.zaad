import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Heart, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalSponsorships: 1250,
    pendingSponsorships: 45,
    completedSponsorships: 1180,
    totalUsers: 3500,
    totalAmount: 2500000
  })

  const [recentSponsorships, setRecentSponsorships] = useState([
    {
      id: 1,
      donorName: "أحمد محمد",
      type: "طعام",
      amount: 500,
      status: "pending",
      createdAt: "2024-01-15T10:30:00Z",
      location: "الرياض"
    },
    {
      id: 2,
      donorName: "فاطمة علي",
      type: "ملابس",
      amount: 300,
      status: "approved",
      createdAt: "2024-01-15T09:15:00Z",
      location: "جدة"
    },
    {
      id: 3,
      donorName: "محمد سالم",
      type: "أدوية",
      amount: 800,
      status: "in_progress",
      createdAt: "2024-01-15T08:45:00Z",
      location: "الدمام"
    },
    {
      id: 4,
      donorName: "عائشة أحمد",
      type: "طعام",
      amount: 400,
      status: "completed",
      createdAt: "2024-01-14T16:20:00Z",
      location: "مكة"
    }
  ])

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "في الانتظار", variant: "secondary", icon: Clock },
      approved: { label: "معتمد", variant: "default", icon: CheckCircle },
      in_progress: { label: "قيد التنفيذ", variant: "outline", icon: TrendingUp },
      completed: { label: "مكتمل", variant: "success", icon: CheckCircle },
      rejected: { label: "مرفوض", variant: "destructive", icon: XCircle }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const IconComponent = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">لوحة تحكم المشرف</h1>
          <p className="text-gray-600 mt-1">مرحباً بك في منصة كفالات السقيا</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <TrendingUp className="w-4 h-4 ml-2" />
            التقارير
          </Button>
          <Button className="bg-alzad-burgundy hover:bg-alzad-burgundy/90">
            <Users className="w-4 h-4 ml-2" />
            إدارة المستخدمين
          </Button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الكفالات</CardTitle>
            <Heart className="h-4 w-4 text-alzad-burgundy" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">{stats.totalSponsorships.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingSponsorships}</div>
            <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedSponsorships.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">94% معدل الإنجاز</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
            <TrendingUp className="h-4 w-4 text-alzad-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">+15% من الشهر الماضي</p>
          </CardContent>
        </Card>
      </div>

      {/* الكفالات الحديثة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-alzad-burgundy">الكفالات الحديثة</CardTitle>
            <Button variant="outline" size="sm">
              عرض الكل
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSponsorships.map((sponsorship) => (
              <div key={sponsorship.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="w-10 h-10 bg-alzad-burgundy/10 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-alzad-burgundy" />
                  </div>
                  <div>
                    <div className="font-semibold text-alzad-burgundy">{sponsorship.donorName}</div>
                    <div className="text-sm text-gray-600">
                      {sponsorship.type} - {sponsorship.location}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(sponsorship.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="text-left">
                    <div className="font-semibold text-alzad-burgundy">
                      {formatCurrency(sponsorship.amount)}
                    </div>
                    {getStatusBadge(sponsorship.status)}
                  </div>
                  
                  <div className="flex space-x-2 space-x-reverse">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    {sponsorship.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* تنبيهات سريعة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy flex items-center">
              <AlertTriangle className="w-5 h-5 ml-2 text-yellow-500" />
              تنبيهات مهمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <div className="font-medium">45 كفالة تحتاج مراجعة</div>
                  <div className="text-sm text-gray-600">منذ أكثر من 24 ساعة</div>
                </div>
                <Button size="sm" variant="outline">
                  مراجعة
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium">12 طلب توريد متأخر</div>
                  <div className="text-sm text-gray-600">تجاوز الموعد المحدد</div>
                </div>
                <Button size="sm" variant="outline">
                  متابعة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">إحصائيات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">معدل الموافقة</span>
                <span className="font-semibold text-green-600">94%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">متوسط وقت المراجعة</span>
                <span className="font-semibold">18 ساعة</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">متوسط وقت التنفيذ</span>
                <span className="font-semibold">2.5 يوم</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">رضا المتبرعين</span>
                <span className="font-semibold text-alzad-burgundy">4.8/5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard

