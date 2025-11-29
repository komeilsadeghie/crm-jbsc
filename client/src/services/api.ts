import axios from 'axios';

// Determine base URL based on environment
const getBaseURL = () => {
  // If VITE_API_URL is set, use it
  if (import.meta.env?.VITE_API_URL) {
    const raw = String(import.meta.env.VITE_API_URL).trim();

    // If provided, ensure it ends with /api (most backends here are under /api)
    // Examples normalized:
    // - http://localhost:3001      -> http://localhost:3001/api
    // - http://localhost:3001/     -> http://localhost:3001/api
    // - http://localhost:3001/api  -> http://localhost:3001/api
    // - /api                       -> /api
    const hasProtocol = /^https?:\/\//i.test(raw);
    const cleaned = raw.replace(/\/+$/g, ''); // remove trailing slashes
    if (cleaned.endsWith('/api')) {
      return cleaned;
    }
    // If it's a relative path like '/api', return as is; otherwise append '/api'
    if (!hasProtocol && cleaned === '/api') {
      return cleaned;
    }
    return `${cleaned}/api`;
  }
  
  // Always use proxy for Vite dev server (port 3000)
  // Proxy is configured in vite.config.ts to forward /api to http://localhost:3001
  return '/api';
};

const resolvedBaseURL = getBaseURL();
// Helpful for debugging base URL issues in dev tools console
if (import.meta.env?.MODE !== 'production') {
  // eslint-disable-next-line no-console
  console.info('[API] Base URL:', resolvedBaseURL);
}

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and network issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;



