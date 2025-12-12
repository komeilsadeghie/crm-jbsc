import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmText = 'تأیید',
  cancelText = 'لغو',
  isLoading = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const typeStyles = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-danger-600 dark:text-danger-400',
      bgColor: 'bg-danger-50 dark:bg-danger-900/20',
      borderColor: 'border-danger-200 dark:border-danger-800',
      buttonColor: 'btn-danger',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-warning-600 dark:text-warning-400',
      bgColor: 'bg-warning-50 dark:bg-warning-900/20',
      borderColor: 'border-warning-200 dark:border-warning-800',
      buttonColor: 'btn-warning',
    },
    info: {
      icon: Info,
      iconColor: 'text-info-600 dark:text-info-400',
      bgColor: 'bg-info-50 dark:bg-info-900/20',
      borderColor: 'border-info-200 dark:border-info-800',
      buttonColor: 'btn-info',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-success-600 dark:text-success-400',
      bgColor: 'bg-success-50 dark:bg-success-900/20',
      borderColor: 'border-success-200 dark:border-success-800',
      buttonColor: 'btn-success',
    },
  };

  const style = typeStyles[type];
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border ${style.borderColor} max-w-md w-full animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 ${style.bgColor} border-b ${style.borderColor} rounded-t-xl`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${style.iconColor}`}>
              <Icon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="heading-4 text-neutral-900 dark:text-neutral-100 mb-1">
                {title}
              </h3>
              <p className="body-regular text-neutral-700 dark:text-neutral-300">
                {message}
              </p>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn ${style.buttonColor} flex items-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                در حال پردازش...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

