import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    // بهینه‌سازی برای production
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // غیرفعال کردن sourcemap برای کاهش حجم
    minify: 'terser', // استفاده از terser برای minify بهتر
    terserOptions: {
      compress: {
        drop_console: true, // حذف console.log ها در production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // تقسیم کد به chunk های کوچکتر
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'recharts'],
          'utils-vendor': ['axios', 'react-query', 'date-fns'],
        },
        // بهینه‌سازی نام فایل‌ها
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // افزایش chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
});



