import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  Image
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
    { path: '/leads', icon: UserPlus, label: 'سرنخ‌ها' },
    { path: '/deals', icon: Briefcase, label: 'پروژه‌ها' },
    { path: '/customers', icon: Users, label: 'مشتریان' },
    { path: '/media', icon: Image, label: 'مدیا' },
    { path: '/coaching', icon: Target, label: 'کوچینگ' },
    { path: '/reports', icon: BarChart3, label: 'گزارش‌گیری' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-md p-4 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-bold text-primary-600">CRM هوشمند</h1>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transition-transform duration-300`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-primary-600 hidden lg:block">CRM هوشمند</h2>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t">
              <div className="mb-4 px-4 py-2">
                <p className="font-medium text-gray-800">{user?.full_name || user?.username}</p>
                <p className="text-sm text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={20} />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:mr-64 pt-16 lg:pt-0">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;


