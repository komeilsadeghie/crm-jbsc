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
  Download,
  FileDown,
  Database,
  MessageSquare,
  Bell,
  Wrench,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Globe,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import Header from './Header';


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

  const menuGroups = useMemo(
    () => {
      if (!user) {
        return [];
      }
      
      const allItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'داشبورد', group: 'main' },
        { path: '/leads', icon: UserPlus, label: 'سرنخ‌ها', group: 'sales' },
        { path: '/deals', icon: Briefcase, label: 'معاملات', group: 'sales' },
        { path: '/customers', icon: Users, label: 'مشتریان', group: 'sales' },
        { path: '/estimates', icon: Receipt, label: 'پیش‌فاکتورها', group: 'sales' },
        { path: '/proposals', icon: FileCheck, label: 'پروپوزال‌ها', group: 'sales' },
        { path: '/tasks', icon: CheckSquare, label: 'وظایف', group: 'project' },
        { path: '/contracts', icon: FileSignature, label: 'قراردادها', group: 'project' },
        { path: '/tickets', icon: HelpCircle, label: 'تیکت‌ها', group: 'project' },
        { path: '/projects', icon: FolderOpen, label: 'پروژه‌ها', group: 'project' },
        { path: '/expenses', icon: ReceiptIcon, label: 'هزینه‌ها', group: 'project' },
        { path: '/knowledge-base', icon: BookOpen, label: 'پایگاه دانش', group: 'content' },
        { path: '/email-templates', icon: Mail, label: 'قالب‌های ایمیل', group: 'content' },
        { path: '/coaching', icon: Target, label: 'کوچینگ', group: 'content' },
        { path: '/voip/monitoring', icon: PhoneCall, label: 'مانیتورینگ VOIP', group: 'tools' },
        { path: '/reports', icon: BarChart3, label: 'گزارش‌گیری', group: 'tools' },
        { path: '/payment-gateways', icon: CreditCard, label: 'درگاه‌های پرداخت', group: 'tools' },
        { path: '/import-export', icon: FileText, label: 'ورود/خروج دیتا', group: 'tools' },
        // Utilities Group
        { path: '/utilities/media', icon: Image, label: 'مدیا', group: 'utilities' },
        { path: '/utilities/bulk-pdf-export', icon: FileDown, label: 'خروجی PDF گروهی', group: 'utilities' },
        { path: '/utilities/e-invoice-export', icon: FileCheck, label: 'خروجی فاکتور الکترونیکی', group: 'utilities' },
        { path: '/utilities/csv-export', icon: Download, label: 'خروجی CSV', group: 'utilities' },
        { path: '/utilities/calendar', icon: CalendarDays, label: 'تقویم', group: 'utilities' },
        { path: '/utilities/announcements', icon: Bell, label: 'اعلانات', group: 'utilities' },
        { path: '/utilities/goals', icon: Target, label: 'اهداف', group: 'utilities' },
        { path: '/utilities/activity-log', icon: Activity, label: 'لاگ فعالیت‌ها', group: 'utilities' },
        { path: '/utilities/surveys', icon: ClipboardList, label: 'نظرسنجی‌ها', group: 'utilities' },
        { path: '/utilities/database-backup', icon: Database, label: 'پشتیبان‌گیری دیتابیس', group: 'utilities' },
        { path: '/utilities/ticket-pipe-log', icon: MessageSquare, label: 'لاگ تیکت Pipe', group: 'utilities' },
        { path: '/settings', icon: SettingsIcon, label: 'تنظیمات', group: 'settings' },
      ];
      
      const filtered = allItems.filter((item) => {
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
      
      // گروه‌بندی منوها
      const groups: Record<string, typeof filtered> = {
        main: [],
        sales: [],
        project: [],
        content: [],
        tools: [],
        utilities: [],
        settings: [],
      };
      
      filtered.forEach(item => {
        if (groups[item.group]) {
          groups[item.group].push(item);
        }
      });
      
      return {
        main: groups.main,
        sales: groups.sales,
        project: groups.project,
        content: groups.content,
        tools: groups.tools,
        utilities: groups.utilities,
        settings: groups.settings,
      };
    },
    [user],
  );
  
  const groupLabels: Record<string, string> = {
    main: '',
    sales: 'فروش و بازاریابی',
    project: 'مدیریت پروژه',
    content: 'محتوا و مدیا',
    tools: 'ابزارها',
    utilities: 'ابزارهای کمکی',
    settings: 'تنظیمات',
  };

  // Auto-expand group if current route belongs to it
  useEffect(() => {
    const currentGroup = Object.entries(menuGroups).find(([_, items]) =>
      items.some(item => item.path === location.pathname)
    )?.[0];
    
    if (currentGroup && currentGroup !== 'main') {
      setExpandedGroups(prev => ({
        ...prev,
        [currentGroup]: true,
      }));
    }
  }, [location.pathname, menuGroups]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Header */}
      <Header />

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-white dark:bg-neutral-900 shadow-medium p-3 sm:p-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 transition-colors">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-neutral-700 hover:text-neutral-900 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {mainLogo && getLogoUrl(mainLogo) ? (
            <img 
              src={getLogoUrl(mainLogo)!} 
              alt={companyName} 
              className="h-6 sm:h-8 w-auto object-contain"
            />
          ) : textLogo && getLogoUrl(textLogo) ? (
            <img 
              src={getLogoUrl(textLogo)!} 
              alt={companyName} 
              className="h-6 sm:h-8 w-auto object-contain"
            />
          ) : null}
          <h1 className="text-base sm:text-xl font-bold text-primary-600 truncate">{companyName}</h1>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-neutral-900 shadow-medium border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300`}
        >
          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-30 animate-fade-in"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className="h-full flex flex-col relative z-40 bg-white dark:bg-neutral-900 transition-colors">
            <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mainLogo && getLogoUrl(mainLogo) ? (
                    <img 
                      src={getLogoUrl(mainLogo)!} 
                      alt={companyName} 
                      className="h-8 sm:h-10 w-auto object-contain"
                    />
                  ) : textLogo && getLogoUrl(textLogo) ? (
                    <img 
                      src={getLogoUrl(textLogo)!} 
                      alt={companyName} 
                      className="h-8 sm:h-10 w-auto object-contain"
                    />
                  ) : null}
                  <h2 className="text-lg sm:text-2xl font-bold text-primary-600 hidden lg:block">{companyName}</h2>
                </div>
              </div>
            </div>

            {/* User Profile Section */}
            {user && (
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
                >
                  <div className="flex-shrink-0">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.fullName || user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <UserCircle2 size={24} className="text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {user.fullName || user.username}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`flex-shrink-0 text-neutral-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 mx-4 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden">
                    <Link
                      to="/profile"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${
                        location.pathname === '/profile' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <UserCircle2 size={18} />
                      <span className="text-sm">پروفایل من</span>
                    </Link>
                    <Link
                      to="/profile/timesheets"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${
                        location.pathname === '/profile/timesheets' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <Clock size={18} />
                      <span className="text-sm">تایم‌شیت‌های من</span>
                    </Link>
                    <Link
                      to="/profile/edit"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${
                        location.pathname === '/profile/edit' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <Edit size={18} />
                      <span className="text-sm">ویرایش پروفایل</span>
                    </Link>
                    <div className="border-t border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-3 px-4 py-3 text-neutral-700 dark:text-neutral-300">
                        <Globe size={18} />
                        <span className="text-sm">زبان</span>
                        <ChevronRight size={16} className="mr-auto" />
                      </div>
                    </div>
                    <div className="border-t border-neutral-200 dark:border-neutral-700">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="text-sm">خروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <nav className="flex-1 p-2 sm:p-4 space-y-3 sm:space-4 overflow-y-auto">
              {Object.entries(menuGroups).map(([groupKey, items]) => {
                if (items.length === 0) return null;
                
                // For main group (dashboard), don't show as collapsible
                if (groupKey === 'main') {
                  return (
                    <div key={groupKey} className="space-y-1 sm:space-y-2">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base group/item animate-slide-right ${
                              isActive
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold border-r-2 border-primary-600 dark:border-primary-500'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-400'
                            }`}
                          >
                            <Icon 
                              size={18} 
                              className={`sm:w-5 sm:h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover/item:scale-110'}`} 
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                }
                
                // For other groups, show as collapsible
                const isExpanded = expandedGroups[groupKey] || false;
                const hasActiveItem = items.some(item => location.pathname === item.path);
                
                return (
                  <div key={groupKey} className="space-y-1 sm:space-y-2">
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs font-semibold uppercase tracking-wider group/header ${
                        hasActiveItem
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span>{groupLabels[groupKey]}</span>
                      {isExpanded ? (
                        <ChevronDown size={16} className="transition-transform" />
                      ) : (
                        <ChevronRight size={16} className="transition-transform" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="space-y-1 sm:space-y-2 pr-2 sm:pr-4">
                        {items.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base group/item animate-slide-right ${
                                isActive
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold border-r-2 border-primary-600 dark:border-primary-500'
                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-400'
                              }`}
                            >
                              <Icon 
                                size={18} 
                                className={`sm:w-5 sm:h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover/item:scale-110'}`} 
                              />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:mr-64 pt-32 lg:pt-16 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 min-h-screen transition-colors">
          <div className="p-3 sm:p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;


