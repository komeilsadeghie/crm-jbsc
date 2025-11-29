import { useEffect } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';

/**
 * Component to update document title and favicon based on settings
 */
export const SettingsProvider = () => {
  const { data: settings } = useQuery('settings', async () => {
    const response = await api.get('/settings');
    return response.data || {};
  }, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  useEffect(() => {
    // Update document title
    const companyName = settings?.company_name || 'CRM هوشمند';
    document.title = `${companyName} - مدیریت مشتریان و کوچینگ`;

    // Update favicon
    const faviconPath = settings?.logo_favicon;
    if (faviconPath) {
      const faviconUrl = faviconPath.startsWith('http') 
        ? faviconPath 
        : `http://localhost:3001${faviconPath}`;
      
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel*="icon"]');
      existingLinks.forEach((link) => link.remove());

      // Add new favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  }, [settings]);

  return null; // This component doesn't render anything
};

