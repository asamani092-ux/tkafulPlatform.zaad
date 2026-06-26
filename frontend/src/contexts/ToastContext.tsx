import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import Toast from '../components/feedback/Toast';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastData[];
  success: (data: Omit<ToastData, 'id' | 'type'>) => void;
  error: (data: Omit<ToastData, 'id' | 'type'>) => void;
  info: (data: Omit<ToastData, 'id' | 'type'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((data: Omit<ToastData, 'id' | 'type'>) => {
    addToast({ ...data, type: 'success' });
  }, [addToast]);

  const error = useCallback((data: Omit<ToastData, 'id' | 'type'>) => {
    addToast({ ...data, type: 'error' });
  }, [addToast]);

  const info = useCallback((data: Omit<ToastData, 'id' | 'type'>) => {
    addToast({ ...data, type: 'info' });
  }, [addToast]);

  const value: ToastContextType = {
    toasts,
    success,
    error,
    info,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-40 space-y-2" dir="rtl">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
