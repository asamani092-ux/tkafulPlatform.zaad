import { useState } from 'react';
import AdminLayout from "../../layout/AdminLayout";
import { FileText, Calendar, Save, X } from 'lucide-react';
import Button from '../../ui/Button';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../config";

// إصلاح أيقونة Marker الافتراضية
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// مكون للتعامل مع النقرات على الخريطة
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AddProject() {
  const { access } = useAuth();
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    projectDocument: null as File | null,
    projectDescription: '',
    targetAudience: '',
    beneficiaries: '',
    executionLocation: '',
    donationAmount: '',
    startDate: '',
    endDate: '',
    implementationRequirements: '',
    projectGoals: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mapPosition, setMapPosition] = useState<[number, number]>([24.7136, 46.6753]); // الرياض كموقع افتراضي
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projectTypeOptions = [
    { value: 'أساسي', label: 'أساسي' },
    { value: 'مجتمعي', label: 'مجتمعي' },
    { value: 'مؤسسي', label: 'مؤسسي' },
  ];

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('projectDocument', file);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setMapPosition([lat, lng]);
    // يمكن إضافة reverse geocoding هنا للحصول على العنوان من الإحداثيات
    handleInputChange('executionLocation', `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectName.trim()) {
      newErrors.projectName = 'اسم المشروع مطلوب';
    }
    if (!formData.projectType) {
      newErrors.projectType = 'نوع المشروع مطلوب';
    }
    if (!formData.projectDescription.trim()) {
      newErrors.projectDescription = 'وصف المشروع مطلوب';
    }
    if (!formData.targetAudience.trim()) {
      newErrors.targetAudience = 'الفئة المستهدفة مطلوبة';
    }
    if (!formData.beneficiaries || parseInt(formData.beneficiaries) <= 0) {
      newErrors.beneficiaries = 'عدد المستفيدين مطلوب';
    }
    if (!formData.executionLocation.trim()) {
      newErrors.executionLocation = 'موقع تنفيذ المشروع مطلوب';
    }
    if (!formData.donationAmount || parseFloat(formData.donationAmount) <= 0) {
      newErrors.donationAmount = 'مبلغ التبرع مطلوب';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'تاريخ بداية المشروع مطلوب';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'تاريخ الانتهاء المتوقع مطلوب';
    }
    if (!formData.implementationRequirements.trim()) {
      newErrors.implementationRequirements = 'متطلبات التنفيذ مطلوبة';
    }
    if (!formData.projectGoals.trim()) {
      newErrors.projectGoals = 'أهداف المشروع مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const apiFormData = new FormData();
      
      // Map frontend fields to backend fields
      apiFormData.append('title', formData.projectName);
      apiFormData.append('category', formData.projectType);
      apiFormData.append('desc', formData.projectDescription);
      apiFormData.append('target_audience', formData.targetAudience);
      apiFormData.append('beneficiaries', formData.beneficiaries);
      apiFormData.append('location', formData.executionLocation);
      apiFormData.append('donation_amount', formData.donationAmount);
      apiFormData.append('start_date', formData.startDate);
      apiFormData.append('end_date', formData.endDate);
      apiFormData.append('implementation_requirements', formData.implementationRequirements);
      apiFormData.append('project_goals', formData.projectGoals);
      
      // Add file if exists
      if (formData.projectDocument) {
        apiFormData.append('document', formData.projectDocument);
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/projects/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access}`
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: apiFormData
      });

      if (response.ok) {
        alert('تم إضافة المشروع بنجاح!');
        
        // إعادة تعيين النموذج
        setFormData({
          projectName: '',
          projectType: '',
          projectDocument: null,
          projectDescription: '',
          targetAudience: '',
          beneficiaries: '',
          executionLocation: '',
          donationAmount: '',
          startDate: '',
          endDate: '',
          implementationRequirements: '',
          projectGoals: '',
        });
        setSelectedLocation(null);
        setErrors({});
      } else {
        const errorData = await response.json();
        console.error('Error creating project:', errorData);
        alert('حدث خطأ أثناء إضافة المشروع. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      console.error('Error submitting project:', error);
      alert('حدث خطأ أثناء إضافة المشروع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      projectName: '',
      projectType: '',
      projectDocument: null,
      projectDescription: '',
      targetAudience: '',
      beneficiaries: '',
      executionLocation: '',
      donationAmount: '',
      startDate: '',
      endDate: '',
      implementationRequirements: '',
      projectGoals: '',
    });
    setSelectedLocation(null);
    setErrors({});
  };

  return (
    <AdminLayout>
      <div className="h-full w-full overflow-x-hidden">
        {/* Title Banner */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#f3e3e3] rounded-[19px] px-4 sm:px-8 py-4 border border-[#e0cfd4] shadow-[0px_3px_25px_#8d2e4673] w-full max-w-md">
            <h1 className="text-3xl font-bold text-[#2e2b2c] text-center font-[Cairo]">بيانات اضافة مشروع</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-[#f3e3e3] rounded-[19px] p-4 sm:p-6 border border-[#e0cfd4] shadow-[0px_3px_25px_#8d2e4673]">
            {/* Header */}
            <div className="text-right mb-6 relative">
              <h2 className="text-2xl font-bold text-[#2e2b2c] mb-2 font-[Cairo]">المعلومات الاساسية</h2>
              <div className="h-[2px] bg-[#e0cfd4] opacity-80 ml-auto" style={{ width: '60%' }}></div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* اسم المشروع */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  اسم المشروع
                </label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  placeholder="أدخل اسم المشروع"
                  className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] text-right"
                />
                {errors.projectName && <p className="mt-1 text-sm text-red-600">{errors.projectName}</p>}
              </div>

              {/* نوع المشروع */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  نوع المشروع
                </label>
                <div className="relative">
                  <select
                    value={formData.projectType}
                    onChange={(e) => handleInputChange('projectType', e.target.value)}
                    className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] appearance-none pr-10 text-right"
                  >
                    <option value="">اختر نوع المشروع</option>
                    {projectTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-[#8d2e46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.projectType && <p className="mt-1 text-sm text-red-600">{errors.projectType}</p>}
              </div>

              {/* اضافة وثيقة المشروع */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  اضافة وثيقة المشروع
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl border border-[#8d2e46] hover:border-[#6B1E2A] transition-colors">
                    <FileText size={24} className="text-[#8d2e46]" />
                  </div>
                  <span className="text-gray-700 text-sm font-medium">رفع</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                  />
                </label>
                {formData.projectDocument && (
                  <p className="mt-2 text-sm text-gray-600">{formData.projectDocument.name}</p>
                )}
              </div>

              {/* وصف المشروع */}
              <div className="bg-white/60 rounded-2xl px-6 py-4 md:col-span-2 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  وصف المشروع
                </label>
                <textarea
                  value={formData.projectDescription}
                  onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                  placeholder="أدخل وصف المشروع"
                  rows={4}
                  className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] resize-none text-right"
                />
                {errors.projectDescription && <p className="mt-1 text-sm text-red-600">{errors.projectDescription}</p>}
              </div>
            </div>
          </div>

          {/* Planning Details Section */}
          <div className="bg-[#f3e3e3] rounded-[19px] p-4 sm:p-6 border border-[#e0cfd4] shadow-[0px_3px_25px_#8d2e4673]">
            {/* Header */}
            <div className="text-right mb-6 relative">
              <h2 className="text-2xl font-bold text-[#2e2b2c] mb-2 font-[Cairo]">تفاصيل التخطيط</h2>
              <div className="h-[2px] bg-[#e0cfd4] opacity-80 ml-auto" style={{ width: '60%' }}></div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* الفئة المستهدفة */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  الفئة المستهدفة
                </label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                  placeholder="أدخل الفئة المستهدفة"
                  className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] text-right"
                />
                {errors.targetAudience && <p className="mt-1 text-sm text-red-600">{errors.targetAudience}</p>}
              </div>

              {/* عدد المستفيدين */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  عدد المستفيدين
                </label>
                <input
                  type="number"
                  value={formData.beneficiaries}
                  onChange={(e) => handleInputChange('beneficiaries', e.target.value)}
                  placeholder="أدخل عدد المستفيدين"
                  min={1}
                  className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] text-right"
                />
                {errors.beneficiaries && <p className="mt-1 text-sm text-red-600">{errors.beneficiaries}</p>}
              </div>

              {/* موقع تنفيذ المشروع */}
              <div className="bg-white/60 rounded-2xl px-6 py-4 md:col-span-2 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  موقع تنفيذ المشروع
                </label>
                <div className="w-full h-64 rounded-xl border border-[#8d2e46] overflow-hidden mb-2" style={{ zIndex: 0 }}>
                  <MapContainer
                    center={mapPosition}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapClick} />
                    {selectedLocation && (
                      <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
                    )}
                  </MapContainer>
                </div>
                <p className="text-xs text-gray-600 mb-2">انقر على الخريطة لتحديد موقع تنفيذ المشروع</p>
                <input
                  type="text"
                  value={formData.executionLocation}
                  onChange={(e) => handleInputChange('executionLocation', e.target.value)}
                  placeholder="أدخل موقع تنفيذ المشروع أو انقر على الخريطة"
                  className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] text-right"
                />
                {errors.executionLocation && <p className="mt-1 text-sm text-red-600">{errors.executionLocation}</p>}
              </div>

              {/* مبلغ التبرع للمشروع */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  مبلغ التبرع للمشروع
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.donationAmount}
                    onChange={(e) => handleInputChange('donationAmount', e.target.value)}
                    placeholder="0"
                    min={0}
                    step="0.01"
                    className="flex-1 bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] text-right"
                  />
                  <span className="text-gray-700 text-base font-medium">ريال</span>
                </div>
                {errors.donationAmount && <p className="mt-1 text-sm text-red-600">{errors.donationAmount}</p>}
              </div>

              {/* تاريخ بداية المشروع */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  تاريخ بداية المشروع
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 pr-10 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] text-right"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8d2e46] w-5 h-5 pointer-events-none" />
                </div>
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              {/* تاريخ الانتهاء المتوقع */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  تاريخ الانتهاء المتوقع
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 pr-10 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] text-right"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8d2e46] w-5 h-5 pointer-events-none" />
                </div>
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>
            </div>
          </div>

          {/* Additional Details Section */}
          <div className="bg-[#f3e3e3] rounded-[19px] p-4 sm:p-6 border border-[#e0cfd4] shadow-[0px_3px_25px_#8d2e4673]">
            {/* Header */}
            <div className="text-right mb-6 relative">
              <h2 className="text-2xl font-bold text-[#2e2b2c] mb-2 font-[Cairo]">تفاصيل اضافية</h2>
              <div className="h-[2px] bg-[#e0cfd4] opacity-80 ml-auto" style={{ width: '60%' }}></div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* متطلبات التنفيذ */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  متطلبات التنفيد
                </label>
                <textarea
                  value={formData.implementationRequirements}
                  onChange={(e) => handleInputChange('implementationRequirements', e.target.value)}
                  placeholder="أدخل متطلبات التنفيذ"
                  rows={4}
                  className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] resize-none text-right"
                />
                {errors.implementationRequirements && <p className="mt-1 text-sm text-red-600">{errors.implementationRequirements}</p>}
              </div>

              {/* اهداف المشروع */}
              <div className="bg-white/60 rounded-[18px] px-6 py-4 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">
                  اهداف المشروع
                </label>
                <textarea
                  value={formData.projectGoals}
                  onChange={(e) => handleInputChange('projectGoals', e.target.value)}
                  placeholder="أدخل أهداف المشروع"
                  rows={4}
                  className="w-full bg-white rounded-xl border border-[#8d2e46] px-4 py-2.5 text-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-[#8d2e46] focus:border-[#8d2e46] resize-none text-right"
                />
                {errors.projectGoals && <p className="mt-1 text-sm text-red-600">{errors.projectGoals}</p>}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#8D2E46] hover:bg-[#6B1E2A] text-white px-8 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ المشروع'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleReset}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#fdf8f9] hover:bg-gray-50 text-[#8D2E46] border border-[#e0cfd4] px-8 py-3 rounded-[999px] flex items-center justify-center gap-2 font-[Cairo] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={20} />
              الغاء
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
