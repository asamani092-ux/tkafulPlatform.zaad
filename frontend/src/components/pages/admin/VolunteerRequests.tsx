import { useState, useEffect } from 'react';
import AdminLayout from "../../layout/AdminLayout";
import { FiSearch } from "react-icons/fi";
import { MapPin, Mail, Phone, Star } from 'lucide-react';
import { useAuth } from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../config";

interface VolunteerRequest {
  id: number;
  name: string;
  location: string;
  email: string;
  phone: string;
  qualification: string;
  university: string;
  specialization: string;
  skills: string[];
  volunteer_hours: number;
  rating: number;
}

export default function VolunteerRequests() {
  const { access } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [volunteers, setVolunteers] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch volunteer requests on mount
  useEffect(() => {
    fetchVolunteerRequests();
  }, []);

  const fetchVolunteerRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/volunteer-requests/`, {
        headers: {
          'Authorization': `Bearer ${access}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVolunteers(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching volunteer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/volunteer-requests/${id}/accept/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from list immediately
        setVolunteers(prev => prev.filter(v => v.id !== id));
      }
    } catch (error) {
      console.error('Error accepting volunteer:', error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/volunteer-requests/${id}/reject/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from list immediately
        setVolunteers(prev => prev.filter(v => v.id !== id));
      }
    } catch (error) {
      console.error('Error rejecting volunteer:', error);
    }
  };

  const filteredVolunteers = volunteers.filter(volunteer =>
    volunteer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    volunteer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    volunteer.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {/* Search Bar */}
        <div className="flex justify-start mb-6">
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

        {/* Title Banner */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#f3e3e3] rounded-[19px] px-4 sm:px-8 py-4 border border-[#e0cfd4] shadow-[0px_3px_25px_#8d2e4673] w-full max-w-md">
            <h1 className="text-3xl font-bold text-[#2e2b2c] text-center font-[Cairo]">طلبات التطوع</h1>
          </div>
        </div>

        {/* Volunteer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredVolunteers.map((volunteer) => (
            <div
              key={volunteer.id}
              className="bg-[#f3e3e3] rounded-[18px] p-4 sm:p-6 border border-[#e0cfd4] shadow-[0px_3px_15px_#8d2e4633]"
            >
              {/* Header with Name and Avatar */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl font-bold text-[#8D2E46] border-2 border-white">
                  {volunteer.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold text-[#2e2b2c] flex-1 font-[Cairo]">{volunteer.name}</h3>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin size={16} className="text-gray-600" />
                  <span>{volunteer.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail size={16} className="text-gray-600" />
                  <span className="break-all">{volunteer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={16} className="text-gray-600" />
                  <span>{volunteer.phone}</span>
                </div>
              </div>

              {/* Education and Experience */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">التعليم والخبرة :</h4>
                <div className="bg-white/60 rounded-[14px] p-4 space-y-2 backdrop-blur-sm">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">المؤهل :</span> {volunteer.qualification}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">الجامعة :</span> {volunteer.university}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">التخصص :</span> {volunteer.specialization}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">المهارات :</h4>
                <div className="flex flex-wrap gap-2">
                  {volunteer.skills && volunteer.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full bg-white/80 text-gray-700 text-xs font-medium border border-white/60 backdrop-blur-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Volunteer Hours and Rating */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">الساعات التطوعية</span>
                  <span className="text-sm font-bold text-gray-900">{volunteer.volunteer_hours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold text-gray-900">{volunteer.rating}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAccept(volunteer.id)}
                  className="flex-1 bg-[#8D2E46] hover:bg-[#6B1E2A] text-white font-medium py-2.5 rounded-xl transition-colors duration-200"
                >
                  قبول
                </button>
                <button
                  onClick={() => handleReject(volunteer.id)}
                  className="flex-1 bg-[#fdf8f9] hover:bg-gray-50 text-[#8D2E46] border border-[#e0cfd4] font-medium py-2.5 rounded-[999px] transition-colors duration-200 font-[Cairo]"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredVolunteers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد طلبات تطوع متاحة</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
