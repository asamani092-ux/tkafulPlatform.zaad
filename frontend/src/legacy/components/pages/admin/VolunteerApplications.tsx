import { useState, useEffect } from 'react';
import AdminLayout from "../../layout/AdminLayout";
import { FiSearch } from "react-icons/fi";
import { MapPin, Mail, Calendar, FileText } from 'lucide-react';
import { useAuth } from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../config";

interface VolunteerApplication {
  id: number;
  volunteer: number;
  volunteer_name: string;
  volunteer_email: string;
  project: number;
  project_title: string;
  status: string;
  message: string;
  admin_notes: string;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
}

export default function VolunteerApplications() {
  const { access } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('قيد المراجعة'); // Default to pending
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Fetch applications on mount and when filter changes
  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API_BASE_URL}/api/admin/applications/?status=${encodeURIComponent(statusFilter)}`
        : `${API_BASE_URL}/api/admin/applications/`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${access}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    if (processingId) return; // Prevent double-click

    setProcessingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/applications/${id}/accept/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from list or refetch
        await fetchApplications();
      } else {
        const error = await response.json();
        alert(error.error || 'فشل في قبول الطلب');
      }
    } catch (error) {
      console.error('Error accepting application:', error);
      alert('حدث خطأ أثناء قبول الطلب');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (processingId) return; // Prevent double-click

    setProcessingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/applications/${id}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from list or refetch
        await fetchApplications();
      } else {
        const error = await response.json();
        alert(error.error || 'فشل في رفض الطلب');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('حدث خطأ أثناء رفض الطلب');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApplications = applications.filter(app =>
    app.volunteer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.volunteer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.project_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      'قيد المراجعة': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'مقبول': 'bg-green-100 text-green-800 border-green-200',
      'مرفوض': 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-500 font-[Cairo]">جاري التحميل...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full w-full overflow-x-hidden">
        {/* Search Bar and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          {/* Search */}
          <div className="flex justify-start">
            <div className="relative w-full max-w-sm h-[42px]">
              <div className="absolute inset-0 bg-[#faf6f76b] rounded-[20px] shadow-[inset_0px_0px_8px_#f3e3e3e0,0px_4px_15px_#8d2e4682]" />
              <input
                type="text"
                placeholder="البحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="absolute inset-0 w-full h-full bg-transparent border-none outline-none pr-10 pl-3 text-[15px] text-[#4e4a4b] [direction:rtl] font-[Cairo]"
              />
              <div className="absolute top-1/2 -translate-y-1/2 right-[10px]">
                <FiSearch className="w-[16px] h-[16px] text-[#4e4a4b]" />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('قيد المراجعة')}
              className={`px-4 py-2 rounded-xl font-[Cairo] transition-colors ${
                statusFilter === 'قيد المراجعة'
                  ? 'bg-[#8D2E46] text-white'
                  : 'bg-[#f3e3e3] text-gray-700 hover:bg-[#e0cfd4]'
              }`}
            >
              قيد المراجعة
            </button>
            <button
              onClick={() => setStatusFilter('مقبول')}
              className={`px-4 py-2 rounded-xl font-[Cairo] transition-colors ${
                statusFilter === 'مقبول'
                  ? 'bg-[#8D2E46] text-white'
                  : 'bg-[#f3e3e3] text-gray-700 hover:bg-[#e0cfd4]'
              }`}
            >
              مقبول
            </button>
            <button
              onClick={() => setStatusFilter('مرفوض')}
              className={`px-4 py-2 rounded-xl font-[Cairo] transition-colors ${
                statusFilter === 'مرفوض'
                  ? 'bg-[#8D2E46] text-white'
                  : 'bg-[#f3e3e3] text-gray-700 hover:bg-[#e0cfd4]'
              }`}
            >
              مرفوض
            </button>
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-xl font-[Cairo] transition-colors ${
                statusFilter === ''
                  ? 'bg-[#8D2E46] text-white'
                  : 'bg-[#f3e3e3] text-gray-700 hover:bg-[#e0cfd4]'
              }`}
            >
              الكل
            </button>
          </div>
        </div>

        {/* Title Banner */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#f3e3e3] rounded-[19px] px-4 sm:px-8 py-4 border border-[#e0cfd4] shadow-[0px_3px_25px_#8d2e4673] w-full max-w-md">
            <h1 className="text-3xl font-bold text-[#2e2b2c] text-center font-[Cairo]">طلبات الانضمام للمشاريع</h1>
          </div>
        </div>

        {/* Application Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredApplications.map((application) => (
            <div
              key={application.id}
              className="bg-[#f3e3e3] rounded-[18px] p-4 sm:p-6 border border-[#e0cfd4] shadow-[0px_3px_15px_#8d2e4633]"
            >
              {/* Header with Volunteer Name and Status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-xl font-bold text-[#8D2E46] border-2 border-white">
                    {application.volunteer_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#2e2b2c] font-[Cairo]">{application.volunteer_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Mail size={14} />
                      <span>{application.volunteer_email}</span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(application.status)}
              </div>

              {/* Project Information */}
              <div className="mb-4 bg-white/60 rounded-[14px] p-4 backdrop-blur-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  المشروع
                </h4>
                <p className="text-base font-semibold text-[#8D2E46]">{application.project_title}</p>
              </div>

              {/* Application Date */}
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                <Calendar size={16} className="text-gray-600" />
                <span>تاريخ التقديم: {formatDate(application.applied_at)}</span>
              </div>

              {/* Volunteer Message (if exists) */}
              {application.message && (
                <div className="mb-4 bg-white/60 rounded-[14px] p-4 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">رسالة المتطوع:</h4>
                  <p className="text-sm text-gray-700">{application.message}</p>
                </div>
              )}

              {/* Admin Notes (if reviewed) */}
              {application.admin_notes && (
                <div className="mb-4 bg-white/60 rounded-[14px] p-4 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">ملاحظات المشرف:</h4>
                  <p className="text-sm text-gray-700">{application.admin_notes}</p>
                  {application.reviewed_by_name && (
                    <p className="text-xs text-gray-500 mt-2">تمت المراجعة بواسطة: {application.reviewed_by_name}</p>
                  )}
                </div>
              )}

              {/* Action Buttons (only for pending applications) */}
              {application.status === 'قيد المراجعة' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccept(application.id)}
                    disabled={processingId === application.id}
                    className={`flex-1 bg-[#8D2E46] hover:bg-[#6B1E2A] text-white font-medium py-2.5 rounded-xl transition-colors duration-200 ${
                      processingId === application.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {processingId === application.id ? 'جاري القبول...' : 'قبول وإنشاء مهمة'}
                  </button>
                  <button
                    onClick={() => handleReject(application.id)}
                    disabled={processingId === application.id}
                    className={`flex-1 bg-[#fdf8f9] hover:bg-gray-50 text-[#8D2E46] border border-[#e0cfd4] font-medium py-2.5 rounded-[999px] transition-colors duration-200 font-[Cairo] ${
                      processingId === application.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {processingId === application.id ? 'جاري الرفض...' : 'رفض'}
                  </button>
                </div>
              )}

              {/* Reviewed Status */}
              {application.status !== 'قيد المراجعة' && application.reviewed_at && (
                <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-300">
                  تمت المراجعة في: {formatDate(application.reviewed_at)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد طلبات {statusFilter && `"${statusFilter}"`}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
