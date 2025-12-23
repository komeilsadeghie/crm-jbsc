import { useState, useMemo } from 'react';
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
  Briefcase,
  Clock,
  Smile
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        <div className="glass-card p-8 text-center">
          <div className="text-xl mb-2 text-neutral-800 dark:text-neutral-200">در حال بارگذاری...</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">لطفاً صبر کنید</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        <div className="glass-card p-8 text-center">
          <div className="text-xl text-danger-600 dark:text-danger-400 mb-2">خطا در بارگذاری داده‌ها</div>
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

  // Fetch my tasks for Mizito-style cards
  const { data: allMyTasks } = useQuery(
    'my-tasks-for-dashboard',
    async () => {
      try {
        const response = await api.get('/tasks');
        const allTasks = response.data || [];
        // Filter tasks assigned to current user
        return allTasks.filter((task: any) => 
          task.assigned_to === user?.id || task.assigned_to_name === user?.fullName
        );
      } catch (error) {
        console.error('Error fetching my tasks:', error);
        return [];
      }
    },
    {
      retry: 1,
      refetchInterval: 60000,
    }
  );

  // Calculate Mizito-style task statistics
  const taskStats = useMemo(() => {
    const tasks = allMyTasks || [];
    const todayStr = new Date().toISOString().split('T')[0];
    
    const tasksToday = tasks.filter((task: any) => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      return taskDate === todayStr;
    });
    
    const overdueTasks = tasks.filter((task: any) => {
      if (!task.due_date || task.status === 'done') return false;
      const taskDate = new Date(task.due_date);
      return taskDate < new Date() && task.status !== 'done';
    });
    
    const trackableTasks = tasks.filter((task: any) => 
      task.status === 'in_progress' || task.status === 'todo'
    );

    return {
      today: tasksToday.length,
      overdue: overdueTasks.length,
      trackable: trackableTasks.length,
      all: tasks.length
    };
  }, [allMyTasks]);

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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 p-2 sm:p-4 pt-20 sm:pt-24 md:pt-4 transition-colors">
      <div className="max-w-[1600px] mx-auto space-y-3 sm:space-y-4 animate-fade-in">
        {/* Header */}
        <div className="glass-card p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 transition-colors animate-slide-down">
          <h1 className="heading-2 text-neutral-800 dark:text-neutral-200">داشبورد</h1>
        <div className="body-small text-neutral-600 dark:text-neutral-400">
          خوش آمدید، {user?.fullName || user?.username}
        </div>
      </div>

        {/* Mizito-style Task Cards - First Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* کارهای امروز من */}
          <div className="group glass-card p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up bg-gradient-to-br from-success-50/50 to-success-100/30 dark:from-success-900/20 dark:to-success-800/10 border-2 border-success-200/50 dark:border-success-800/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className="text-success-600 dark:text-success-400" size={20} />
                  <span className="body-small text-neutral-700 dark:text-neutral-300 font-medium">کارهای امروز من</span>
                </div>
                <div className="heading-2 text-success-700 dark:text-success-300">{taskStats.today}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                <CheckSquare className="text-success-600 dark:text-success-400" size={24} />
              </div>
            </div>
          </div>

          {/* کارهای دارای تاخیر */}
          <div className="group glass-card p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up bg-gradient-to-br from-warning-50/50 to-warning-100/30 dark:from-warning-900/20 dark:to-warning-800/10 border-2 border-warning-200/50 dark:border-warning-800/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Smile className="text-warning-600 dark:text-warning-400" size={20} />
                  <span className="body-small text-neutral-700 dark:text-neutral-300 font-medium">کارهای دارای تاخیر</span>
                </div>
                <div className="heading-2 text-warning-700 dark:text-warning-300">{taskStats.overdue}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                <Smile className="text-warning-600 dark:text-warning-400" size={24} />
              </div>
            </div>
          </div>

          {/* کارهای قابل پیگیری */}
          <div className="group glass-card p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-primary-900/20 dark:to-primary-800/10 border-2 border-primary-200/50 dark:border-primary-800/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-primary-600 dark:text-primary-400" size={20} />
                  <span className="body-small text-neutral-700 dark:text-neutral-300 font-medium">کارهای قابل پیگیری</span>
                </div>
                <div className="heading-2 text-primary-700 dark:text-primary-300">{taskStats.trackable}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Clock className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
        </div>
      </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link 
            to="/invoices" 
            className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-danger-50/0 to-danger-50/0 dark:from-danger-900/0 dark:to-danger-900/0 group-hover:from-danger-50/30 group-hover:to-danger-50/0 dark:group-hover:from-danger-900/20 dark:group-hover:to-danger-900/0 transition-all duration-300 rounded-lg" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-neutral-600 dark:text-neutral-400">فاکتورهای در انتظار پرداخت</span>
                <FileText className="text-danger-500 dark:text-danger-400 sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" size={18} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-neutral-800 dark:text-neutral-200">
                  {kpis.invoices_awaiting_payment || 0}
                </span>
                <span className="body-small text-neutral-500 dark:text-neutral-400">/ {kpis.invoices_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-neutral-200/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-danger-500 to-danger-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.invoices_awaiting_payment || 0, kpis.invoices_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>

          <Link 
            to="/leads" 
            className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success-50/0 to-success-50/0 dark:from-success-900/0 dark:to-success-900/0 group-hover:from-success-50/30 group-hover:to-success-50/0 dark:group-hover:from-success-900/20 dark:group-hover:to-success-900/0 transition-all duration-300 rounded-lg" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-neutral-600 dark:text-neutral-400">سرنخ‌های تبدیل شده</span>
                <TrendingUp className="text-success-500 dark:text-success-400 sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" size={18} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-neutral-800 dark:text-neutral-200">
                  {kpis.converted_leads || 0}
                </span>
                <span className="body-small text-neutral-500 dark:text-neutral-400">/ {kpis.leads_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-neutral-200/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-success-500 to-success-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.converted_leads || 0, kpis.leads_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>

          <Link 
            to="/projects" 
            className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-primary-50/0 dark:from-primary-900/0 dark:to-primary-900/0 group-hover:from-primary-50/30 group-hover:to-primary-50/0 dark:group-hover:from-primary-900/20 dark:group-hover:to-primary-900/0 transition-all duration-300 rounded-lg" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-neutral-600 dark:text-neutral-400">پروژه‌های در حال انجام</span>
                <FolderOpen className="text-primary-500 dark:text-primary-400 sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" size={18} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-neutral-800 dark:text-neutral-200">
                  {kpis.projects_in_progress || 0}
                </span>
                <span className="body-small text-neutral-500 dark:text-neutral-400">/ {kpis.projects_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-neutral-200/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.projects_in_progress || 0, kpis.projects_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>

          <Link 
            to="/tasks" 
            className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-50/0 to-neutral-50/0 dark:from-neutral-800/0 dark:to-neutral-800/0 group-hover:from-neutral-50/30 group-hover:to-neutral-50/0 dark:group-hover:from-neutral-800/30 dark:group-hover:to-neutral-800/0 transition-all duration-300 rounded-lg" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="body-small text-neutral-600 dark:text-neutral-400">وظایف تمام نشده</span>
                <CheckSquare className="text-neutral-500 dark:text-neutral-400 sm:w-5 sm:h-5 flex-shrink-0 group-hover:scale-110 transition-transform" size={18} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="heading-2 text-neutral-800 dark:text-neutral-200">
                  {kpis.tasks_not_finished || 0}
                </span>
                <span className="body-small text-neutral-500 dark:text-neutral-400">/ {kpis.tasks_total || 0}</span>
              </div>
              <div className="mt-2 w-full bg-neutral-200/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-neutral-500 to-neutral-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(kpis.tasks_not_finished || 0, kpis.tasks_total || 1)}%` }}
                />
              </div>
            </div>
          </Link>
        </div>

        {/* Overview Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Invoice Overview */}
          <div className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-danger-50/0 to-danger-50/0 dark:from-danger-900/0 dark:to-danger-900/0 group-hover:from-danger-50/30 group-hover:to-danger-50/0 dark:group-hover:from-danger-900/20 dark:group-hover:to-danger-900/0 transition-all duration-300 rounded-lg" />
            <div className="relative">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">خلاصه فاکتورها</h3>
                <Link to="/invoices" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
            </div>
            <div className="space-y-2 body-small">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">پیش‌نویس:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{invoiceOverview.draft || 0} ({getPercentage(invoiceOverview.draft || 0, invoiceOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">ارسال نشده:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{invoiceOverview.not_sent || 0} ({getPercentage(invoiceOverview.not_sent || 0, invoiceOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">پرداخت نشده:</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">{invoiceOverview.unpaid || 0} ({getPercentage(invoiceOverview.unpaid || 0, invoiceOverview.total || 1)}%)</span>
                </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">پرداخت جزئی:</span>
                <span className="font-medium text-warning-600 dark:text-warning-400">{invoiceOverview.partially_paid || 0} ({getPercentage(invoiceOverview.partially_paid || 0, invoiceOverview.total || 1)}%)</span>
                </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">پرداخت شده:</span>
                <span className="font-medium text-success-600 dark:text-success-400">{invoiceOverview.paid || 0} ({getPercentage(invoiceOverview.paid || 0, invoiceOverview.total || 1)}%)</span>
              </div>
              </div>
            </div>
      </div>

          {/* Estimate Overview */}
          <div className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-primary-50/0 dark:from-primary-900/0 dark:to-primary-900/0 group-hover:from-primary-50/30 group-hover:to-primary-50/0 dark:group-hover:from-primary-900/20 dark:group-hover:to-primary-900/0 transition-all duration-300 rounded-lg" />
            <div className="relative">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">خلاصه پیش‌فاکتورها</h3>
                <Link to="/estimates" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
            </div>
              <div className="space-y-2 body-small">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">پیش‌نویس:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{estimateOverview.draft || 0} ({getPercentage(estimateOverview.draft || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">ارسال نشده:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{estimateOverview.not_sent || 0} ({getPercentage(estimateOverview.not_sent || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">ارسال شده:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{estimateOverview.sent || 0} ({getPercentage(estimateOverview.sent || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">رد شده:</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">{estimateOverview.declined || 0} ({getPercentage(estimateOverview.declined || 0, estimateOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">پذیرفته شده:</span>
                <span className="font-medium text-success-600 dark:text-success-400">{estimateOverview.accepted || 0} ({getPercentage(estimateOverview.accepted || 0, estimateOverview.total || 1)}%)</span>
              </div>
              </div>
            </div>
          </div>

          {/* Proposal Overview */}
          <div className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.7s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-success-50/0 to-success-50/0 dark:from-success-900/0 dark:to-success-900/0 group-hover:from-success-50/30 group-hover:to-success-50/0 dark:group-hover:from-success-900/20 dark:group-hover:to-success-900/0 transition-all duration-300 rounded-lg" />
            <div className="relative">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">خلاصه پروپوزال‌ها</h3>
                <Link to="/proposals" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
            </div>
              <div className="space-y-2 body-small">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">باز:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{proposalOverview.open || 0} ({getPercentage(proposalOverview.open || 0, proposalOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">بازبینی شده:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{proposalOverview.revised || 0} ({getPercentage(proposalOverview.revised || 0, proposalOverview.total || 1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">رد شده:</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">{proposalOverview.declined || 0} ({getPercentage(proposalOverview.declined || 0, proposalOverview.total || 1)}%)</span>
        </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">پذیرفته شده:</span>
                <span className="font-medium text-success-600 dark:text-success-400">{proposalOverview.accepted || 0} ({getPercentage(proposalOverview.accepted || 0, proposalOverview.total || 1)}%)</span>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="group glass-card p-3 sm:p-4 hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-warning-50/0 to-warning-50/0 dark:from-warning-900/0 dark:to-warning-900/0 group-hover:from-warning-50/30 group-hover:to-warning-50/0 dark:group-hover:from-warning-900/20 dark:group-hover:to-warning-900/0 transition-all duration-300 rounded-lg" />
          <div className="relative">
            <h3 className="heading-4 text-neutral-800 dark:text-neutral-200 mb-3 sm:mb-4">خلاصه مالی</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 glass-card bg-danger-50/30 dark:bg-danger-900/20 rounded-lg border border-danger-100/50 dark:border-danger-800/30">
                <div className="body-small text-neutral-600 dark:text-neutral-400 mb-1">فاکتورهای معوق</div>
                <div className="heading-2 text-danger-600 dark:text-danger-400">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.outstanding || 0)} تومان
              </div>
            </div>
              <div className="text-center p-3 sm:p-4 glass-card bg-warning-50/30 dark:bg-warning-900/20 rounded-lg border border-warning-100/50 dark:border-warning-800/30">
                <div className="body-small text-neutral-600 dark:text-neutral-400 mb-1">فاکتورهای سررسید گذشته</div>
                <div className="heading-2 text-warning-600 dark:text-warning-400">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.past_due || 0)} تومان
              </div>
            </div>
              <div className="text-center p-3 sm:p-4 glass-card bg-success-50/30 dark:bg-success-900/20 rounded-lg border border-success-100/50 dark:border-success-800/30">
                <div className="body-small text-neutral-600 dark:text-neutral-400 mb-1">فاکتورهای پرداخت شده</div>
                <div className="heading-2 text-success-600 dark:text-success-400">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.paid || 0)} تومان
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Tasks and Tracking Sections - Mizito Style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* کارهای من */}
          <div className="glass-card border-2 border-success-500/30 dark:border-success-600/30 animate-slide-up" style={{ animationDelay: '0.9s' }}>
            <div className="p-4 border-b border-success-200/50 dark:border-success-800/30 bg-success-50/30 dark:bg-success-900/20">
              <h3 className="font-bold text-neutral-800 dark:text-neutral-200">
                کارهای من ({taskStats.all} مورد)
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {allMyTasks && allMyTasks.length > 0 ? (
                <>
                  {allMyTasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        readOnly
                        className="mt-1 w-5 h-5 text-success-600 border-gray-300 rounded focus:ring-success-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-neutral-800 dark:text-neutral-200">{task.title}</div>
                        {task.due_date && (
                          <div className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                            مهلت: {toJalali(task.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {allMyTasks.length > 5 && (
                    <div className="pt-2">
                      <Link
                        to="/tasks"
                        className="block w-full text-center py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors font-medium"
                      >
                        مشاهده همه
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  کاری برای نمایش ندارید
                </div>
              )}
            </div>
          </div>

          {/* پیگیری از دیگران */}
          <div className="glass-card border-2 border-danger-500/30 dark:border-danger-600/30 animate-slide-up" style={{ animationDelay: '1s' }}>
            <div className="p-4 border-b border-danger-200/50 dark:border-danger-800/30 bg-danger-50/30 dark:bg-danger-900/20">
              <h3 className="font-bold text-neutral-800 dark:text-neutral-200">پیگیری از دیگران</h3>
            </div>
            <div className="p-4">
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                کاری برای پیگیری ندارید
              </div>
            </div>
          </div>
                </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Activity Tabs */}
            <div className="glass-card transition-colors">
              <div className="border-b border-white/20 dark:border-neutral-700/50">
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
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors backdrop-blur-sm ${
                          activeTab === tab.id
                            ? 'bg-primary-50/50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/30 dark:hover:bg-neutral-800/50'
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
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">وظایف من</span>
                          <Link to="/tasks" className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">مشاهده همه</Link>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/20 dark:border-neutral-700/50">
                                <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">#</th>
                                <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">نام</th>
                                <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">وضعیت</th>
                                <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">تاریخ شروع</th>
                                <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">اولویت</th>
                              </tr>
                            </thead>
                            <tbody>
                              {myTasks.slice(0, 5).map((task: any, index: number) => (
                                <tr key={task.id} className="border-b border-white/10 dark:border-neutral-700/30 hover:bg-white/20 dark:hover:bg-neutral-800/30">
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
                      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
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
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">پروژه‌های من</span>
                          <Link to="/projects" className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">مشاهده همه</Link>
                        </div>
                        <div className="space-y-2">
                          {myProjects.slice(0, 5).map((project: any) => (
                            <Link
                              key={project.id}
                              to={`/projects/${project.id}`}
                              className="block p-3 glass-card border border-white/20 dark:border-neutral-700/50 rounded-lg hover:bg-white/20 dark:hover:bg-neutral-800/30 transition-colors"
                            >
                              <div className="font-medium text-neutral-800 dark:text-neutral-200">{project.name}</div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">{project.account_name}</div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                {project.status} - {toJalali(project.created_at)}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                        پروژه‌ای یافت نشد
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tickets' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">تیکت‌ها</span>
                      <Link to="/tickets" className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">مشاهده همه</Link>
                    </div>
                    <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                      تیکتی یافت نشد
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-2">
                    {latestActivity.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">آخرین فعالیت</span>
                          <Link to="/activity-log" className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">مشاهده همه</Link>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {latestActivity.slice(0, 10).map((activity: any) => (
                            <div key={activity.id} className="p-2 border-b border-white/10 dark:border-neutral-700/30 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium text-neutral-800 dark:text-neutral-200">{activity.user_name || 'سیستم'}</span>
                                <span className="text-neutral-500 dark:text-neutral-400 text-xs">{toJalali(activity.created_at)}</span>
                              </div>
                              <div className="text-neutral-600 dark:text-neutral-400 mt-1">{activity.description || activity.action}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                        فعالیتی یافت نشد
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* This Week Events */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">رویدادهای این هفته</h3>
                <Link to="/calendar" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده تقویم</Link>
              </div>
              {weekEvents.length > 0 ? (
                <div className="space-y-2">
                  {weekEvents.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="p-3 glass-card border border-white/20 dark:border-neutral-700/50 rounded-lg">
                      <div className="font-medium text-neutral-800 dark:text-neutral-200">{event.title}</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">{event.account_name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {toJalali(event.start_at)} - {event.event_type}
                </div>
              </div>
            ))}
          </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  رویدادی برای این هفته وجود ندارد
        </div>
      )}
            </div>

            {/* Payment Records Chart */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <h3 className="heading-4 text-neutral-800 dark:text-neutral-200 mb-3 sm:mb-4">سوابق پرداخت</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-300 dark:text-neutral-700" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-neutral-700 dark:text-neutral-300" />
                  <YAxis stroke="currentColor" className="text-neutral-700 dark:text-neutral-300" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      color: '#1f2937'
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'currentColor' }} className="text-neutral-700 dark:text-neutral-300" />
                  <Bar dataKey="thisWeek" fill="#0088FE" name="این هفته" />
                  <Bar dataKey="lastWeek" fill="#82ca9d" name="هفته گذشته" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Contracts Expiring Soon */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">قراردادهای در حال انقضا</h3>
                <Link to="/contracts" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
              </div>
              {contractsExpiring.length > 0 ? (
          <div className="overflow-x-auto">
                  <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 dark:border-neutral-700/50">
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">موضوع</th>
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">مشتری</th>
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">تاریخ شروع</th>
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">تاریخ پایان</th>
                </tr>
              </thead>
              <tbody>
                      {contractsExpiring.map((contract: any) => (
                        <tr key={contract.id} className="border-b border-white/10 dark:border-neutral-700/30 hover:bg-white/20 dark:hover:bg-neutral-800/30">
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
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  قراردادی در حال انقضا وجود ندارد
        </div>
      )}
            </div>

            {/* Staff Tickets Report */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">گزارش تیکت‌های کارکنان</h3>
                <Link to="/tickets" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
              </div>
              {staffTicketsReport.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 dark:border-neutral-700/50">
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">کارمند</th>
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">کل تیکت‌ها</th>
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">باز</th>
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">بسته</th>
                        <th className="text-right p-2 text-neutral-700 dark:text-neutral-300">پاسخ‌ها</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffTicketsReport.map((staff: any) => (
                        <tr key={staff.user_id} className="border-b border-white/10 dark:border-neutral-700/30 hover:bg-white/20 dark:hover:bg-neutral-800/30">
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
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  داده‌ای یافت نشد
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Leads Overview Chart */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">خلاصه سرنخ‌ها</h3>
                <Link to="/leads" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
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
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Project Status Chart */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">آمار بر اساس وضعیت پروژه</h3>
                <Link to="/projects" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
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
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Tickets by Status */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">تیکت‌های در انتظار پاسخ بر اساس وضعیت</h3>
                <Link to="/tickets" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
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
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Tickets by Department */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">تیکت‌های در انتظار پاسخ بر اساس دپارتمان</h3>
                <Link to="/tickets" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
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
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">داده‌ای وجود ندارد</div>
              )}
            </div>

            {/* Goals */}
            <div className="glass-card p-3 sm:p-4 transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="heading-4 text-neutral-800 dark:text-neutral-200">اهداف</h3>
                <Link to="/settings" className="body-small text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">مشاهده همه</Link>
              </div>
              {goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.slice(0, 5).map((goal: any) => {
                    const progress = goal.current_value && goal.target_value 
                      ? Math.min((goal.current_value / goal.target_value) * 100, 100) 
                      : 0;
                    return (
                      <div key={goal.id} className="p-3 glass-card border border-white/20 dark:border-neutral-700/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{goal.goal_type}</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">{progress.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-neutral-200/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-full h-2 mb-1">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          {goal.current_value || 0} / {goal.target_value || 0}
          </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
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
