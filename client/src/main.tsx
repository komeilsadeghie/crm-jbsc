import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // ✅ تغییر: true - با بازگشت به تب، داده‌ها refresh می‌شوند
      staleTime: 30 * 1000, // ✅ تغییر: 30 ثانیه (به جای 2 دقیقه) - برای به‌روزرسانی سریع‌تر
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: true, // ✅ تغییر: true - با بازگشت به صفحه، داده‌ها refresh می‌شوند
      refetchOnReconnect: true, // Refetch when network reconnects
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      retry: 0, // Don't retry mutations
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

