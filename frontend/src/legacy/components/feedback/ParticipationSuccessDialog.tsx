import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Icon from '../ui/Icon';

interface ParticipationSuccessDialogProps {
  type: 'project' | 'service';
  isOpen: boolean;
  onClose: () => void;
}

export default function ParticipationSuccessDialog({ 
  type, 
  isOpen, 
  onClose 
}: ParticipationSuccessDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsLeaving(false);
      
      // Auto-close after 30 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
      
      // Navigate to appropriate page
      if (type === 'project') {
        navigate('/projects');
      } else {
        navigate('/services');
      }
    }, 300); // Match animation duration
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !isVisible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      dir="rtl"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      {/* Dialog */}
      <div
        className={`relative bg-white rounded-2xl p-8 mx-4 max-w-md w-full shadow-2xl transform transition-all duration-300 ${
          isLeaving 
            ? 'scale-95 opacity-0' 
            : 'scale-100 opacity-100'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
        aria-describedby="success-description"
      >
        {/* Success Icon with Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-green-100 rounded-full p-3">
              <Icon 
                name="CheckCircle2" 
                size={48} 
                className="text-green-600 animate-bounce"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 
            id="success-title"
            className="text-2xl font-bold text-gray-900 mb-3"
          >
            تم إرسال طلبك بنجاح
          </h2>
          
          <p 
            id="success-description"
            className="text-gray-600 leading-relaxed"
          >
            تم استلام طلبك، وعند القبول سيتم إشعارك عبر البريد الإلكتروني.
          </p>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors duration-200 focus-visible:ring-2 ring-brand-600 ring-offset-2"
          >
            موافق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
