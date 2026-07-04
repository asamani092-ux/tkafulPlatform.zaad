import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Shield,
  Truck,
  Heart,
  Phone,
  Mail,
  Calendar,
  MoreVertical
} from 'lucide-react'

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [users, setUsers] = useState([
    {
      id: 1,
      name: "أحمد محمد السالم",
      email: "ahmed@example.com",
      phone: "+966501234567",
      role: "donor",
      status: "active",
      createdAt: "2024-01-10T10:30:00Z",
      lastLogin: "2024-01-15T14:20:00Z",
      totalDonations: 5,
      totalAmount: 2500
    },
    {
      id: 2,
      name: "فاطمة علي أحمد",
      email: "fatima@example.com",
      phone: "+966507654321",
      role: "donor",
      status: "active",
      createdAt: "2024-01-08T09:15:00Z",
      lastLogin: "2024-01-14T11:45:00Z",
      totalDonations: 3,
      totalAmount: 1200
    },
    {
      id: 3,
      name: "محمد سالم الغامدي",
      email: "mohammed.supplier@example.com",
      phone: "+966509876543",
      role: "supplier",
      status: "active",
      createdAt: "2024-01-05T08:45:00Z",
      lastLogin: "2024-01-15T16:30:00Z",
      businessName: "مؤسسة الغامدي للتموين",
      specialization: "مواد غذائية",
      completedOrders: 25,
      rating: 4.8
    },
    {
      id: 4,
      name: "عبدالله أحمد الزهراني",
      email: "abdullah.rep@example.com",
      phone: "+966512345678",
      role: "representative",
      status: "active",
      createdAt: "2024-01-03T12:00:00Z",
      lastLogin: "2024-01-15T13:15:00Z",
      area: "الرياض - الشمال",
      completedTasks: 18,
      rating: 4.6
    },
    {
      id: 5,
      name: "سارة محمد القحطاني",
      email: "sara@example.com",
      phone: "+966505555555",
      role: "donor",
      status: "inactive",
      createdAt: "2024-01-12T15:30:00Z",
      lastLogin: "2024-01-13T10:20:00Z",
      totalDonations: 1,
      totalAmount: 300
    }
  ])

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: "مشرف", color: "bg-purple-100 text-purple-800", icon: Shield },
      donor: { label: "متبرع", color: "bg-green-100 text-green-800", icon: Heart },
      supplier: { label: "مورد", color: "bg-blue-100 text-blue-800", icon: Truck },
      representative: { label: "مندوب", color: "bg-orange-100 text-orange-800", icon: Users }
    }
    
    const config = roleConfig[role] || roleConfig.donor
    const IconComponent = config.icon
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: "نشط", color: "bg-green-100 text-green-800" },
      inactive: { label: "غير نشط", color: "bg-gray-100 text-gray-800" },
      suspended: { label: "موقوف", color: "bg-red-100 text-red-800" }
    }
    
    const config = statusConfig[status] || statusConfig.active
    
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm)
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    donors: users.filter(u => u.role === 'donor').length,
    suppliers: users.filter(u => u.role === 'supplier').length,
    representatives: users.filter(u => u.role === 'representative').length
  }

  const handleStatusChange = (userId, newStatus) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ))
  }

  return (
    <div className="p-6 space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-alzad-burgundy">إدارة المستخدمين</h1>
          <p className="text-gray-600 mt-1">إدارة جميع مستخدمي المنصة</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في المستخدمين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 w-full sm:w-64"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            <option value="all">جميع الأدوار</option>
            <option value="donor">متبرع</option>
            <option value="supplier">مورد</option>
            <option value="representative">مندوب</option>
            <option value="admin">مشرف</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-alzad-burgundy"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="suspended">موقوف</option>
          </select>
          
          <Button className="bg-alzad-burgundy hover:bg-alzad-burgundy/90">
            <UserPlus className="w-4 h-4 ml-2" />
            إضافة مستخدم
          </Button>
        </div>
      </div>

      {/* إحصائيات المستخدمين */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-alzad-burgundy">{userStats.total}</p>
              </div>
              <Users className="w-8 h-8 text-alzad-burgundy" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">نشط</p>
                <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">متبرعين</p>
                <p className="text-2xl font-bold text-green-600">{userStats.donors}</p>
              </div>
              <Heart className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">موردين</p>
                <p className="text-2xl font-bold text-blue-600">{userStats.suppliers}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">مندوبين</p>
                <p className="text-2xl font-bold text-orange-600">{userStats.representatives}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة المستخدمين */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-alzad-burgundy">
            قائمة المستخدمين ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">المستخدم</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الدور</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">تاريخ التسجيل</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">آخر دخول</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">إحصائيات</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-alzad-burgundy/10 rounded-full flex items-center justify-center">
                          <span className="text-alzad-burgundy font-semibold">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      {getRoleBadge(user.role)}
                      {user.role === 'supplier' && user.businessName && (
                        <div className="text-xs text-gray-500 mt-1">{user.businessName}</div>
                      )}
                      {user.role === 'representative' && user.area && (
                        <div className="text-xs text-gray-500 mt-1">{user.area}</div>
                      )}
                    </td>
                    
                    <td className="py-4 px-4">
                      {getStatusBadge(user.status)}
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-3 h-3" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">
                        {formatDate(user.lastLogin)}
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        {user.role === 'donor' && (
                          <>
                            <div className="text-gray-600">
                              {user.totalDonations} تبرع
                            </div>
                            <div className="text-alzad-burgundy font-semibold">
                              {formatCurrency(user.totalAmount)}
                            </div>
                          </>
                        )}
                        {user.role === 'supplier' && (
                          <>
                            <div className="text-gray-600">
                              {user.completedOrders} طلب
                            </div>
                            <div className="text-yellow-600">
                              ⭐ {user.rating}
                            </div>
                          </>
                        )}
                        {user.role === 'representative' && (
                          <>
                            <div className="text-gray-600">
                              {user.completedTasks} مهمة
                            </div>
                            <div className="text-yellow-600">
                              ⭐ {user.rating}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                        
                        <select
                          value={user.status}
                          onChange={(e) => handleStatusChange(user.id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-alzad-burgundy"
                        >
                          <option value="active">نشط</option>
                          <option value="inactive">غير نشط</option>
                          <option value="suspended">موقوف</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserManagement

