import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  DollarSign,
  FileText,
  Truck,
  Star,
  Calendar,
  AlertTriangle
} from 'lucide-react'

const SupplierDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 125,
    pendingOrders: 8,
    completedOrders: 110,
    totalRevenue: 85000,
    rating: 4.8,
    activeOrders: 7
  })

  const [recentOrders, setRecentOrders] = useState([
    {
      id: 1,
      sponsorshipId: 15,
      type: "طعام",
      items: "أرز، زيت، سكر، شاي",
      amount: 500,
      status: "pending",
      priority: "normal",
      targetDate: "2024-01-20",
      location: "الرياض - حي النسيم",
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      sponsorshipId: 18,
      type: "ملابس",
      items: "ملابس شتوية للأطفال",
      amount: 300,
      status: "preparing",
      priority: "high",
      targetDate: "2024-01-18",
      location: "جدة - حي الصفا",
      createdAt: "2024-01-15T09:15:00Z"
    },
    {
      id: 3,
      sponsorshipId: 22,
      type: "أدوية",
      items: "أدوية مزمنة - السكري",
      amount: 800,
      status: "ready",
      priority: "urgent",
      targetDate: "2024-01-16",
      location: "الدمام - حي الفيصلية",
      createdAt: "2024-01-15T08:45:00Z"
    },
    {
      id: 4,
      sponsorshipId: 25,
      type: "طعام",
      items: "وجبات جاهزة للعائلات",
      amount: 600,
      status: "delivered",
      priority: "normal",
      targetDate: "2024-01-14",
      location: "مكة - العزيزية",
      createdAt: "2024-01-14T16:20:00Z"
    }
  ])

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "جديد", variant: "secondary", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
      preparing: { label: "قيد التحضير", variant: "default", icon: Package, color: "bg-blue-100 text-blue-800" },
      ready: { label: "جاهز للتسليم", variant: "outline", icon: CheckCircle, color: "bg-green-100 text-green-800" },
      delivered: { label: "تم التسليم", variant: "success", icon: Truck, color: "bg-green-100 text-green-800" }
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

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      urgent: { label: "عاجل", color: "bg-red-100 text-red-800" },
      high: { label: "مرتفع", color: "bg-orange-100 text-orange-800" },
      normal: { label: "عادي", color: "bg-gray-100 text-gray-800" }
    }
    
    const config = priorityConfig[priority] || priorityConfig.normal
    
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

  const handleStatusUpdate = (orderId, newStatus) => {
    setRecentOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">لوحة تحكم المورد</h1>
          <p className="text-gray-600 mt-1">مرحباً بك في منصة كفالات السقيا</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 ml-2" />
            الفواتير
          </Button>
          <Button className="bg-alzad-burgundy hover:bg-alzad-burgundy/90">
            <Package className="w-4 h-4 ml-2" />
            طلب جديد
          </Button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <Package className="h-4 w-4 text-alzad-burgundy" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">+8% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات جديدة</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">تحتاج تحضير</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نشطة</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground">قيد التحضير</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">88% معدل الإنجاز</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-alzad-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">+12% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التقييم</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.rating}</div>
            <p className="text-xs text-muted-foreground">من 5 نجوم</p>
          </CardContent>
        </Card>
      </div>

      {/* الطلبات الحديثة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-alzad-burgundy">الطلبات الحديثة</CardTitle>
            <Button variant="outline" size="sm">
              عرض جميع الطلبات
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="w-10 h-10 bg-alzad-burgundy/10 rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-alzad-burgundy" />
                  </div>
                  <div>
                    <div className="font-semibold text-alzad-burgundy">طلب #{order.id}</div>
                    <div className="text-sm text-gray-600">
                      {order.type} - {order.location}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.items}
                    </div>
                    <div className="text-xs text-gray-500">
                      التاريخ المستهدف: {new Date(order.targetDate).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="text-left">
                    <div className="font-semibold text-alzad-burgundy">
                      {formatCurrency(order.amount)}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {getStatusBadge(order.status)}
                      {getPriorityBadge(order.priority)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 space-x-reverse">
                    {order.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                      >
                        بدء التحضير
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                      >
                        جاهز للتسليم
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button 
                        size="sm" 
                        className="bg-alzad-burgundy hover:bg-alzad-burgundy/90 text-white"
                        onClick={() => handleStatusUpdate(order.id, 'delivered')}
                      >
                        تم التسليم
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      التفاصيل
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* تنبيهات وإحصائيات سريعة */}
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
                  <div className="font-medium">3 طلبات عاجلة</div>
                  <div className="text-sm text-gray-600">تحتاج تحضير فوري</div>
                </div>
                <Button size="sm" variant="outline">
                  عرض
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium">2 فاتورة معلقة</div>
                  <div className="text-sm text-gray-600">تحتاج رفع للنظام</div>
                </div>
                <Button size="sm" variant="outline">
                  رفع
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-alzad-burgundy">أداء هذا الشهر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">الطلبات المكتملة</span>
                <span className="font-semibold text-green-600">28 طلب</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">متوسط وقت التحضير</span>
                <span className="font-semibold">6 ساعات</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">معدل رضا العملاء</span>
                <span className="font-semibold text-alzad-burgundy">4.8/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">الإيرادات</span>
                <span className="font-semibold text-alzad-burgundy">{formatCurrency(12500)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SupplierDashboard

