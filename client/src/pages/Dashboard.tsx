import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  DollarSign, 
  Target, 
  TrendingUp,
  Calendar,
  Award,
  CheckSquare,
  FolderOpen,
  AlertCircle,
  Bell,
  Activity,
  BarChart3,
  PieChart,
  Users,
  Ticket,
  FileCheck,
  Briefcase
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { toJalali } from '../utils/dateHelper';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects' | 'reminders' | 'tickets' | 'announcements' | 'activity'>('tasks');
  
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard-overview',
    async () => {
      const response = await api.get('/dashboard/overview');
      return response.data;
    },
    {
      retry: 1,
      refetchInterval: 60000, // Refresh every minute
      onError: (error) => {
        console.error('Error fetching dashboard:', error);
      }
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl mb-2 text-gray-800">در حال بارگذاری...</div>
          <div className="text-sm text-gray-500">لطفاً صبر کنید</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-2">خطا در بارگذاری داده‌ها</div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-4"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  const data = dashboardData || {};
  const kpis = data.kpis || {};
  const invoiceOverview = data.invoiceOverview || {};
  const estimateOverview = data.estimateOverview || {};
  const proposalOverview = data.proposalOverview || {};
  const financialSummary = data.financialSummary || {};
  const leadsOverview = data.leadsOverview || [];
  const projectStatus = data.projectStatus || [];
  const ticketStatus = data.ticketStatus || [];
  const ticketDepartments = data.ticketDepartments || [];
  const paymentRecords = data.paymentRecords || [];
  const contractsExpiring = data.contractsExpiring || [];
  const staffTicketsReport = data.staffTicketsReport || [];
  const myTasks = data.myTasks || [];
  const myProjects = data.myProjects || [];
  const weekEvents = data.weekEvents || [];
  const latestActivity = data.latestActivity || [];
  const goals = data.goals || [];

  // Calculate percentages for overviews
  const getPercentage = (count: number, total: number) => {
    if (!total) return 0;
    return ((count / total) * 100).toFixed(2);
  };

  // Prepare payment records chart data
  const paymentChartData = [
    { name: 'دوشنبه', thisWeek: 0, lastWeek: 0 },
    { name: 'سه‌شنبه', thisWeek: 0, lastWeek: 0 },
    { name: 'چهارشنبه', thisWeek: 0, lastWeek: 0 },
    { name: 'پنج‌شنبه', thisWeek: 0, lastWeek: 0 },
    { name: 'جمعه', thisWeek: 0, lastWeek: 0 },
    { name: 'شنبه', thisWeek: 0, lastWeek: 0 },
    { name: 'یکشنبه', thisWeek: 0, lastWeek: 0 },
  ];

  paymentRecords.forEach((payment: any) => {
    const date = new Date(payment.date);
    const dayIndex = date.getDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to Monday=0
    if (payment.period === 'this_week') {
      paymentChartData[adjustedIndex].thisWeek += payment.amount || 0;
    } else if (payment.period === 'last_week') {
      paymentChartData[adjustedIndex].lastWeek += payment.amount || 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 p-2 sm:p-4 transition-colors">
      <div className="max-w-[1600px] mx-auto space-y-3 sm:space-y-4 animate-fade-in">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 transition-colors animate-slide-down">
          <h1 className="heading-2 text-gray-800 dark:text-gray-100">داشبورد</h1>
        <div className="body-small text-gray-600 dark:text-gray-400">
          خوش آمدید، {user?.full_name || user?.username}
        </div>
      </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link 
            to="/invoices" 
            className="group bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 sm:p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/0 to-red-50/0 dark:from-red-900/0 dark:to-red-900/0 group-hover:from-red-50/50 group-hover:to-red-50/0 dark:group-hover:from-red-900/20 dark:group-hover:to-red-900/0 transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-gray-600 dark:text-gray-400">فاکتورهای در انتظار پرداخت</span>
                <FileText className="text-red-500 dark:text-red-400" size={18} className="sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-gray-800 dark:text-gray-100">
                  {kpis.invoices_awaiting_payment || 0}
                </span>
                <span className="body-small text-gray-500 dark:text-gray-400">/ {kpis.invoices_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.invoices_awaiting_payment || 0, kpis.invoices_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>

          <Link 
            to="/leads" 
            className="group bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 sm:p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/0 to-green-50/0 dark:from-green-900/0 dark:to-green-900/0 group-hover:from-green-50/50 group-hover:to-green-50/0 dark:group-hover:from-green-900/20 dark:group-hover:to-green-900/0 transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-gray-600 dark:text-gray-400">سرنخ‌های تبدیل شده</span>
                <TrendingUp className="text-green-500 dark:text-green-400" size={18} className="sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-gray-800 dark:text-gray-100">
                  {kpis.converted_leads || 0}
                </span>
                <span className="body-small text-gray-500 dark:text-gray-400">/ {kpis.leads_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.converted_leads || 0, kpis.leads_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>

          <Link 
            to="/projects" 
            className="group bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 sm:p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 dark:from-blue-900/0 dark:to-blue-900/0 group-hover:from-blue-50/50 group-hover:to-blue-50/0 dark:group-hover:from-blue-900/20 dark:group-hover:to-blue-900/0 transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-gray-600 dark:text-gray-400">پروژه‌های در حال انجام</span>
                <FolderOpen className="text-blue-500 dark:text-blue-400" size={18} className="sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-gray-800 dark:text-gray-100">
                  {kpis.projects_in_progress || 0}
                </span>
                <span className="body-small text-gray-500 dark:text-gray-400">/ {kpis.projects_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.projects_in_progress || 0, kpis.projects_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>

          <Link 
            to="/tasks" 
            className="group bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 sm:p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/0 to-gray-50/0 dark:from-gray-800/0 dark:to-gray-800/0 group-hover:from-gray-50/50 group-hover:to-gray-50/0 dark:group-hover:from-gray-800/50 dark:group-hover:to-gray-800/0 transition-all duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-gray-600 dark:text-gray-400">وظایف تمام نشده</span>
                <CheckSquare className="text-gray-500 dark:text-gray-400" size={18} className="sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-gray-800 dark:text-gray-100">
                  {kpis.tasks_not_finished || 0}
                </span>
                <span className="body-small text-gray-500 dark:text-gray-400">/ {kpis.tasks_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-gray-500 to-gray-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.tasks_not_finished || 0, kpis.tasks_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>
        </div>

        {/* Overview Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Invoice Overview */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 sm:p-4 transition-colors animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="heading-4 text-gray-800 dark:text-gray-100">خلاصه فاکتورها</h3>
              <Link to="/invoices" className="body-small text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">مشاهده همه</Link>
            </div>
            <div className="space-y-2 body-small">
              <div className="flex justify-between">
                <span className="text-gray-600">پیش‌نویس:</span>
                <span className="font-medium">{invoiceOverview.draft || 0} ({getPercentage(invoiceOverview.draft || 0, invoiceOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ارسال نشده:</span>
                <span className="font-medium">{invoiceOverview.not_sent || 0} ({getPercentage(invoiceOverview.not_sent || 0, invoiceOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">پرداخت نشده:</span>
                <span className="font-medium text-red-600">{invoiceOverview.unpaid || 0} ({getPercentage(invoiceOverview.unpaid || 0, invoiceOverview.total || 1)}%)</span>
                </div>
              <div className="flex justify-between">
                <span className="text-gray-600">پرداخت جزئی:</span>
                <span className="font-medium text-yellow-600">{invoiceOverview.partially_paid || 0} ({getPercentage(invoiceOverview.partially_paid || 0, invoiceOverview.total || 1)}%)</span>
                </div>
              <div className="flex justify-between">
                <span className="text-gray-600">پرداخت شده:</span>
                <span className="font-medium text-green-600">{invoiceOverview.paid || 0} ({getPercentage(invoiceOverview.paid || 0, invoiceOverview.total || 1)}%)</span>
              </div>
            </div>
      </div>

          {/* Estimate Overview */}
          <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">خلاصه پیش‌فاکتورها</h3>
              <Link to="/estimates" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">پیش‌نویس:</span>
                <span className="font-medium">{estimateOverview.draft || 0} ({getPercentage(estimateOverview.draft || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ارسال نشده:</span>
                <span className="font-medium">{estimateOverview.not_sent || 0} ({getPercentage(estimateOverview.not_sent || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ارسال شده:</span>
                <span className="font-medium">{estimateOverview.sent || 0} ({getPercentage(estimateOverview.sent || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">رد شده:</span>
                <span className="font-medium text-red-600">{estimateOverview.declined || 0} ({getPercentage(estimateOverview.declined || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">پذیرفته شده:</span>
                <span className="font-medium text-green-600">{estimateOverview.accepted || 0} ({getPercentage(estimateOverview.accepted || 0, estimateOverview.total || 1)}%)</span>
              </div>
            </div>
          </div>

          {/* Proposal Overview */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">خلاصه پروپوزال‌ها</h3>
              <Link to="/proposals" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">باز:</span>
                <span className="font-medium">{proposalOverview.open || 0} ({getPercentage(proposalOverview.open || 0, proposalOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">بازبینی شده:</span>
                <span className="font-medium">{proposalOverview.revised || 0} ({getPercentage(proposalOverview.revised || 0, proposalOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">رد شده:</span>
                <span className="font-medium text-red-600">{proposalOverview.declined || 0} ({getPercentage(proposalOverview.declined || 0, proposalOverview.total || 1)}%)</span>
        </div>
              <div className="flex justify-between">
                <span className="text-gray-600">پذیرفته شده:</span>
                <span className="font-medium text-green-600">{proposalOverview.accepted || 0} ({getPercentage(proposalOverview.accepted || 0, proposalOverview.total || 1)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-4">خلاصه مالی</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">فاکتورهای معوق</div>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.outstanding || 0)} تومان
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">فاکتورهای سررسید گذشته</div>
              <div className="text-2xl font-bold text-orange-600">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.past_due || 0)} تومان
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">فاکتورهای پرداخت شده</div>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.paid || 0)} تومان
              </div>
            </div>
          </div>
                </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Activity Tabs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b border-gray-200">
                <div className="flex space-x-1 p-2">
                  {[
                    { id: 'tasks', label: 'وظایف من', icon: CheckSquare },
                    { id: 'projects', label: 'پروژه‌های من', icon: FolderOpen },
                    { id: 'reminders', label: 'یادآوری‌ها', icon: Bell },
                    { id: 'tickets', label: 'تیکت‌ها', icon: Ticket },
                    { id: 'announcements', label: 'اعلان‌ها', icon: AlertCircle },
                    { id: 'activity', label: 'آخرین فعالیت', icon: Activity },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={16} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4">
                {activeTab === 'tasks' && (
                  <div className="space-y-2">
                    {myTasks.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">وظایف من</span>
                          <Link to="/tasks" className="text-xs text-blue-600 hover:text-blue-700">مشاهده همه</Link>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-right p-2">#</th>
                                <th className="text-right p-2">نام</th>
                                <th className="text-right p-2">وضعیت</th>
                                <th className="text-right p-2">تاریخ شروع</th>
                                <th className="text-right p-2">اولویت</th>
                              </tr>
                            </thead>
                            <tbody>
                              {myTasks.slice(0, 5).map((task: any, index: number) => (
                                <tr key={task.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2">{index + 1}</td>
                                  <td className="p-2">{task.title}</td>
                                  <td className="p-2">
                                    <span className={`badge badge-${task.status === 'completed' ? 'success' : 'warning'}`}>
                                      {task.status}
                                    </span>
                                  </td>
                                  <td className="p-2">{task.start_date ? toJalali(task.start_date) : '-'}</td>
                                  <td className="p-2">
                                    <span className={`badge badge-${task.priority === 'urgent' ? 'danger' : 'neutral'}`}>
                                      {task.priority}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        وظایفی یافت نشد
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'projects' && (
                  <div className="space-y-2">
                    {myProjects.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">پروژه‌های من</span>
                          <Link to="/projects" className="text-xs text-blue-600 hover:text-blue-700">مشاهده همه</Link>
                        </div>
                        <div className="space-y-2">
                          {myProjects.slice(0, 5).map((project: any) => (
                            <Link
                              key={project.id}
                              to={`/projects/${project.id}`}
                              className="block p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="font-medium">{project.name}</div>
                              <div className="text-sm text-gray-600">{project.account_name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {project.status} - {toJalali(project.created_at)}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        پروژه‌ای یافت نشد
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tickets' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">تیکت‌ها</span>
                      <Link to="/tickets" className="text-xs text-blue-600 hover:text-blue-700">مشاهده همه</Link>
                    </div>
                    <div className="text-center py-8 text-gray-500">
                      تیکتی یافت نشد
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-2">
                    {latestActivity.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">آخرین فعالیت</span>
                          <Link to="/activity-log" className="text-xs text-blue-600 hover:text-blue-700">مشاهده همه</Link>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {latestActivity.slice(0, 10).map((activity: any) => (
                            <div key={activity.id} className="p-2 border-b text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium">{activity.user_name || 'سیستم'}</span>
                                <span className="text-gray-500 text-xs">{toJalali(activity.created_at)}</span>
                              </div>
                              <div className="text-gray-600 mt-1">{activity.description || activity.action}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        فعالیتی یافت نشد
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* This Week Events */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">رویدادهای این هفته</h3>
                <Link to="/calendar" className="text-sm text-blue-600 hover:text-blue-700">مشاهده تقویم</Link>
              </div>
              {weekEvents.length > 0 ? (
                <div className="space-y-2">
                  {weekEvents.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-gray-600">{event.account_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {toJalali(event.start_at)} - {event.event_type}
                </div>
              </div>
            ))}
          </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  رویدادی برای این هفته وجود ندارد
        </div>
      )}
            </div>

            {/* Payment Records Chart */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-bold text-gray-800 mb-4">سوابق پرداخت</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="thisWeek" fill="#0088FE" name="این هفته" />
                  <Bar dataKey="lastWeek" fill="#82ca9d" name="هفته گذشته" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Contracts Expiring Soon */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">قراردادهای در حال انقضا</h3>
                <Link to="/contracts" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              {contractsExpiring.length > 0 ? (
          <div className="overflow-x-auto">
                  <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                        <th className="text-right p-2">موضوع</th>
                        <th className="text-right p-2">مشتری</th>
                        <th className="text-right p-2">تاریخ شروع</th>
                        <th className="text-right p-2">تاریخ پایان</th>
                </tr>
              </thead>
              <tbody>
                      {contractsExpiring.map((contract: any) => (
                        <tr key={contract.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{contract.subject}</td>
                          <td className="p-2">{contract.account_name}</td>
                          <td className="p-2">{contract.start_date ? toJalali(contract.start_date) : '-'}</td>
                          <td className="p-2">{contract.end_date ? toJalali(contract.end_date) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  قراردادی در حال انقضا وجود ندارد
        </div>
      )}
            </div>

            {/* Staff Tickets Report */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">گزارش تیکت‌های کارکنان</h3>
                <Link to="/tickets" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              {staffTicketsReport.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-2">کارمند</th>
                        <th className="text-right p-2">کل تیکت‌ها</th>
                        <th className="text-right p-2">باز</th>
                        <th className="text-right p-2">بسته</th>
                        <th className="text-right p-2">پاسخ‌ها</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffTicketsReport.map((staff: any) => (
                        <tr key={staff.user_id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{staff.staff_member}</td>
                          <td className="p-2">{staff.total_assigned || 0}</td>
                          <td className="p-2">{staff.open_tickets || 0}</td>
                          <td className="p-2">{staff.closed_tickets || 0}</td>
                          <td className="p-2">{staff.replies_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  داده‌ای یافت نشد
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Leads Overview Chart */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">خلاصه سرنخ‌ها</h3>
                <Link to="/leads" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              {leadsOverview.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={leadsOverview}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {leadsOverview.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Project Status Chart */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">آمار بر اساس وضعیت پروژه</h3>
                <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              {projectStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={projectStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {projectStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Tickets by Status */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">تیکت‌های در انتظار پاسخ بر اساس وضعیت</h3>
                <Link to="/tickets" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              {ticketStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={ticketStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {ticketStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Tickets by Department */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">تیکت‌های در انتظار پاسخ بر اساس دپارتمان</h3>
                <Link to="/tickets" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              {ticketDepartments.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={ticketDepartments}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ department, percent }: any) => `${department}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {ticketDepartments.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Goals */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">اهداف</h3>
                <Link to="/settings" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              {goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.slice(0, 5).map((goal: any) => {
                    const progress = goal.current_value && goal.target_value 
                      ? Math.min((goal.current_value / goal.target_value) * 100, 100) 
                      : 0;
                    return (
                      <div key={goal.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{goal.goal_type}</span>
                          <span className="text-xs text-gray-500">{progress.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div 
                            className={`h-2 rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600">
                          {goal.current_value || 0} / {goal.target_value || 0}
          </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  هدفی تعریف نشده است
        </div>
      )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
