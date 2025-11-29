import { UserRole } from '../contexts/AuthContext';

// دسترسی‌های هر نقش به بخش‌های مختلف
// همه نقش‌ها: تیکت، پروپوزال، پایگاه دانش، وظایف، پروژه‌های مربوط به خودش، تقویم، پروفایل
// admin: همه چیز + تنظیمات
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // داشبورد - همه نقش‌ها
  '/dashboard': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
  
  // بخش‌های فروش
  '/leads': ['admin', 'sales', 'sales_manager'],
  '/deals': ['admin', 'sales', 'sales_manager'],
  '/customers': ['admin', 'sales', 'sales_manager', 'coach', 'user'],
  '/estimates': ['admin', 'sales', 'sales_manager', 'finance'],
  '/contracts': ['admin', 'sales', 'sales_manager', 'finance'],
  '/expenses': ['admin', 'sales', 'sales_manager', 'finance'],
  '/email-templates': ['admin', 'sales', 'sales_manager'],
  
  // بخش‌های مشترک - همه نقش‌ها دسترسی دارند
  '/tickets': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
  '/proposals': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
  '/knowledge-base': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
  '/tasks': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
  '/projects': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
  '/calendar': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
  
  // بخش‌های کوچینگ
  '/coaching': ['admin', 'coach'],
  
  // بخش‌های مدیا
  '/media': ['admin', 'media', 'media_manager'],
  '/surveys': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager'],
  '/voip/monitoring': ['admin', 'media', 'media_manager', 'sales', 'sales_manager'],
  '/voip/logs': ['admin', 'media', 'media_manager'],
  
  // بخش‌های مالی
  '/payment-gateways': ['admin', 'finance'],
  
  // گزارش‌ها
  '/reports': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'finance'],
  
  // بخش‌های مدیریتی
  '/activity-log': ['admin'],
  '/import-export': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'finance'],
  '/settings': ['admin'], // فقط admin
  
  // پروفایل - همه نقش‌ها دسترسی دارند
  '/profile': ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user'],
};

// بررسی دسترسی کاربر به یک route خاص
export const hasPermission = (route: string, userRole: UserRole): boolean => {
  // Admin همیشه دسترسی دارد
  if (userRole === 'admin') {
    return true;
  }
  
  const allowedRoles = ROUTE_PERMISSIONS[route];
  if (!allowedRoles || allowedRoles.length === 0) {
    // اگر route در لیست تعریف نشده باشد، فقط admin دسترسی دارد
    return false;
  }
  
  return allowedRoles.includes(userRole);
};

// دریافت لیست route‌های مجاز برای یک نقش
export const getAllowedRoutes = (userRole: UserRole): string[] => {
  if (userRole === 'admin') {
    return Object.keys(ROUTE_PERMISSIONS);
  }
  
  return Object.keys(ROUTE_PERMISSIONS).filter(route => 
    ROUTE_PERMISSIONS[route].includes(userRole)
  );
};

