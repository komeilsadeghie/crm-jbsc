import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error }: { error: Error | null }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-danger-600 dark:text-danger-400" />
        </div>
        <h2 className="heading-2 text-neutral-900 dark:text-neutral-100 mb-2">
          خطا در نمایش صفحه
        </h2>
        <p className="body-regular text-neutral-600 dark:text-neutral-400 mb-6">
          متأسفانه مشکلی در نمایش صفحه رخ داده است.
        </p>
        {error && (
          <details className="mb-6 text-right">
            <summary className="cursor-pointer text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2">
              جزئیات خطا
            </summary>
            <div className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-700 rounded text-xs font-mono text-neutral-700 dark:text-neutral-300 text-left overflow-auto">
              {error.message}
            </div>
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw size={18} />
            بارگذاری مجدد
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Home size={18} />
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
