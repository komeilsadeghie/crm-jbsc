import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: { label: string; onClick: () => void }) => void;
  showSuccess: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => void;
  showError: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => void;
  showWarning: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => void;
  showInfo: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    setProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000, action?: { label: string; onClick: () => void }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration, action };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      // Progress bar animation
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress((prev) => ({ ...prev, [id]: remaining }));
        
        if (remaining <= 0) {
          clearInterval(interval);
          removeToast(id);
        }
      }, 50);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast(message, 'success', duration, action);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast(message, 'error', duration, action);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast(message, 'warning', duration, action);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number, action?: { label: string; onClick: () => void }) => {
    showToast(message, 'info', duration, action);
  }, [showToast]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-600 dark:text-green-400" size={20} />;
      case 'error':
        return <XCircle className="text-red-600 dark:text-red-400" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={20} />;
      case 'info':
        return <Info className="text-blue-600 dark:text-blue-400" size={20} />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };
  
  const getProgressColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-600 dark:bg-green-500';
      case 'error':
        return 'bg-red-600 dark:bg-red-500';
      case 'warning':
        return 'bg-yellow-600 dark:bg-yellow-500';
      case 'info':
        return 'bg-blue-600 dark:bg-blue-500';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              min-w-[300px] max-w-[500px]
              border rounded-lg shadow-lg
              overflow-hidden
              animate-slide-in
              ${getToastStyles(toast.type)}
            `}
          >
            <div className="p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getToastIcon(toast.type)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium mb-2">
                  {toast.message}
                </div>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className="text-xs font-semibold underline hover:no-underline transition-all"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {toast.duration && toast.duration > 0 && (
              <div className="h-1 bg-black/10 dark:bg-white/10">
                <div
                  className={`h-full ${getProgressColor(toast.type)} transition-all duration-50 ease-linear`}
                  style={{ width: `${progress[toast.id] || 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

