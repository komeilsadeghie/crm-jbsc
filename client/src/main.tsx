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
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes - reduced for better responsiveness
      cacheTime: 5 * 60 * 1000, // 5 minutes - reduced cache time
      refetchOnMount: false, // Don't refetch on mount if data is fresh
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
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

