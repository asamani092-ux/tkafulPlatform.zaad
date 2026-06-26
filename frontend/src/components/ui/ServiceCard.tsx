import { Users, CalendarDays, MapPin, HandHeart, Package } from 'lucide-react';
import type { Service } from '../../types';
import Icon from './Icon';
import Badge from './Badge';

interface ServiceCardProps {
  service: Service;
  onDetails: (service: Service) => void;
  onRequestService: (service: Service) => void;
  onVolunteer: (service: Service) => void;
}

export default function ServiceCard({ service, onDetails, onRequestService, onVolunteer }: ServiceCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'متاحة':
        return 'success';
      case 'قادمة':
        return 'info';
      case 'مكتملة':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="group rounded-2xl border bg-white shadow-soft p-5 relative overflow-hidden transition-all duration-300 motion-safe:hover:-translate-y-1 hover:shadow-lg">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(service.status)}>
            {service.status}
          </Badge>
          {service.category && (
            <Badge variant="default" className="text-xs">
              {service.category}
            </Badge>
          )}
        </div>

        {service.icon && (
          <Icon
            name={service.icon}
            size={24}
            className="text-[#DFC775] flex-shrink-0"
          />
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {service.title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        {service.desc}
      </p>

      {/* Meta Footer */}
      {(service.beneficiaries || service.date || service.location) && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-4">
          {service.beneficiaries && (
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>+{service.beneficiaries} مستفيد</span>
            </div>
          )}
          {service.date && (
            <div className="flex items-center gap-1">
              <CalendarDays size={14} />
              <span>{service.date}</span>
            </div>
          )}
          {service.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{service.location}</span>
            </div>
          )}
        </div>
      )}

      {/* Details Button */}
      <button
        onClick={() => onDetails(service)}
        className="w-full border border-brand-600 text-brand-600 hover:bg-brand-50 hover:border-brand-700 hover:text-brand-700 font-medium px-4 py-2 rounded-lg transition-all duration-200 focus-visible:ring-2 ring-brand-600 ring-offset-2 mb-2"
        aria-haspopup="dialog"
      >
        تفاصيل الخدمة
      </button>

      {/* Action Button - Shows based on service type */}
      {service.service_type === 'للمستفيدين' ? (
        // For beneficiary services - show "Request Service" button
        <button
          onClick={() => onRequestService(service)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-[#6F1A28] text-[#6F1A28] bg-white hover:bg-[#6F1A28] hover:text-white px-3 py-2 font-semibold text-sm transition-all duration-200 focus-visible:ring-2 ring-brand-600 ring-offset-2"
        >
          <Package size={16} />
          <span>اطلب الخدمة</span>
        </button>
      ) : (
        // For volunteer services - show "Volunteer to Help" button
        <button
          onClick={() => onVolunteer(service)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-[#DFC775] text-[#DFC775] bg-white hover:bg-[#FFF5D6] px-3 py-2 font-semibold text-sm transition-all duration-200 focus-visible:ring-2 ring-brand-600 ring-offset-2"
        >
          <HandHeart size={16} />
          <span>تطوع للمساعدة</span>
        </button>
      )}
    </div>
  );
}
