import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react'

const SponsorshipManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSponsorship, setSelectedSponsorship] = useState(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const [sponsorships, setSponsorships] = useState([
    {
      id: 1,
      donorName: "أحمد محمد السالم",
      donorEmail: "ahmed@example.com",
      donorPhone: "+966501234567",
      type: "طعام",
      amount: 500,
      description: "كفالة طعام لعائلة محتاجة في حي النسيم",
      location: "الرياض - حي النسيم",
      beneficiariesCount: 5,
      status: "pending",
      priority: "normal",
      targetDate: "2024-01-20",
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      donorName: "فاطمة علي أحمد",
      donorEmail: "fatima@example.com",
      donorPhone: "+966507654321",
      type: "ملابس",
      amount: 300,
      description: "ملابس شتوية للأطفال",
      location: "جدة - حي الصفا",
      beneficiariesCount: 3,
      status: "approved",
      priority: "high",
      targetDate: "2024-01-18",
      createdAt: "2024-01-15T09:15:00Z"
    },
    {
      id: 3,
      donorName: "محمد سالم الغامدي",
      donorEmail: "mohammed@example.com",
      donorPhone: "+966509876543",
      type: "أدوية",
      amount: 800,
      description: "أدوية مزمنة لمريض السكري",
      location: "الدمام - حي الفيصلية",
      beneficiariesCount: 1,
      status: "pending",
      priority: "urgent",
      targetDate: "2024-01-16",
      createdAt: "2024-01-15T08:45:00Z"
    }
  ])

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "في الانتظار", variant: "secondary", color: "bg-yellow-100 text-yellow-800" },
      approved: { label: "معتمد", variant: "default", color: "bg-green-100 text-green-800" },
      rejected: { label: "مرفوض", variant: "destructive", color: "bg-red-100 text-red-800" },
      in_progress: { label: "قيد التنفيذ", variant: "outline", color: "bg-blue-100 text-blue-800" },
      completed: { label: "مكتمل", variant: "success", color: "bg-green-100 text-green-800" }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      urgent: { label: "عاجل", color: "bg-red-100 text-red-800" },
      high: { label: "مرتفع", color: "bg-orange-100 text-orange-800" },
      normal: { label: "عادي", color: "bg-gray-100 text-gray-800" },
      low: { label: "منخفض", color: "bg-blue-100 text-blue-800" }
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

  const filteredSponsorships = sponsorships.filter(sponsorship => {
    const matchesSearch = sponsorship.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sponsorship.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sponsorship.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || sponsorship.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleApprove = (sponsorship) => {
    setSelectedSponsorship(sponsorship)
    setShowApprovalModal(true)
  }

  const handleReject = (sponsorship) => {
    setSelectedSponsorship(sponsorship)
    setShowRejectionModal(true)
  }

  const confirmApproval = () => {
    if (selectedSponsorship) {
      setSponsorships(prev => prev.map(s => 
        s.id === selectedSponsorship.id 
          ? { ...s, status: 'approved' }
          : s
      ))
      setShowApprovalModal(false)
      setApprovalNotes('')
      setSelectedSponsorship(null)
    }
  }

  const confirmRejection = () => {
    if (selectedSponsorship && rejectionReason.trim()) {
      setSponsorships(prev => prev.map(s => 
        s.id === selectedSponsorship.id 
          ? { ...s, status: 'rejected' }
          : s
      ))
      setShowRejectionModal(false)
      setRejectionReason('')
      setSelectedSponsorship(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">إدارة الكفالات</h1>
          <p className="text-gray-600 mt-1">مراجعة واعتماد طلبات الكفالة</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في الكفالات..."
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
            <option value="approved">معتمد</option>
            <option value="rejected">مرفوض</option>
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
                  {sponsorships.filter(s => s.status === 'pending').length}
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
                <p className="text-sm text-gray-600">معتمد</p>
                <p className="text-2xl font-bold text-green-600">
                  {sponsorships.filter(s => s.status === 'approved').length}
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
                <p className="text-sm text-gray-600">مرفوض</p>
                <p className="text-2xl font-bold text-red-600">
                  {sponsorships.filter(s => s.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المبلغ</p>
                <p className="text-lg font-bold text-alzad-burgundy">
                  {formatCurrency(sponsorships.reduce((sum, s) => sum + s.amount, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-alzad-burgundy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الكفالات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-alzad-burgundy">
            قائمة الكفالات ({filteredSponsorships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSponsorships.map((sponsorship) => (
              <div key={sponsorship.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sponsorship.status)}
                        {getPriorityBadge(sponsorship.priority)}
                      </div>
                      <span className="text-sm text-gray-500">#{sponsorship.id}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">{sponsorship.donorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{sponsorship.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            التاريخ المستهدف: {new Date(sponsorship.targetDate).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{sponsorship.type}</span>
                          <span className="text-alzad-burgundy font-bold">{formatCurrency(sponsorship.amount)}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          عدد المستفيدين: {sponsorship.beneficiariesCount}
                        </div>
                        <div className="text-sm text-gray-500">
                          تاريخ الإنشاء: {formatDate(sponsorship.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-700">{sponsorship.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 lg:w-48">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 ml-2" />
                      عرض التفاصيل
                    </Button>
                    
                    {sponsorship.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(sponsorship)}
                        >
                          <CheckCircle className="w-4 h-4 ml-2" />
                          اعتماد
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="w-full"
                          onClick={() => handleReject(sponsorship)}
                        >
                          <XCircle className="w-4 h-4 ml-2" />
                          رفض
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

      {/* نافذة الاعتماد */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-alzad-burgundy mb-4">
              اعتماد الكفالة #{selectedSponsorship?.id}
            </h3>
            <p className="text-gray-600 mb-4">
              هل أنت متأكد من اعتماد هذه الكفالة؟
            </p>
            <Textarea
              placeholder="ملاحظات إضافية (اختياري)"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button 
                onClick={confirmApproval}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                تأكيد الاعتماد
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowApprovalModal(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الرفض */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              رفض الكفالة #{selectedSponsorship?.id}
            </h3>
            <p className="text-gray-600 mb-4">
              يرجى تحديد سبب الرفض:
            </p>
            <Textarea
              placeholder="سبب الرفض مطلوب..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mb-4"
              required
            />
            <div className="flex gap-2">
              <Button 
                onClick={confirmRejection}
                variant="destructive"
                className="flex-1"
                disabled={!rejectionReason.trim()}
              >
                تأكيد الرفض
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowRejectionModal(false)}
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

export default SponsorshipManagement

