import { useToast } from '../contexts/ToastContext';

/**
 * Standardized error handling utility
 * Provides consistent error messages and handling across the application
 */
export const useErrorHandler = () => {
  const { error: showErrorToast } = useToast();

  const showError = (message: string, details?: string) => {
    // FIX: Standardize error handling with consistent toast messages
    showErrorToast({
      title: message,
      description: details,
      duration: 5000
    });
  };

  const handleApiError = (error: unknown, defaultMessage: string = 'حدث خطأ غير متوقع') => {
    console.error('API Error:', error);
    
    // FIX: Handle different types of errors consistently
    if (error instanceof Error) {
      showError(defaultMessage, error.message);
    } else if (typeof error === 'string') {
      showError(error);
    } else {
      showError(defaultMessage);
    }
  };

  const handleValidationError = (field: string, message: string) => {
    // FIX: Standardize validation error messages
    showError(`خطأ في ${field}`, message);
  };

  const handleNetworkError = () => {
    // FIX: Standardize network error messages
    showError('خطأ في الاتصال', 'يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى');
  };

  return {
    showError,
    handleApiError,
    handleValidationError,
    handleNetworkError
  };
};
