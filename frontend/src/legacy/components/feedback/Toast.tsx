import { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ 
  id, 
  type, 
  title, 
  description, 
  duration = 4500, 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 200); // Match animation duration
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={20} className="text-green-600" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-600" />;
      case 'info':
        return <Info size={20} className="text-blue-600" />;
      default:
        return <Info size={20} className="text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-blue-800';
    }
  };

  return (
    <div
      className={`relative max-w-sm w-full transform transition-all duration-200 ease-out ${
        isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }`}
      dir="rtl"
    >
      <div className={`rounded-2xl border p-4 shadow-lg ${getBackgroundColor()}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${getTextColor()}`}>
              {title}
            </h4>
            {description && (
              <p className={`text-sm mt-1 ${getTextColor()} opacity-90`}>
                {description}
              </p>
            )}
          </div>
          
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors duration-200"
            aria-label="إغلاق"
          >
            <X size={16} className={getTextColor()} />
          </button>
        </div>
      </div>
    </div>
  );
}
