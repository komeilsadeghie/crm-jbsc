import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserRole, translateRole } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import api from '../services/api';
import { ROUTE_PERMISSIONS } from '../utils/permissions';
import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserPlus,
  Briefcase,
  Image,
  CalendarDays,
  PhoneCall,
  UserCircle2,
  FileText,
  Receipt,
  CheckSquare,
  FileSignature,
  HelpCircle,
  FolderOpen,
  Receipt as ReceiptIcon,
  BookOpen,
  Mail,
  Settings as SettingsIcon,
  FileCheck,
  CreditCard,
  ClipboardList,
  Activity,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Header from './Header';


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch settings for logo and company name (public endpoint - works for all users)
  const { data: settings } = useQuery('settings', async () => {
    const response = await api.get('/settings');
    return response.data || {};
  }, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const companyName = settings?.company_name || 'CRM هوشمند';
  const mainLogo = settings?.logo_main;
  const textLogo = settings?.logo_text;

  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return null;
    return logoPath.startsWith('http') ? logoPath : `http://localhost:3001${logoPath}`;
  };

  const menuItems = useMemo(
    () => {
      if (!user) {
        return [];
      }
      
      return [
        { path: '/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
        { path: '/leads', icon: UserPlus, label: 'سرنخ‌ها' },
        { path: '/deals', icon: Briefcase, label: 'معاملات' },
        { path: '/customers', icon: Users, label: 'مشتریان' },
        { path: '/estimates', icon: Receipt, label: 'پیش‌فاکتورها' },
        { path: '/proposals', icon: FileCheck, label: 'پروپوزال‌ها' },
        { path: '/tasks', icon: CheckSquare, label: 'وظایف' },
        { path: '/contracts', icon: FileSignature, label: 'قراردادها' },
        { path: '/tickets', icon: HelpCircle, label: 'تیکت‌ها' },
        { path: '/projects', icon: FolderOpen, label: 'پروژه‌ها' },
        { path: '/expenses', icon: ReceiptIcon, label: 'هزینه‌ها' },
        { path: '/knowledge-base', icon: BookOpen, label: 'پایگاه دانش' },
        { path: '/email-templates', icon: Mail, label: 'قالب‌های ایمیل' },
        { path: '/calendar', icon: CalendarDays, label: 'تقویم' },
        { path: '/media', icon: Image, label: 'مدیا' },
        { path: '/coaching', icon: Target, label: 'کوچینگ' },
        { path: '/voip/monitoring', icon: PhoneCall, label: 'مانیتورینگ VOIP' },
        { path: '/reports', icon: BarChart3, label: 'گزارش‌گیری' },
        { path: '/payment-gateways', icon: CreditCard, label: 'درگاه‌های پرداخت' },
        { path: '/surveys', icon: ClipboardList, label: 'نظرسنجی‌ها' },
        { path: '/activity-log', icon: Activity, label: 'لاگ فعالیت‌ها' },
        { path: '/import-export', icon: FileText, label: 'ورود/خروج دیتا' },
        { path: '/settings', icon: SettingsIcon, label: 'تنظیمات' },
        { path: '/profile', icon: UserCircle2, label: 'پروفایل' },
      ].filter((item) => {
        // Profile همیشه باید نمایش داده شود برای همه کاربران
        if (item.path === '/profile') {
          return true;
        }
        
        // Admin همیشه همه چیز را می‌بیند
        if (user.role === 'admin') {
          return true;
        }
        
        // بررسی دسترسی بر اساس نقش
        const allowedRoles = ROUTE_PERMISSIONS[item.path] || [];
        
        // اگر route در ROUTE_PERMISSIONS تعریف نشده باشد، فقط admin می‌تواند ببیند
        if (allowedRoles.length === 0) {
          return false;
        }
        
        // بررسی اینکه آیا نقش کاربر در لیست مجاز است
        return allowedRoles.includes(user.role);
      });
    },
    [user],
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <Header />

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-white shadow-medium p-4 flex items-center justify-between border-b border-neutral-200">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-neutral-700 hover:text-neutral-900 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex items-center gap-2">
          {mainLogo && getLogoUrl(mainLogo) ? (
            <img 
              src={getLogoUrl(mainLogo)!} 
              alt={companyName} 
              className="h-8 w-auto object-contain"
            />
          ) : textLogo && getLogoUrl(textLogo) ? (
            <img 
              src={getLogoUrl(textLogo)!} 
              alt={companyName} 
              className="h-8 w-auto object-contain"
            />
          ) : null}
          <h1 className="text-xl font-bold text-primary-600">{companyName}</h1>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-medium border-r border-neutral-200 transition-all duration-300`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mainLogo && getLogoUrl(mainLogo) ? (
                    <img 
                      src={getLogoUrl(mainLogo)!} 
                      alt={companyName} 
                      className="h-10 w-auto object-contain"
                    />
                  ) : textLogo && getLogoUrl(textLogo) ? (
                    <img 
                      src={getLogoUrl(textLogo)!} 
                      alt={companyName} 
                      className="h-10 w-auto object-contain"
                    />
                  ) : null}
                  <h2 className="text-2xl font-bold text-primary-600 hidden lg:block">{companyName}</h2>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-semibold border-r-2 border-primary-600'
                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-neutral-200">
              <div className="mb-4 px-4 py-2">
                <p className="font-medium text-neutral-800">{user?.fullName || user?.username}</p>
                <p className="text-sm text-neutral-500">{user ? translateRole(user.role) : ''}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-danger-600 hover:bg-danger-50 transition-colors font-medium"
              >
                <LogOut size={20} />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:mr-64 pt-32 lg:pt-16 bg-neutral-50 text-neutral-900 min-h-screen">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;


