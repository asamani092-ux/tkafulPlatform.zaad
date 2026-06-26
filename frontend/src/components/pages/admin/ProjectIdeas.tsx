import { useState, useEffect } from 'react';
import AdminLayout from "../../layout/AdminLayout";
import { FiSearch } from "react-icons/fi";
import { Lightbulb, Mail, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { API_BASE_URL } from "../../../config";

interface Suggestion {
  id: number;
  title: string;
  description: string;
  submitted_by: string;
  created_at: string;
  is_reviewed: boolean;
}

export default function ProjectIdeas() {
  const { access } = useAuth();
  const { success, error } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/suggestions/`, {
        headers: {
          'Authorization': `Bearer ${access}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Show unreviewed suggestions first
        const sortedData = data.sort((a: Suggestion, b: Suggestion) => {
          if (a.is_reviewed === b.is_reviewed) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.is_reviewed ? 1 : -1;
        });
        setSuggestions(sortedData);
      } else {
        error({
          title: "خطأ",
          description: "فشل في تحميل الاقتراحات",
          duration: 3000
        });
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      error({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الاقتراحات",
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      // Mark as reviewed
      const response = await fetch(`${API_BASE_URL}/api/suggestions/${id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_reviewed: true })
      });

      if (response.ok) {
        success({
          title: "تم القبول",
          description: "تم قبول الاقتراح بنجاح. يمكنك الآن إنشاء مشروع جديد بناءً عليه.",
          duration: 4000
        });
        // Update the suggestion in the list
        setSuggestions(prev => prev.map(s =>
          s.id === id ? { ...s, is_reviewed: true } : s
        ));
      } else {
        error({
          title: "خطأ",
          description: "فشل في قبول الاقتراح",
          duration: 3000
        });
      }
    } catch (err) {
      console.error('Error accepting suggestion:', err);
      error({
        title: "خطأ",
        description: "حدث خطأ أثناء قبول الاقتراح",
        duration: 3000
      });
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/suggestions/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access}`
        }
      });

      if (response.ok) {
        success({
          title: "تم الرفض",
          description: "تم رفض الاقتراح وحذفه.",
          duration: 3000
        });
        // Remove from list
        setSuggestions(prev => prev.filter(s => s.id !== id));
      } else {
        error({
          title: "خطأ",
          description: "فشل في رفض الاقتراح",
          duration: 3000
        });
      }
    } catch (err) {
      console.error('Error rejecting suggestion:', err);
      error({
        title: "خطأ",
        description: "حدث خطأ أثناء رفض الاقتراح",
        duration: 3000
      });
    }
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.submitted_by.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">أفكار المشاريع</h1>
            <p className="text-gray-600 mt-1">
              مراجعة الاقتراحات المقدمة من المتطوعين والمهتمين
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
              {suggestions.filter(s => !s.is_reviewed).length} اقتراح جديد
            </div>
            <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">
              {suggestions.length} إجمالي
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ابحث عن اقتراح..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Suggestions List */}
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Lightbulb className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 text-lg">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد اقتراحات حتى الآن'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`bg-white rounded-xl shadow-sm border ${
                  suggestion.is_reviewed ? 'border-gray-200 opacity-75' : 'border-brand-200'
                } p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Lightbulb
                        className={suggestion.is_reviewed ? "text-gray-400" : "text-brand-600"}
                        size={24}
                      />
                      <h3 className="text-xl font-bold text-gray-900">
                        {suggestion.title}
                      </h3>
                      {suggestion.is_reviewed && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          تمت المراجعة
                        </span>
                      )}
                    </div>

                    <p className="text-gray-700 leading-relaxed mb-4">
                      {suggestion.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail size={16} />
                        <span>{suggestion.submitted_by}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>{formatDate(suggestion.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {!suggestion.is_reviewed && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(suggestion.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title="قبول الاقتراح"
                      >
                        <CheckCircle size={18} />
                        <span className="hidden sm:inline">قبول</span>
                      </button>
                      <button
                        onClick={() => handleReject(suggestion.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="رفض الاقتراح"
                      >
                        <XCircle size={18} />
                        <span className="hidden sm:inline">رفض</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
