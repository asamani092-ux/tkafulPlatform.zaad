import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Camera, 
  FileText,
  TrendingUp,
  Users,
  Star,
  Calendar,
  AlertTriangle,
  Navigation
} from 'lucide-react'

const RepresentativeDashboard = () => {
  const [stats, setStats] = useState({
    totalTasks: 85,
    pendingTasks: 6,
    completedTasks: 75,
    todayTasks: 4,
    rating: 4.6,
    area: "الرياض - الشمال"
  })

  const [todayTasks, setTodayTasks] = useState([
    {
      id: 1,
      sponsorshipId: 15,
      type: "توثيق تسليم",
      description: "توثيق تسليم مواد غذائية لعائلة أبو أحمد",
      location: "الرياض - حي النسيم - شارع الملك فهد",
      status: "pending",
      priority: "high",
      scheduledTime: "10:00 ص",
      estimatedDuration: "30 دقيقة",
      contactPhone: "+966501234567",
      supplierName: "مؤسسة الغامدي للتموين"
    },
    {
      id: 2,
      sponsorshipId: 18,
      type: "متابعة ميدانية",
      description: "متابعة حالة الأسرة المستفيدة من كفالة الملابس",
      location: "الرياض - حي الملز - شارع العليا",
      status: "in_progress",
      priority: "normal",
      scheduledTime: "2:00 م",
      estimatedDuration: "45 دقيقة",
      contactPhone: "+966507654321",
      supplierName: "متجر الأمل للملابس"
    },
    {
      id: 3,
      sponsorshipId: 22,
      type: "توثيق تسليم",
      description: "توثيق تسليم الأدوية للمريض",
      location: "الرياض - حي الورود - شارع الأمير سلطان",
      status: "completed",
      priority: "urgent",
      scheduledTime: "8:00 ص",
      estimatedDuration: "20 دقيقة",
      contactPhone: "+966509876543",
      supplierName: "صيدلية النور"
    }
  ])

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "في الانتظار", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      in_progress: { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-800", icon: Navigation },
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

  const handleStatusUpdate = (taskId, newStatus) => {
    setTodayTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ))
  }

  const openMaps = (location) => {
    // فتح خرائط جوجل مع الموقع
    const encodedLocation = encodeURIComponent(location)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, '_blank')
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">لوحة تحكم المندوب</h1>
          <p className="text-gray-600 mt-1">مرحباً بك في منصة كفالات السقيا</p>
          <p className="text-sm text-alzad-burgundy font-medium">منطقة العمل: {stats.area}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 ml-2" />
            التقارير
          </Button>
          <Button className="bg-alzad-burgundy hover:bg-alzad-burgundy/90">
            <Camera className="w-4 h-4 ml-2" />
            توثيق جديد
          </Button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
            <FileText className="h-4 w-4 text-alzad-burgundy" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-alzad-burgundy">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">+5% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">تحتاج تنفيذ</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مهام اليوم</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.todayTasks}</div>
            <p className="text-xs text-muted-foreground">مجدولة لليوم</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">88% معدل الإنجاز</p>
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

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المنطقة</CardTitle>
            <MapPin className="h-4 w-4 text-alzad-burgundy" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-alzad-burgundy">{stats.area}</div>
            <p className="text-xs text-muted-foreground">منطقة العمل</p>
          </CardContent>
        </Card>
      </div>

      {/* مهام اليوم */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-alzad-burgundy">مهام اليوم</CardTitle>
            <Button variant="outline" size="sm">
              عرض جميع المهام
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="w-10 h-10 bg-alzad-burgundy/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-alzad-burgundy" />
                  </div>
                  <div>
                    <div className="font-semibold text-alzad-burgundy">مهمة #{task.id}</div>
                    <div className="text-sm text-gray-600">
                      {task.type} - {task.scheduledTime}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.description}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {task.location}
                    </div>
                    <div className="text-xs text-gray-500">
                      المورد: {task.supplierName}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="text-left">
                    <div className="text-sm text-gray-600">
                      المدة المتوقعة: {task.estimatedDuration}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 space-x-reverse">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openMaps(task.location)}
                    >
                      <Navigation className="w-4 h-4" />
                    </Button>
                    
                    {task.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                      >
                        بدء المهمة
                      </Button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStatusUpdate(task.id, 'completed')}
                      >
                        إكمال
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
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium">مهمة عاجلة</div>
                  <div className="text-sm text-gray-600">توثيق تسليم أدوية - متأخرة</div>
                </div>
                <Button size="sm" variant="outline">
                  عرض
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium">3 مهام جديدة</div>
                  <div className="text-sm text-gray-600">تم إضافتها لجدولك</div>
                </div>
                <Button size="sm" variant="outline">
                  مراجعة
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
                <span className="text-gray-600">المهام المكتملة</span>
                <span className="font-semibold text-green-600">18 مهمة</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">متوسط وقت التنفيذ</span>
                <span className="font-semibold">35 دقيقة</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">معدل رضا المستفيدين</span>
                <span className="font-semibold text-alzad-burgundy">4.6/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">التقارير المرفوعة</span>
                <span className="font-semibold">15 تقرير</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RepresentativeDashboard

