import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  ArrowRight, 
  Plus, 
  FileText, 
  Clock, 
  Target, 
  FolderOpen, 
  MessageSquare, 
  BarChart3,
  HelpCircle,
  FileSignature,
  TrendingUp,
  StickyNote,
  Activity,
  Calendar,
  Users,
  DollarSign,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  CheckSquare,
  Play,
  Square,
  Download,
  X,
  User,
  Shield
} from 'lucide-react';
import { toJalali, getJalaliDayjs, jalaliWeekDaysShort } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timesheets' | 'milestones' | 'files' | 'discussions' | 'gantt' | 'tickets' | 'contracts' | 'sales' | 'notes' | 'activity'>('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [taskSearch, setTaskSearch] = useState<string>('');
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);

  const { data: project, isLoading } = useQuery(
    ['project-detail', id],
    async () => {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    },
    { enabled: !!id }
  );

  // Fetch tickets for this project
  const { data: projectTickets } = useQuery(
    ['project-tickets', id, project?.account_id],
    async () => {
      if (!project?.account_id) return [];
      const response = await api.get(`/tickets?account_id=${project.account_id}`);
      return response.data || [];
    },
    { enabled: !!id && !!project?.account_id }
  );

  // Fetch contracts for this project
  const { data: projectContracts } = useQuery(
    ['project-contracts', id, project?.account_id],
    async () => {
      if (!project?.account_id) return [];
      const response = await api.get(`/contracts?account_id=${project.account_id}`);
      return response.data || [];
    },
    { enabled: !!id && !!project?.account_id }
  );

  // Fetch estimates/invoices for sales tab
  const { data: projectEstimates } = useQuery(
    ['project-estimates', id, project?.account_id],
    async () => {
      if (!project?.account_id) return [];
      try {
        const response = await api.get(`/estimates?account_id=${project.account_id}`);
        return response.data || [];
      } catch {
        return [];
      }
    },
    { enabled: !!id && !!project?.account_id }
  );

  // Fetch users for task assignment
  const { data: users } = useQuery('assignable-users', async () => {
    try {
      const response = await api.get('/users/assignable');
      return response.data || [];
    } catch {
      return [];
    }
  });

  // Task mutations
  const createTaskMutation = useMutation(
    (data: any) => api.post('/tasks', { ...data, project_id: id }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-detail', id]);
        queryClient.invalidateQueries('pending-tasks'); // Update notifications
        window.dispatchEvent(new Event('task-updated'));
        setShowTaskModal(false);
        setEditingTask(null);
        alert('وظیفه با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateTaskMutation = useMutation(
    ({ id: taskId, data }: { id: number; data: any }) => api.put(`/tasks/${taskId}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-detail', id]);
        queryClient.invalidateQueries('pending-tasks'); // Update notifications
        window.dispatchEvent(new Event('task-updated'));
        setShowTaskModal(false);
        setEditingTask(null);
        alert('وظیفه با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteTaskMutation = useMutation(
    (taskId: number) => api.delete(`/tasks/${taskId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-detail', id]);
        alert('وظیفه با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const createDiscussionMutation = useMutation(
    (data: any) => api.post(`/projects/${id}/discussions`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-detail', id]);
        setShowDiscussionModal(false);
        alert('مکالمه با موفقیت ثبت شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateProjectMutation = useMutation(
    (data: any) => api.put(`/projects/${id}`, { ...project, ...data }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-detail', id]);
      },
      onError: (error: any) => {
        alert('خطا در به‌روزرسانی: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-medium text-neutral-700 dark:text-neutral-300">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-medium text-neutral-700 dark:text-neutral-300">پروژه یافت نشد</div>
          <button onClick={() => navigate('/projects')} className="btn btn-primary mt-4">
            بازگشت به لیست پروژه‌ها
          </button>
        </div>
      </div>
    );
  }

  // Calculate progress
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((t: any) => t.status === 'done').length || 0;
  const notStartedTasks = project.tasks?.filter((t: any) => t.status === 'todo').length || 0;
  const inProgressTasks = project.tasks?.filter((t: any) => t.status === 'in_progress').length || 0;
  const reviewTasks = project.tasks?.filter((t: any) => t.status === 'review').length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter and search tasks
  const filteredTasks = project.tasks?.filter((task: any) => {
    const matchesFilter = taskFilter === 'all' || task.status === taskFilter;
    const matchesSearch = !taskSearch || 
      task.title?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      task.description?.toLowerCase().includes(taskSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  // Calculate days left
  const startDate = project.start_date ? new Date(project.start_date) : null;
  const endDate = project.end_date ? new Date(project.end_date) : null;
  const today = new Date();
  const daysLeft = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const totalDays = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const daysProgress = totalDays > 0 ? Math.round(((totalDays - daysLeft) / totalDays) * 100) : 0;

  // Calculate expenses
  const totalExpenses = project.expenses?.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0) || 0;
  const billableExpenses = project.expenses?.filter((exp: any) => exp.billable === 1).reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0) || 0;
  const billedExpenses = 0; // TODO: Calculate from invoices
  const unbilledExpenses = billableExpenses - billedExpenses;

  // Calculate total logged hours
  const totalHours = project.tasks?.reduce((sum: number, task: any) => {
    const taskHours = task.time_logs?.reduce((taskSum: number, log: any) => {
      // Convert duration_minutes to hours
      const hours = log.duration_minutes ? log.duration_minutes / 60 : 0;
      return taskSum + hours;
    }, 0) || 0;
    return sum + taskHours;
  }, 0) || 0;

  // Get all time logs for timesheets tab
  const allTimeLogs = project.tasks?.flatMap((task: any) => 
    (task.time_logs || []).map((log: any) => ({
      ...log,
      task_title: task.title,
      task_id: task.id
    }))
  ) || [];

  // Prepare chart data for logged hours (weekly)
  const chartData = [];
  const todayDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(todayDate);
    date.setDate(date.getDate() - i);
    const jalaliDayjs = getJalaliDayjs(date);
    chartData.push({
      name: jalaliWeekDaysShort[jalaliDayjs.day()],
      hours: 0 // TODO: Calculate actual hours for this day
    });
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 border-success-300 dark:border-success-600', // ✅ سبز → تکمیل شده
      'customer_following': 'bg-primary-600 dark:bg-primary-500 text-white border-primary-700 dark:border-primary-600', // 🔵 آبی پررنگ → مشتری در حال پیگیری
      'in_progress': 'bg-primary-200 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border-primary-300 dark:border-primary-600', // 🔵 آبی کمرنگ → در حال رسیدگی
      'cooperation_ended': 'bg-danger-500 dark:bg-danger-600 text-white border-danger-600 dark:border-danger-700', // 🔴 قرمز → اتمام همکاری
      'on_hold': 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 border-warning-300 dark:border-warning-600', // 🟠 نارنجی → هولد شده
      planning: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600',
      active: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-600',
      cancelled: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 border-danger-300 dark:border-danger-600',
    };
    return colors[status] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'تکمیل شده',
      'customer_following': 'مشتری در حال پیگیری',
      'in_progress': 'در حال رسیدگی',
      'cooperation_ended': 'اتمام همکاری',
      'on_hold': 'هولد شده',
      planning: 'در حال برنامه‌ریزی',
      active: 'فعال',
      cancelled: 'لغو شده',
    };
    return labels[status] || status;
  };

  const tabs = [
    { id: 'overview', label: 'نمای کلی', icon: BarChart3 },
    { id: 'tasks', label: 'وظایف', icon: CheckSquare },
    { id: 'timesheets', label: 'زمان‌بندی', icon: Clock },
    { id: 'milestones', label: 'نقاط عطف', icon: Target },
    { id: 'files', label: 'فایل‌ها', icon: FolderOpen },
    { id: 'discussions', label: 'مکالمات', icon: MessageSquare },
    { id: 'gantt', label: 'گانت', icon: BarChart3 },
    { id: 'tickets', label: 'تیکت‌ها', icon: HelpCircle },
    { id: 'contracts', label: 'قراردادها', icon: FileSignature },
    { id: 'sales', label: 'فروش', icon: TrendingUp },
    { id: 'notes', label: 'یادداشت‌ها', icon: StickyNote },
    { id: 'activity', label: 'فعالیت', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/80 border-b border-white/40 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate('/projects')}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors backdrop-blur-sm bg-white/50 dark:bg-neutral-800/50 p-2 rounded-lg hover:bg-white/70 dark:hover:bg-neutral-800/70"
                >
                  <ArrowRight size={20} />
                </button>
                <div className="flex-1 min-w-[250px] max-w-[350px]">
                  <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {project.name}
                  </h1>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${getStatusColor(project.status)} border border-white/30 shadow-sm`}>
                  {getStatusLabel(project.status)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setShowTaskModal(true);
                  setEditingTask(null);
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                وظیفه جدید
              </button>
              <button className="btn btn-secondary flex items-center gap-2">
                <FileText size={18} />
                فاکتور پروژه
              </button>
              <div className="relative">
                <button className="btn btn-secondary px-3 py-2">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">پیشرفت پروژه {progress}%</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-neutral-800 backdrop-blur-sm text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-500 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 backdrop-blur-sm'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="glass-card relative">
            {/* Vertical Divider */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px bg-neutral-300 dark:bg-neutral-700 transform -translate-x-1/2 z-10" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-6 gap-x-12">
              {/* Left Column - Project Overview Details */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">جزئیات پروژه</h2>
                  <button className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300">
                    <FileText size={16} />
                  </button>
                </div>

                {/* Project Details List */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">شماره پروژه</dt>
                    <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">#{project.id}</dd>
                  </div>

                  <div className="sm:col-span-1">
                    <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">مشتری</dt>
                    <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                      {project.account_name || '-'}
                    </dd>
                  </div>

                  <div className="sm:col-span-1">
                    <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">نوع فاکتور</dt>
                    <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">نرخ ثابت</dd>
                  </div>

                  <div className="sm:col-span-1">
                    <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">وضعیت</dt>
                    <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                      {project.status === 'planning' ? 'برنامه‌ریزی' :
                       project.status === 'active' ? 'در حال انجام' :
                       project.status === 'on_hold' ? 'متوقف' :
                       project.status === 'completed' ? 'تکمیل شده' :
                       'لغو شده'}
                    </dd>
                  </div>

                  <div className="sm:col-span-1">
                    <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">تاریخ ایجاد</dt>
                    <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{toJalali(project.created_at)}</dd>
                  </div>

                  <div className="sm:col-span-1">
                    <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">تاریخ شروع</dt>
                    <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                      {project.start_date ? toJalali(project.start_date) : '-'}
                    </dd>
                  </div>

                  {project.end_date && (
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">مهلت</dt>
                      <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{toJalali(project.end_date)}</dd>
                    </div>
                  )}

                  <div className="sm:col-span-1">
                    <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">ساعات ثبت شده کل</dt>
                    <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{totalHours.toFixed(2)} ساعت</dd>
                  </div>

                  {project.budget && (
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400">نرخ کل</dt>
                      <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                        {new Intl.NumberFormat('fa-IR').format(project.budget)} تومان
                      </dd>
                    </div>
                  )}

                  {project.tags && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-normal text-neutral-500 dark:text-neutral-400 mb-2">تگ‌ها</dt>
                      <dd className="mt-1 flex flex-wrap gap-2">
                        {project.tags.split(',').map((tag: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full text-sm border border-neutral-200 dark:border-neutral-700 shadow-sm">
                            {tag.trim()}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}

                  {project.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">توضیحات</dt>
                      <dd className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                        {project.description}
                      </dd>
                    </div>
                  )}

                  {/* Settlements Checkboxes */}
                  {project.settlements && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">تسویه‌ها</dt>
                      <dd className="mt-1">
                        <SettlementsCheckboxes projectId={project.id} initialSettlements={project.settlements} />
                      </dd>
                    </div>
                  )}

                  {/* Payment Stages */}
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">پرداخت‌های مرحله‌ای</dt>
                    <dd className="mt-1 space-y-3">
                      {[1, 2, 3, 4].map((stage) => (
                        <div key={stage} className="flex items-center gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                          <div className="flex-1">
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">مرحله {stage}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={project[`payment_stage_${stage}`] || ''}
                                onChange={(e) => {
                                  const value = e.target.value ? parseFloat(e.target.value) : null;
                                  updateProjectMutation.mutate({
                                    [`payment_stage_${stage}`]: value,
                                  });
                                }}
                                placeholder="مبلغ (تومان)"
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                              />
                              <span className="text-xs text-gray-500">تومان</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">تاریخ</label>
                            <JalaliDatePicker
                              value={project[`payment_stage_${stage}_date`] || ''}
                              onChange={(date) => {
                                updateProjectMutation.mutate({
                                  [`payment_stage_${stage}_date`]: date || null,
                                });
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Right Column - Summary & Charts */}
              <div className="space-y-8">
                {/* Project Name */}
                <div>
                  <h4 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-4">{project.name}</h4>
                  
                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Open Tasks Card */}
                    <div className="card">
                      <p className="text-neutral-700 dark:text-neutral-300 font-semibold mb-1 text-sm">
                        <span dir="ltr">{completedTasks} / {totalTasks}</span> وظایف باز
                      </p>
                      <p className="text-neutral-400 dark:text-neutral-500 font-normal mb-0 text-sm">{progress}%</p>
                      <div className="mt-1">
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-success-500 to-success-600 dark:from-success-400 dark:to-success-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Days Left Card */}
                    {endDate && (
                      <div className="card">
                        <p className="text-neutral-700 dark:text-neutral-300 font-semibold mb-1 text-sm">
                          <span dir="ltr">{daysLeft > 0 ? `${daysLeft} / ${totalDays}` : '0'}</span> روز باقی مانده
                        </p>
                        <p className="text-neutral-400 dark:text-neutral-500 font-normal mb-0 text-sm">{daysProgress}%</p>
                        <div className="mt-1">
                          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                daysLeft > 0 
                                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500' 
                                  : 'bg-gradient-to-r from-danger-500 to-danger-600 dark:from-danger-400 dark:to-danger-500'
                              }`}
                              style={{ width: `${Math.min(daysProgress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 className="text-sm text-gray-600 mb-3 flex items-center gap-1.5">
                    <FileText size={16} />
                    هزینه‌ها
                  </h4>
                  <div className="card">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="mb-0.5 text-sm text-neutral-500 dark:text-neutral-400">کل هزینه‌ها</p>
                        <p className="font-medium text-sm mb-0 text-neutral-700 dark:text-neutral-300">
                          {new Intl.NumberFormat('fa-IR').format(totalExpenses)} تومان
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-sm text-primary-600 dark:text-primary-400">قابل فاکتور</p>
                        <p className="font-medium text-sm mb-0 text-primary-700 dark:text-primary-300">
                          {new Intl.NumberFormat('fa-IR').format(billableExpenses)} تومان
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-sm text-success-600 dark:text-success-400">فاکتور شده</p>
                        <p className="font-medium text-sm mb-0 text-success-700 dark:text-success-300">
                          {new Intl.NumberFormat('fa-IR').format(billedExpenses)} تومان
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-sm text-danger-600 dark:text-danger-400">فاکتور نشده</p>
                        <p className="font-medium text-sm mb-0 text-danger-700 dark:text-danger-300">
                          {new Intl.NumberFormat('fa-IR').format(unbilledExpenses)} تومان
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Logged Hours Chart */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
                      <Clock size={16} />
                      ساعات ثبت شده کل
                    </h4>
                    <select className="text-sm input">
                      <option>این هفته</option>
                      <option>هفته گذشته</option>
                      <option>این ماه</option>
                      <option>ماه گذشته</option>
                    </select>
                  </div>
                  <div className="card p-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Task Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <div className="text-sm text-gray-600 mb-1">انجام نشده</div>
                <div className="text-2xl font-bold text-gray-700">{notStartedTasks}</div>
                <div className="text-xs text-gray-500 mt-1">وظایف من: {notStartedTasks}</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">در حال انجام</div>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{inProgressTasks}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">وظایف من: {inProgressTasks}</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-sm text-gray-600 mb-1">در انتظار بازخورد</div>
                <div className="text-2xl font-bold text-warning-600 dark:text-warning-400">{reviewTasks}</div>
                <div className="text-xs text-gray-500 mt-1">وظایف من: {reviewTasks}</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-sm text-gray-600 mb-1">تکمیل شده</div>
                <div className="text-2xl font-bold text-success-600 dark:text-success-400">{completedTasks}</div>
                <div className="text-xs text-gray-500 mt-1">وظایف من: {completedTasks}</div>
              </div>
            </div>

            {/* Filters and Actions */}
            <div className="glass-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="todo">انجام نشده</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="review">در حال بررسی</option>
                    <option value="done">تکمیل شده</option>
                  </select>
                  <input
                    type="text"
                    placeholder="جستجو در وظایف..."
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    className="input text-sm flex-1 max-w-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setShowTaskModal(true);
                    }}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Plus size={18} />
                    افزودن وظیفه
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="glass-card overflow-x-auto">
              {filteredTasks.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="text-right p-4 text-sm font-medium text-gray-700">#</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-700">نام</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-700">اختصاص داده شده به</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-700">تگ‌ها</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-700">اولویت</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-700">تایمر</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-700">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task: any, idx: number) => (
                      <tr key={task.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">#{task.id}</td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-neutral-700 dark:text-neutral-300">{task.title}</div>
                            {task.description && (
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">{task.description}</div>
                            )}
                            {task.due_date && (
                              <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">مهلت: {toJalali(task.due_date)}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                          {task.assigned_to_name || '-'}
                        </td>
                        <td className="p-4">
                          {task.tags ? (
                            <div className="flex flex-wrap gap-1">
                              {task.tags.split(',').slice(0, 2).map((tag: string, tagIdx: number) => (
                                <span key={tagIdx} className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.priority === 'urgent' ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300' :
                            task.priority === 'high' ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300' :
                            task.priority === 'medium' ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300' :
                            'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}>
                            {task.priority === 'urgent' ? 'فوری' :
                             task.priority === 'high' ? 'بالا' :
                             task.priority === 'medium' ? 'متوسط' : 'پایین'}
                          </span>
                        </td>
                        <td className="p-4">
                          <TaskTimer taskId={task.id} />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setShowTaskModal(true);
                              }}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('آیا از حذف این وظیفه اطمینان دارید؟')) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                  {taskSearch || taskFilter !== 'all' ? 'وظیفه‌ای با این فیلتر یافت نشد' : 'وظیفه‌ای یافت نشد'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">نقاط عطف</h2>
              <button
                onClick={() => {/* TODO: Add milestone modal */}}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                افزودن نقطه عطف
              </button>
            </div>
            {project.milestones && project.milestones.length > 0 ? (
              <div className="space-y-3">
                {project.milestones.map((milestone: any) => (
                  <div key={milestone.id} className="card p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{milestone.name}</h3>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                        )}
                        {milestone.target_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            تاریخ هدف: {toJalali(milestone.target_date)}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        milestone.status === 'completed' ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300' :
                        milestone.status === 'in_progress' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' :
                        'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {milestone.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">نقطه عطفی یافت نشد</div>
            )}
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">مکالمات</h2>
              <button
                onClick={() => setShowDiscussionModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                افزودن مکالمه
              </button>
            </div>
            {project.discussions && project.discussions.length > 0 ? (
              <div className="space-y-3">
                {project.discussions.map((discussion: any) => {
                  const isAdmin = discussion.role === 'admin' || discussion.user_role === 'admin';
                  return (
                    <div 
                      key={discussion.id} 
                      className={`card p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all border-r-4 ${
                        isAdmin 
                          ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/20' 
                          : 'border-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {isAdmin ? (
                            <Shield size={16} className="text-primary-600 dark:text-primary-400" />
                          ) : (
                            <User size={16} className="text-neutral-600 dark:text-neutral-400" />
                          )}
                          <span className="font-medium">{discussion.full_name || discussion.username}</span>
                          {isAdmin && (
                            <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
                              ادمین
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{toJalali(discussion.created_at)}</span>
                      </div>
                      <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{discussion.message}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">مکالمه‌ای یافت نشد</div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">فایل‌ها</h2>
              <button
                onClick={() => {/* TODO: Add file upload modal */}}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                افزودن فایل
              </button>
            </div>
            {project.files && project.files.length > 0 ? (
              <div className="space-y-2">
                {project.files.map((file: any) => (
                  <div key={file.id} className="card p-3 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-gray-400" />
                      <span>{file.file_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{toJalali(file.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">فایلی یافت نشد</div>
            )}
          </div>
        )}

        {/* Timesheets Tab */}
        {activeTab === 'timesheets' && (
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 text-primary-600 dark:text-primary-400">زمان‌بندی</h2>
            {allTimeLogs.length > 0 ? (
              <div className="space-y-3">
                {allTimeLogs.map((log: any, idx: number) => (
                  <div key={idx} className="card p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{log.task_title}</h3>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                          <span>مدت زمان: {(log.duration_minutes / 60).toFixed(2)} ساعت</span>
                          {log.start_time && (
                            <span>شروع: {toJalali(log.start_time)}</span>
                          )}
                          {log.end_time && (
                            <span>پایان: {toJalali(log.end_time)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">زمان‌بندی ثبت نشده است</div>
            )}
          </div>
        )}

        {activeTab === 'gantt' && (
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 text-primary-600 dark:text-primary-400">نمودار گانت</h2>
            <div className="space-y-4">
              {/* Milestones */}
              {project.milestones && project.milestones.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">نقاط عطف</h3>
                  <div className="space-y-2">
                    {project.milestones.map((milestone: any) => (
                      <div key={milestone.id} className="card p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{milestone.name}</span>
                          {milestone.target_date && (
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">{toJalali(milestone.target_date)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Timeline */}
              {project.tasks && project.tasks.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">وظایف</h3>
                  <div className="space-y-2">
                    {project.tasks.map((task: any) => (
                      <div key={task.id} className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{task.title}</span>
                          <div className="flex gap-2 text-sm text-gray-600">
                            {task.start_date && <span>شروع: {toJalali(task.start_date)}</span>}
                            {task.due_date && <span>مهلت: {toJalali(task.due_date)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!project.milestones || project.milestones.length === 0) && 
               (!project.tasks || project.tasks.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  برای نمایش نمودار گانت، لطفاً وظایف یا نقاط عطف ایجاد کنید.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">تیکت‌های پروژه</h2>
              <button
                onClick={() => navigate('/tickets')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                افزودن تیکت
              </button>
            </div>
            {projectTickets && projectTickets.length > 0 ? (
              <div className="space-y-3">
                {projectTickets.map((ticket: any) => (
                  <div key={ticket.id} className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4 hover:bg-white/70 transition-all shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{ticket.subject}</h3>
                        {ticket.description && (
                          <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>وضعیت: {ticket.status}</span>
                          <span>اولویت: {ticket.priority}</span>
                          {ticket.department_name && (
                            <span>دپارتمان: {ticket.department_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">تیکتی یافت نشد</div>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">قراردادهای پروژه</h2>
              <button
                onClick={() => navigate('/contracts')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                افزودن قرارداد
              </button>
            </div>
            {projectContracts && projectContracts.length > 0 ? (
              <div className="space-y-3">
                {projectContracts.map((contract: any) => (
                  <div key={contract.id} className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4 hover:bg-white/70 transition-all shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{contract.title}</h3>
                        {contract.description && (
                          <p className="text-sm text-gray-600 mt-1">{contract.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>وضعیت: {contract.status}</span>
                          {contract.start_date && (
                            <span>شروع: {toJalali(contract.start_date)}</span>
                          )}
                          {contract.end_date && (
                            <span>پایان: {toJalali(contract.end_date)}</span>
                          )}
                          {contract.value && (
                            <span>مبلغ: {new Intl.NumberFormat('fa-IR').format(contract.value)} تومان</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">قراردادی یافت نشد</div>
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">فروش</h2>
              <button
                onClick={() => navigate('/estimates')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                پیش‌فاکتور جدید
              </button>
            </div>
            {projectEstimates && projectEstimates.length > 0 ? (
              <div className="space-y-3">
                {projectEstimates.map((estimate: any) => (
                  <div key={estimate.id} className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4 hover:bg-white/70 transition-all shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">پیش‌فاکتور #{estimate.id}</h3>
                        {estimate.description && (
                          <p className="text-sm text-gray-600 mt-1">{estimate.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>وضعیت: {estimate.status}</span>
                          {estimate.amount && (
                            <span>مبلغ: {new Intl.NumberFormat('fa-IR').format(estimate.amount)} تومان</span>
                          )}
                          {estimate.created_at && (
                            <span>تاریخ: {toJalali(estimate.created_at)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const response = await api.get(`/estimates/${estimate.id}/pdf`, {
                                responseType: 'blob',
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `estimate-${estimate.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                            } catch (error: any) {
                              alert('خطا در دانلود PDF: ' + (error.response?.data?.error || error.message));
                            }
                          }}
                          className="text-primary-600 hover:text-primary-700 transition-colors p-1 rounded hover:bg-primary-50"
                          title="دانلود PDF"
                        >
                          <Download size={18} />
                        </button>
                        {estimate.invoice_id && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await api.get(`/invoices/${estimate.invoice_id}/pdf`, {
                                  responseType: 'blob',
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `invoice-${estimate.invoice_id}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              } catch (error: any) {
                                alert('خطا در دانلود فاکتور: ' + (error.response?.data?.error || error.message));
                              }
                            }}
                            className="text-success-600 hover:text-success-700 transition-colors p-1 rounded hover:bg-success-50"
                            title="دانلود فاکتور"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">پیش‌فاکتوری یافت نشد</div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="glass-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">یادداشت‌ها</h2>
              <button
                onClick={() => {/* TODO: Add note modal */}}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                افزودن یادداشت
              </button>
            </div>
            <div className="space-y-3">
              <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  برای افزودن یادداشت، از بخش توضیحات پروژه استفاده کنید یا یادداشت‌های خود را در بخش مکالمات ثبت کنید.
                </p>
              </div>
              {project.description && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4">
                  <h3 className="font-medium mb-2">توضیحات پروژه</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="glass-card">
            <h2 className="text-xl font-bold mb-4 text-primary-600 dark:text-primary-400">فعالیت‌ها</h2>
            <div className="space-y-3">
              {/* Project Created */}
              {project.created_at && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">پروژه ایجاد شد</p>
                      <p className="text-xs text-gray-500">{toJalali(project.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tasks Activity */}
              {project.tasks && project.tasks.length > 0 && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{project.tasks.length} وظیفه ایجاد شده</p>
                      <p className="text-xs text-gray-500">
                        {project.tasks.filter((t: any) => t.status === 'done').length} وظیفه تکمیل شده
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones Activity */}
              {project.milestones && project.milestones.length > 0 && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{project.milestones.length} نقطه عطف تعریف شده</p>
                      <p className="text-xs text-gray-500">
                        {project.milestones.filter((m: any) => m.status === 'completed').length} نقطه عطف تکمیل شده
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Discussions Activity */}
              {project.discussions && project.discussions.length > 0 && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{project.discussions.length} مکالمه ثبت شده</p>
                      <p className="text-xs text-gray-500">آخرین مکالمه: {toJalali(project.discussions[0]?.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              {(!project.created_at && (!project.tasks || project.tasks.length === 0) && 
                (!project.milestones || project.milestones.length === 0) && 
                (!project.discussions || project.discussions.length === 0)) && (
                <div className="text-center py-8 text-gray-500">فعالیتی ثبت نشده است</div>
              )}
            </div>
          </div>
        )}

        {/* Task Modal */}
            {showTaskModal && (
              <TaskModal
                task={editingTask}
                projectId={id}
                projectStatus={project?.status}
                users={users || []}
                onClose={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                onSave={(data: any) => {
                  if (editingTask) {
                    updateTaskMutation.mutate({ id: editingTask.id, data });
                  } else {
                    createTaskMutation.mutate(data);
                  }
                }}
              />
            )}

        {/* Discussion Modal */}
        {showDiscussionModal && (
          <DiscussionModal
            onClose={() => setShowDiscussionModal(false)}
            onSave={(data: any) => {
              createDiscussionMutation.mutate(data);
            }}
          />
        )}
      </div>
    </div>
  );
};

const TaskModal = ({ task, projectId, projectStatus, users, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    start_date: task?.start_date ? task.start_date.split('T')[0] : '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    assigned_to: task?.assigned_to || '',
    estimated_hours: task?.estimated_hours || '',
    tags: task?.tags || '',
    billable: task?.billable !== undefined ? task.billable : true,
    visible_to_customer: task?.visible_to_customer !== undefined ? task.visible_to_customer : false,
    public: task?.public !== undefined ? task.public : false,
    project_status: projectStatus || 'planning',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      ...formData,
      project_id: projectId,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours.toString()) : null,
    };
    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {task ? 'ویرایش وظیفه' : 'وظیفه جدید'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Visibility Options */}
          <div className="flex gap-4 pb-4 border-b">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.public}
                onChange={(e) => setFormData({ ...formData, public: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">عمومی</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.billable}
                onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">قابل فاکتور</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visible_to_customer}
                onChange={(e) => setFormData({ ...formData, visible_to_customer: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">قابل مشاهده برای مشتری</span>
            </label>
            <button type="button" className="text-sm text-blue-600 hover:text-blue-800">
              ضمیمه فایل
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">موضوع *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">نرخ ساعتی</label>
              <input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                className="input w-full"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نقطه عطف</label>
              <select className="input w-full">
                <option>انتخاب نقطه عطف</option>
              </select>
            </div>
            <div>
              <label className="label label-required">تاریخ شروع</label>
              <JalaliDatePicker
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                placeholder="تاریخ شروع را انتخاب کنید"
                required
              />
            </div>
            <div>
              <label className="label">تاریخ سررسید</label>
              <JalaliDatePicker
                value={formData.due_date}
                onChange={(value) => setFormData({ ...formData, due_date: value })}
                placeholder="تاریخ سررسید را انتخاب کنید"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">اولویت</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input w-full"
              >
                <option value="low">پایین</option>
                <option value="medium">متوسط</option>
                <option value="high">بالا</option>
                <option value="urgent">فوری</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">وضعیت پروژه</label>
              <select
                value={formData.project_status}
                onChange={(e) => setFormData({ ...formData, project_status: e.target.value })}
                className="input w-full"
              >
                <option value="planning">برنامه‌ریزی</option>
                <option value="active">فعال</option>
                <option value="on_hold">متوقف</option>
                <option value="completed">تکمیل شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">تکرار</label>
              <select className="input w-full">
                <option>هیچکدام</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">مرتبط با</label>
              <select className="input w-full">
                <option>پروژه</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">پروژه</label>
              <input
                type="text"
                value={`#${projectId}`}
                className="input w-full"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">اختصاص داده شده به</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="input w-full"
              >
                <option value="">انتخاب کاربر</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">دنبال‌کنندگان</label>
              <select className="input w-full">
                <option>هیچکدام</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">تگ‌ها</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="input w-full"
              placeholder="Tag"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">توضیحات وظیفه</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              rows={6}
              placeholder="افزودن توضیحات"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'به‌روزرسانی' : 'ایجاد'} وظیفه
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Task Timer Component
const TaskTimer = ({ taskId }: { taskId: number }) => {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentLogId, setCurrentLogId] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active time log
  const { data: activeLog } = useQuery(
    ['task-active-log', taskId],
    async () => {
      try {
        const response = await api.get(`/tasks/${taskId}/time-logs/active`);
        return response.data;
      } catch {
        return null;
      }
    },
    { refetchInterval: isRunning ? 1000 : false }
  );

  useEffect(() => {
    if (activeLog && activeLog.start_time) {
      setIsRunning(true);
      setCurrentLogId(activeLog.id);
      const startTime = new Date(activeLog.start_time).getTime();
      
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      setIsRunning(false);
      setElapsedSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeLog]);

  const startTimerMutation = useMutation(
    () => api.post(`/tasks/${taskId}/time-logs/start`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task-active-log', taskId]);
        setIsRunning(true);
      },
    }
  );

  const stopTimerMutation = useMutation(
    ({ logId, duration }: { logId: number; duration: number }) =>
      api.post(`/tasks/${taskId}/time-logs/${logId}/stop`, { duration_minutes: Math.floor(duration / 60) }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task-active-log', taskId]);
        queryClient.invalidateQueries(['project-detail']);
        setIsRunning(false);
        setElapsedSeconds(0);
        setCurrentLogId(null);
      },
    }
  );

  const addTimeMutation = useMutation(
    ({ minutes }: { minutes: number }) =>
      api.post(`/tasks/${taskId}/time-logs`, { duration_minutes: minutes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-detail']);
      },
    }
  );

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startTimerMutation.mutate();
  };

  const handleStop = () => {
    if (currentLogId && elapsedSeconds > 0) {
      stopTimerMutation.mutate({ logId: currentLogId, duration: elapsedSeconds });
    }
  };

  const handleQuickAdd = (minutes: number) => {
    addTimeMutation.mutate({ minutes });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {isRunning ? (
          <>
            <span className="text-sm font-mono text-blue-600">{formatTime(elapsedSeconds)}</span>
            <button
              onClick={handleStop}
              className="p-1 text-red-600 hover:text-red-800"
              title="توقف تایمر"
            >
              <Square size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleStart}
              className="p-1 text-green-600 hover:text-green-800"
              title="شروع تایمر"
            >
              <Play size={14} />
            </button>
            <div className="flex gap-1">
              {[5, 10, 15, 20, 25, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleQuickAdd(mins)}
                  className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                  title={`افزودن ${mins} دقیقه`}
                >
                  {mins}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="دقیقه"
              className="w-16 px-1 py-0.5 text-xs border rounded"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt((e.target as HTMLInputElement).value);
                  if (value > 0) {
                    handleQuickAdd(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Settlements Checkboxes Component
const SettlementsCheckboxes = ({ projectId, initialSettlements }: { projectId: number; initialSettlements: string }) => {
  const queryClient = useQueryClient();
  const [settlements, setSettlements] = useState(() => {
    try {
      return JSON.parse(initialSettlements || '{}');
    } catch {
      return { sadeghieh: false, soleimani: false };
    }
  });

  const updateMutation = useMutation(
    (data: { sadeghieh: boolean; soleimani: boolean }) => 
      api.put(`/projects/${projectId}`, { settlements: JSON.stringify(data) }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-detail', projectId]);
        alert('تسویه‌ها به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا در به‌روزرسانی تسویه‌ها: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleChange = (field: 'sadeghieh' | 'soleimani', checked: boolean) => {
    const newSettlements = { ...settlements, [field]: checked };
    setSettlements(newSettlements);
    updateMutation.mutate(newSettlements);
  };

  return (
    <div className="flex gap-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settlements.sadeghieh || false}
          onChange={(e) => handleChange('sadeghieh', e.target.checked)}
          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">صادقیه</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settlements.soleimani || false}
          onChange={(e) => handleChange('soleimani', e.target.checked)}
          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">سلیمانی</span>
      </label>
    </div>
  );
};

const DiscussionModal = ({ onClose, onSave }: any) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('لطفاً پیام خود را وارد کنید');
      return;
    }
    onSave({ message: message.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">افزودن مکالمه</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">پیام</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input"
              rows={6}
              placeholder="پیام خود را بنویسید..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary">
              ارسال
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectDetail;

