import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Filter, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck,
  FileText,
  Upload,
  Eye,
  Calendar,
  MapPin,
  DollarSign
} from 'lucide-react'

const OrderManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const [orders, setOrders] = useState([
    {
      id: 1,
      sponsorshipId: 15,
      donorName: "أحمد محمد السالم",
      type: "طعام",
      items: [
        { name: "أرز بسمتي", quantity: "10 كيلو", price: 80 },
        { name: "زيت زيتون", quantity: "2 لتر", price: 60 },
        { name: "سكر أبيض", quantity: "5 كيلو", price: 25 },
        { name: "شاي أحمر", quantity: "500 جرام", price: 15 }
      ],
      totalAmount: 500,
      status: "pending",
      priority: "normal",
      targetDate: "2024-01-20",
      location: "الرياض - حي النسيم",
      address: "شارع الملك فهد، حي النسيم، الرياض",
      contactPhone: "+966501234567",
      createdAt: "2024-01-15T10:30:00Z",
      notes: "يرجى التأكد من جودة الأرز وتاريخ الصلاحية"
    },
    {
      id: 2,
      sponsorshipId: 18,
      donorName: "فاطمة علي أحمد",
      type: "ملابس",
      items: [
        { name: "ملابس شتوية للأطفال", quantity: "10 قطع", price: 200 },
        { name: "أحذية شتوية", quantity: "5 أزواج", price: 100 }
      ],
      totalAmount: 300,
      status: "preparing",
      priority: "high",
      targetDate: "2024-01-18",
      location: "جدة - حي الصفا",
      address: "طريق الملك عبدالعزيز، حي الصفا، جدة",
      contactPhone: "+966507654321",
      createdAt: "2024-01-15T09:15:00Z",
      notes: "مقاسات متنوعة للأطفال من عمر 5-12 سنة"
    },
    {
      id: 3,
      sponsorshipId: 22,
      donorName: "محمد سالم الغامدي",
      type: "أدوية",
      items: [
        { name: "أدوية السكري", quantity: "شهر واحد", price: 400 },
        { name: "أدوية الضغط", quantity: "شهر واحد", price: 300 },
        { name: "فيتامينات", quantity: "علبة واحدة", price: 100 }
      ],
      totalAmount: 800,
      status: "ready",
      priority: "urgent",
      targetDate: "2024-01-16",
      location: "الدمام - حي الفيصلية",
      address: "شارع الأمير محمد بن فهد، حي الفيصلية، الدمام",
      contactPhone: "+966509876543",
      createdAt: "2024-01-15T08:45:00Z",
      notes: "أدوية مزمنة - يرجى التأكد من تاريخ الصلاحية"
    }
  ])

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "جديد", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      preparing: { label: "قيد التحضير", color: "bg-blue-100 text-blue-800", icon: Package },
      ready: { label: "جاهز للتسليم", color: "bg-green-100 text-green-800", icon: CheckCircle },
      delivered: { label: "تم التسليم", color: "bg-green-100 text-green-800", icon: Truck }
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleStatusUpdate = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
  }

  const handleUploadInvoice = (order) => {
    setSelectedOrder(order)
    setShowInvoiceModal(true)
  }

  const submitInvoice = () => {
    if (selectedOrder && invoiceFile) {
      // هنا يتم رفع الفاتورة للخادم
      console.log('رفع فاتورة للطلب:', selectedOrder.id)
      setShowInvoiceModal(false)
      setInvoiceFile(null)
      setSelectedOrder(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">إدارة الطلبات</h1>
          <p className="text-gray-600 mt-1">متابعة وإدارة جميع طلبات التوريد</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في الطلبات..."
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
            <option value="pending">جديد</option>
            <option value="preparing">قيد التحضير</option>
            <option value="ready">جاهز للتسليم</option>
            <option value="delivered">تم التسليم</option>
          </select>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">طلبات جديدة</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orders.filter(o => o.status === 'pending').length}
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
                <p className="text-sm text-gray-600">قيد التحضير</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.status === 'preparing').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">جاهز للتسليم</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'ready').length}
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
                <p className="text-sm text-gray-600">إجمالي القيمة</p>
                <p className="text-lg font-bold text-alzad-burgundy">
                  {formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-alzad-burgundy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الطلبات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-alzad-burgundy">
            قائمة الطلبات ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                        {getPriorityBadge(order.priority)}
                      </div>
                      <span className="text-sm text-gray-500">طلب #{order.id}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">المتبرع:</span>
                          <span>{order.donorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{order.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            التاريخ المستهدف: {new Date(order.targetDate).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">النوع:</span>
                          <span>{order.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="font-bold text-alzad-burgundy">{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          تاريخ الإنشاء: {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    {/* قائمة الأصناف */}
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="font-semibold mb-2">الأصناف المطلوبة:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>{item.name} - {item.quantity}</span>
                            <span className="font-semibold">{formatCurrency(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {order.notes && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>ملاحظات:</strong> {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 lg:w-48">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 ml-2" />
                      عرض التفاصيل
                    </Button>
                    
                    {order.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                      >
                        <Package className="w-4 h-4 ml-2" />
                        بدء التحضير
                      </Button>
                    )}
                    
                    {order.status === 'preparing' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        جاهز للتسليم
                      </Button>
                    )}
                    
                    {order.status === 'ready' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-alzad-burgundy hover:bg-alzad-burgundy/90 text-white"
                        onClick={() => handleStatusUpdate(order.id, 'delivered')}
                      >
                        <Truck className="w-4 h-4 ml-2" />
                        تم التسليم
                      </Button>
                    )}
                    
                    {(order.status === 'ready' || order.status === 'delivered') && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleUploadInvoice(order)}
                      >
                        <Upload className="w-4 h-4 ml-2" />
                        رفع فاتورة
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* نافذة رفع الفاتورة */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-alzad-burgundy mb-4">
              رفع فاتورة - طلب #{selectedOrder?.id}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملف الفاتورة
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setInvoiceFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
                />
                <p className="text-xs text-gray-500 mt-1">
                  يُقبل ملفات PDF أو صور (JPG, PNG)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات التسليم (اختياري)
                </label>
                <Textarea
                  placeholder="أي ملاحظات حول عملية التسليم..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={submitInvoice}
                className="flex-1 bg-alzad-burgundy hover:bg-alzad-burgundy/90"
                disabled={!invoiceFile}
              >
                <Upload className="w-4 h-4 ml-2" />
                رفع الفاتورة
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowInvoiceModal(false)}
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

export default OrderManagement

