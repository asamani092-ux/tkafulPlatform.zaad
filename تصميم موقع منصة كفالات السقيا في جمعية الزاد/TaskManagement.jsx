import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Camera,
  FileText,
  Upload,
  Eye,
  Calendar,
  Navigation,
  Phone,
  User
} from 'lucide-react'

const TaskManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showDocumentationModal, setShowDocumentationModal] = useState(false)
  const [documentationImages, setDocumentationImages] = useState([])
  const [documentationNotes, setDocumentationNotes] = useState('')

  const [tasks, setTasks] = useState([
    {
      id: 1,
      sponsorshipId: 15,
      donorName: "أحمد محمد السالم",
      type: "توثيق تسليم",
      description: "توثيق تسليم مواد غذائية لعائلة أبو أحمد",
      location: "الرياض - حي النسيم - شارع الملك فهد",
      address: "شارع الملك فهد، مبنى 123، شقة 5",
      status: "pending",
      priority: "high",
      scheduledDate: "2024-01-20",
      scheduledTime: "10:00 ص",
      estimatedDuration: "30 دقيقة",
      contactPhone: "+966501234567",
      contactName: "أبو أحمد",
      supplierName: "مؤسسة الغامدي للتموين",
      items: ["أرز بسمتي 10 كيلو", "زيت زيتون 2 لتر", "سكر أبيض 5 كيلو"],
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      sponsorshipId: 18,
      type: "متابعة ميدانية",
      description: "متابعة حالة الأسرة المستفيدة من كفالة الملابس",
      location: "الرياض - حي الملز - شارع العليا",
      address: "شارع العليا، مجمع الأمل السكني، بناء ب، شقة 12",
      status: "in_progress",
      priority: "normal",
      scheduledDate: "2024-01-20",
      scheduledTime: "2:00 م",
      estimatedDuration: "45 دقيقة",
      contactPhone: "+966507654321",
      contactName: "أم فاطمة",
      supplierName: "متجر الأمل للملابس",
      items: ["ملابس شتوية للأطفال", "أحذية شتوية"],
      createdAt: "2024-01-15T09:15:00Z"
    },
    {
      id: 3,
      sponsorshipId: 22,
      type: "توثيق تسليم",
      description: "توثيق تسليم الأدوية للمريض",
      location: "الرياض - حي الورود - شارع الأمير سلطان",
      address: "شارع الأمير سلطان، فيلا 45",
      status: "completed",
      priority: "urgent",
      scheduledDate: "2024-01-19",
      scheduledTime: "8:00 ص",
      estimatedDuration: "20 دقيقة",
      contactPhone: "+966509876543",
      contactName: "أبو محمد",
      supplierName: "صيدلية النور",
      items: ["أدوية السكري", "أدوية الضغط", "فيتامينات"],
      createdAt: "2024-01-15T08:45:00Z",
      completedAt: "2024-01-19T08:15:00Z",
      documentation: {
        images: ["doc1.jpg", "doc2.jpg"],
        notes: "تم التسليم بنجاح. المريض في حالة جيدة."
      }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleStatusUpdate = (taskId, newStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { 
        ...task, 
        status: newStatus,
        ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
      } : task
    ))
  }

  const handleDocumentation = (task) => {
    setSelectedTask(task)
    setShowDocumentationModal(true)
  }

  const submitDocumentation = () => {
    if (selectedTask && (documentationImages.length > 0 || documentationNotes.trim())) {
      setTasks(prev => prev.map(task => 
        task.id === selectedTask.id ? {
          ...task,
          status: 'completed',
          completedAt: new Date().toISOString(),
          documentation: {
            images: documentationImages.map(img => img.name),
            notes: documentationNotes
          }
        } : task
      ))
      setShowDocumentationModal(false)
      setDocumentationImages([])
      setDocumentationNotes('')
      setSelectedTask(null)
    }
  }

  const openMaps = (location) => {
    const encodedLocation = encodeURIComponent(location)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, '_blank')
  }

  const makeCall = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">إدارة المهام</h1>
          <p className="text-gray-600 mt-1">متابعة وتوثيق جميع المهام الميدانية</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في المهام..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 w-full sm:w-64"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">في الانتظار</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
          </select>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">في الانتظار</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tasks.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">قيد التنفيذ</p>
                <p className="text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
              <Navigation className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">مكتملة</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المهام</p>
                <p className="text-2xl font-bold text-alzad-burgundy">
                  {tasks.length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-alzad-burgundy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة المهام */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-alzad-burgundy">
            قائمة المهام ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredTasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                      <span className="text-sm text-gray-500">مهمة #{task.id}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">المستفيد:</span>
                          <span>{task.contactName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{task.contactPhone}</span>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => makeCall(task.contactPhone)}
                            className="h-6 px-2 text-xs"
                          >
                            اتصال
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{task.location}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          العنوان: {task.address}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{formatDate(task.scheduledDate)}</span>
                          <span className="text-alzad-burgundy font-bold">{task.scheduledTime}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          المدة المتوقعة: {task.estimatedDuration}
                        </div>
                        <div className="text-sm text-gray-600">
                          المورد: {task.supplierName}
                        </div>
                        <div className="text-sm text-gray-500">
                          تاريخ الإنشاء: {formatDate(task.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-700 font-medium mb-2">{task.description}</p>
                      <div className="text-xs text-gray-600">
                        <strong>الأصناف:</strong> {task.items.join(', ')}
                      </div>
                    </div>
                    
                    {task.documentation && (
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-sm text-green-800">
                          <strong>التوثيق:</strong> {task.documentation.notes}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          الصور: {task.documentation.images.length} صورة
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 lg:w-48">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => openMaps(task.location)}
                    >
                      <Navigation className="w-4 h-4 ml-2" />
                      فتح الخريطة
                    </Button>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 ml-2" />
                      عرض التفاصيل
                    </Button>
                    
                    {task.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                      >
                        بدء المهمة
                      </Button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleDocumentation(task)}
                      >
                        <Camera className="w-4 h-4 ml-2" />
                        توثيق وإكمال
                      </Button>
                    )}
                    
                    {task.status === 'completed' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                      >
                        <FileText className="w-4 h-4 ml-2" />
                        عرض التوثيق
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* نافذة التوثيق */}
      {showDocumentationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-alzad-burgundy mb-4">
              توثيق المهمة #{selectedTask?.id}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  صور التوثيق
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setDocumentationImages(Array.from(e.target.files))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
                />
                <p className="text-xs text-gray-500 mt-1">
                  يمكنك اختيار عدة صور للتوثيق
                </p>
                {documentationImages.length > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    تم اختيار {documentationImages.length} صورة
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات التوثيق
                </label>
                <Textarea
                  placeholder="اكتب ملاحظاتك حول تنفيذ المهمة..."
                  value={documentationNotes}
                  onChange={(e) => setDocumentationNotes(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>تذكير:</strong> تأكد من توثيق جميع التفاصيل المهمة مثل حالة المستفيد وجودة الأصناف المسلمة.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={submitDocumentation}
                className="flex-1 bg-alzad-burgundy hover:bg-alzad-burgundy/90"
                disabled={documentationImages.length === 0 && !documentationNotes.trim()}
              >
                <Upload className="w-4 h-4 ml-2" />
                حفظ التوثيق
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDocumentationModal(false)}
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

export default TaskManagement

