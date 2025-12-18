import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Target, CheckCircle, Clock, XCircle, TrendingUp, Calendar, BarChart3, Download, Search, Filter, AlertCircle, ChevronLeft, ChevronRight, Trash2, FileDown, Columns } from 'lucide-react';
import { toPersianNumber } from '../utils/numberHelper';
import KanbanBoard from '../components/KanbanBoard';
import AdvancedFilter from '../components/AdvancedFilter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  toJalali, 
  toJalaliFull, 
  formatDateForInput,
  getJalaliDayjs,
  getJalaliYear,
  getJalaliMonth,
  getDaysInJalaliMonth,
  getFirstDayOfJalaliMonth,
  getLastDayOfJalaliMonth,
  getJalaliDayOfWeek,
  jalaliMonthNames,
  jalaliWeekDays,
  jalaliToGregorian
} from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';

const Coaching = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kanban' | 'sessions' | 'goals' | 'exercises' | 'reports' | 'calendar' | 'programs' | 'templates' | 'feedback'>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'session' | 'goal' | 'exercise' | 'report' | 'program' | 'template' | 'feedback'>('session');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [clickedDate, setClickedDate] = useState<string | null>(null);

  const { data: customers } = useQuery('customers', async () => {
    // All customers default to coaching
    const response = await api.get('/customers');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  const { data: users } = useQuery('assignable-users', async () => {
    try {
      const response = await api.get('/users/assignable');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  });

  const { data: sessions } = useQuery(
    ['coaching-sessions', selectedCustomer, advancedFilters],
    async () => {
      const params = new URLSearchParams();
      if (selectedCustomer) params.append('customer_id', String(selectedCustomer));
      if (advancedFilters.status) params.append('status', advancedFilters.status);
      if (advancedFilters.dateFrom) params.append('start_date', advancedFilters.dateFrom);
      if (advancedFilters.dateTo) params.append('end_date', advancedFilters.dateTo);
      if (advancedFilters.coachId) params.append('coach_id', String(advancedFilters.coachId));
      
      const response = await api.get(`/coaching/sessions?${params.toString()}`);
      const data = response.data;
      const sessionsArray = Array.isArray(data) ? data : [];
      console.log('Fetched coaching sessions:', sessionsArray.length, sessionsArray);
      return sessionsArray;
    },
    {
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  );

  // Kanban data
  const { data: kanbanData } = useQuery(
    ['coaching-kanban'],
    async () => {
      const response = await api.get('/coaching/kanban');
      return response.data || {};
    },
    {
      enabled: activeTab === 'kanban',
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  );

  const { data: goals } = useQuery(
    ['coaching-goals', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/goals${params}`);
      const data = response.data;
      return Array.isArray(data) ? data : [];
    }
  );

  const { data: exercises } = useQuery(
    ['coaching-exercises', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/exercises${params}`);
      const data = response.data;
      return Array.isArray(data) ? data : [];
    }
  );

  const { data: reports } = useQuery(
    ['coaching-reports', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/reports${params}`);
      const data = response.data;
      return Array.isArray(data) ? data : [];
    }
  );

  // Dashboard stats
  const { data: dashboardStats } = useQuery(
    ['coaching-dashboard-stats', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/dashboard/stats${params}`);
      return response.data;
    }
  );

  // Upcoming sessions
  const { data: upcomingSessions } = useQuery(
    'coaching-upcoming-sessions',
    async () => {
      const response = await api.get('/coaching/sessions/upcoming?days=7');
      return Array.isArray(response.data) ? response.data : [];
    }
  );

  // Goals progress
  const { data: goalsProgress } = useQuery(
    ['coaching-goals-progress', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/goals/progress${params}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  );

  // Overdue exercises
  const { data: overdueExercises } = useQuery(
    ['coaching-overdue-exercises', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/exercises/overdue${params}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  );

  // Coaching Programs
  const { data: programs } = useQuery(
    ['coaching-programs', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/programs${params}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  );

  // Coaching Templates
  const { data: templates } = useQuery(
    'coaching-templates',
    async () => {
      const response = await api.get('/coaching/templates');
      return Array.isArray(response.data) ? response.data : [];
    }
  );

  // Coaching Feedback
  const { data: feedbacks } = useQuery(
    ['coaching-feedback', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/feedback${params}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  );

  // Delete mutations
  const deleteSessionMutation = useMutation(
    (id: number) => api.delete(`/coaching/sessions/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-sessions');
        queryClient.invalidateQueries('coaching-dashboard-stats');
        queryClient.invalidateQueries('coaching-upcoming-sessions');
        alert('جلسه با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف جلسه: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteGoalMutation = useMutation(
    (id: number) => api.delete(`/coaching/goals/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-goals');
        queryClient.invalidateQueries('coaching-goals-progress');
        queryClient.invalidateQueries('coaching-dashboard-stats');
        alert('هدف با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف هدف: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteExerciseMutation = useMutation(
    (id: number) => api.delete(`/coaching/exercises/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-exercises');
        queryClient.invalidateQueries('coaching-overdue-exercises');
        queryClient.invalidateQueries('coaching-dashboard-stats');
        alert('تمرین با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف تمرین: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteReportMutation = useMutation(
    (id: number) => api.delete(`/coaching/reports/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-reports');
        alert('گزارش با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف گزارش: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteProgramMutation = useMutation(
    (id: number) => api.delete(`/coaching/programs/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-programs');
        alert('برنامه با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف برنامه: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteTemplateMutation = useMutation(
    (id: number) => api.delete(`/coaching/templates/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-templates');
        alert('قالب با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف قالب: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteFeedbackMutation = useMutation(
    (id: number) => api.delete(`/coaching/feedback/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-feedback');
        alert('بازخورد با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف بازخورد: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleDelete = (type: 'session' | 'goal' | 'exercise' | 'report' | 'program' | 'template' | 'feedback', id: number) => {
    if (!confirm('آیا از حذف این مورد اطمینان دارید؟')) return;
    
    if (type === 'session') {
      deleteSessionMutation.mutate(id);
    } else if (type === 'goal') {
      deleteGoalMutation.mutate(id);
    } else if (type === 'exercise') {
      deleteExerciseMutation.mutate(id);
    } else if (type === 'report') {
      deleteReportMutation.mutate(id);
    } else if (type === 'program') {
      deleteProgramMutation.mutate(id);
    } else if (type === 'template') {
      deleteTemplateMutation.mutate(id);
    } else if (type === 'feedback') {
      deleteFeedbackMutation.mutate(id);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'داشبورد', icon: BarChart3 },
    { id: 'kanban', label: 'برد کوچینگ', icon: Columns },
    { id: 'calendar', label: 'تقویم', icon: Calendar },
    { id: 'sessions', label: 'جلسات کوچینگ', icon: Clock },
    { id: 'goals', label: 'اهداف (KPI/OKR)', icon: Target },
    { id: 'exercises', label: 'تمرین‌ها', icon: CheckCircle },
    { id: 'reports', label: 'گزارش رشد', icon: TrendingUp },
    { id: 'programs', label: 'برنامه‌ها', icon: Target },
    { id: 'templates', label: 'قالب‌ها', icon: Download },
    { id: 'feedback', label: 'بازخورد', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pt-[50px] pb-[50px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-neutral-100">ماژول کوچینگ</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <select
            value={selectedCustomer || ''}
            onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
            className="input w-full sm:w-64"
          >
            <option value="">همه مشتریان</option>
            {Array.isArray(customers) && customers.map((customer: any) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">افزودن {tabs.find(t => t.id === activeTab)?.label}</span>
            <span className="sm:hidden">افزودن</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto overflow-y-hidden scrollbar-hide -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'sessions') setModalType('session');
                else if (tab.id === 'goals') setModalType('goal');
                else if (tab.id === 'exercises') setModalType('exercise');
                else if (tab.id === 'reports') setModalType('report');
                else if (tab.id === 'programs') setModalType('program');
                else if (tab.id === 'templates') setModalType('template');
                else if (tab.id === 'feedback') setModalType('feedback');
              }}
              className={`flex items-center justify-start gap-2 px-3 sm:px-6 py-6 border-b-2 border-t-0 border-r-0 border-l-0 transition-colors whitespace-nowrap flex-shrink-0 rounded-[10px] ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 bg-[#EDEDED]'
                  : 'border-transparent text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200'
              }`}
            >
              <Icon size={18} className="sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="card min-h-0 flex flex-col">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={dashboardStats}
            upcomingSessions={upcomingSessions}
            goalsProgress={goalsProgress}
            overdueExercises={overdueExercises}
            customers={customers}
            onSessionClick={(session: any) => {
              setEditingItem(session);
              setModalType('session');
              setShowModal(true);
            }}
            onGoalClick={(goal: any) => {
              setEditingItem(goal);
              setModalType('goal');
              setShowModal(true);
            }}
            onExerciseClick={(exercise: any) => {
              setEditingItem(exercise);
              setModalType('exercise');
              setShowModal(true);
            }}
          />
        )}

        {activeTab === 'kanban' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <h2 className="text-xl font-bold">برد کوچینگ - مدیریت جلسات</h2>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setModalType('session');
                  setShowModal(true);
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                جلسه جدید
              </button>
            </div>
            {kanbanData ? (
              <KanbanBoard
                sessions={kanbanData}
                onEdit={(session) => {
                  setEditingItem(session);
                  setModalType('session');
                  setShowModal(true);
                }}
              />
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-neutral-400">در حال بارگذاری...</div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            sessions={sessions}
            customers={customers}
            onSessionClick={(session: any) => {
              setEditingItem(session);
              setClickedDate(null);
              setModalType('session');
              setShowModal(true);
            }}
            onCreateSession={(date: string) => {
              setEditingItem(null);
              setClickedDate(date);
              setModalType('session');
              setShowModal(true);
            }}
          />
        )}

        {activeTab === 'sessions' && (
          <>
            <div className="mb-4 flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-neutral-500" size={20} />
                <input
                  type="text"
                  placeholder="جستجو در جلسات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pr-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">همه وضعیت‌ها</option>
                <option value="scheduled">زمان‌بندی شده</option>
                <option value="completed">تکمیل شده</option>
                <option value="cancelled">لغو شده</option>
                <option value="rescheduled">زمان‌بندی مجدد</option>
              </select>
              <AdvancedFilter
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                filterConfig={{
                  dateRange: true,
                  status: { label: 'وضعیت جلسه', options: [
                    { value: 'scheduled', label: 'زمان‌بندی شده' },
                    { value: 'completed', label: 'تکمیل شده' },
                    { value: 'cancelled', label: 'لغو شده' },
                    { value: 'rescheduled', label: 'زمان‌بندی مجدد' },
                  ]},
                  user: users ? {
                    label: 'کوچ',
                    options: users.filter((u: any) => u.role === 'coach' || u.role === 'admin').map((u: any) => ({
                      value: u.id,
                      label: u.username || u.full_name || u.email,
                    })),
                  } : undefined,
                }}
              />
            </div>
            <SessionsList
              sessions={sessions}
              customers={customers}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onEdit={(session: any) => {
                setEditingItem(session);
                setModalType('session');
                setShowModal(true);
              }}
              onDelete={handleDelete}
            />
          </>
        )}

        {activeTab === 'goals' && (
          <GoalsList
            goals={goals}
            customers={customers}
            onEdit={(goal: any) => {
              setEditingItem(goal);
              setModalType('goal');
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'exercises' && (
          <ExercisesList
            exercises={exercises}
            goals={goals}
            customers={customers}
            onEdit={(exercise: any) => {
              setEditingItem(exercise);
              setModalType('exercise');
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsList
            reports={reports}
            customers={customers}
            onEdit={(report: any) => {
              setEditingItem(report);
              setModalType('report');
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'programs' && (
          <ProgramsList
            programs={programs}
            customers={customers}
            onEdit={(program: any) => {
              setEditingItem(program);
              setModalType('program');
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesList
            templates={templates}
            onEdit={(template: any) => {
              setEditingItem(template);
              setModalType('template');
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackList
            feedbacks={feedbacks}
            customers={customers}
            sessions={sessions}
            onEdit={(feedback: any) => {
              setEditingItem(feedback);
              setModalType('feedback');
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CoachingModal
          type={modalType}
          item={editingItem}
          customers={customers}
          goals={goals}
          sessions={sessions}
          clickedDate={clickedDate}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
            setClickedDate(null);
          }}
        />
      )}
    </div>
  );
};

const SessionsList = ({ sessions, customers, onEdit, onDelete, searchTerm, statusFilter }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  let sessionsArray = Array.isArray(sessions) ? sessions : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };
  
  // Apply filters
  if (searchTerm) {
    sessionsArray = sessionsArray.filter((session: any) => {
      const customerName = getCustomerName(session.customer_id);
      return customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (session.notes && session.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }
  if (statusFilter) {
    sessionsArray = sessionsArray.filter((session: any) => session.status === statusFilter);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="space-y-4 pb-4">
          {sessionsArray.map((session: any) => {
        const customColor = session.color;
        const statusColorClass = customColor ? '' : getStatusColor(session.status);
        return (
        <div 
          key={session.id} 
          className={`border-2 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all ${statusColorClass}`}
          style={customColor ? {
            backgroundColor: `${customColor}20`,
            borderColor: customColor
          } : {}}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <span className="font-bold text-base sm:text-lg break-words">{getCustomerName(session.customer_id)}</span>
                <span 
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColorClass}`}
                  style={customColor ? {
                    backgroundColor: customColor,
                    borderColor: customColor,
                    color: '#ffffff'
                  } : {}}
                >
                  {session.status === 'completed' ? 'تکمیل شده' : 
                   session.status === 'scheduled' ? 'زمان‌بندی شده' :
                   session.status === 'cancelled' ? 'لغو شده' : 'زمان‌بندی مجدد'}
                </span>
                {session.session_type && (
                  <span className="px-2 py-1 bg-white dark:bg-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100">
                    {session.session_type === 'online' ? '🌐 آنلاین' : '👥 حضوری'}
                  </span>
                )}
                {session.rating && (
                  <span className="px-2 py-1 bg-white dark:bg-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100">
                    ⭐ {toPersianNumber(session.rating)}/۵
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-700 dark:text-neutral-300 mb-2">
                <span className="whitespace-nowrap">📅 {toJalali(session.session_date)}</span>
                {session.duration && (
                  <span>⏱️ {session.duration} دقیقه</span>
                )}
                {session.meeting_link && (
                  <a
                    href={session.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    🔗 لینک جلسه
                  </a>
                )}
              </div>
              {session.notes && (
                <p className="text-gray-800 bg-white/50 rounded p-2 mt-2">{session.notes}</p>
              )}
              {session.tags && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {session.tags.split(',').map((tag: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-white/70 rounded text-xs">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(session)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('session', session.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
        );
      })}
      {sessionsArray.length === 0 && (
        <div className="text-center py-12 text-gray-500">جلسه‌ای ثبت نشده است</div>
      )}
        </div>
      </div>
    </div>
  );
};

const GoalsList = ({ goals, customers, onEdit, onDelete }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const goalsArray = Array.isArray(goals) ? goals : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getProgress = (goal: any) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  // Prepare chart data for goals progress
  const chartData = goalsArray
    .filter((goal: any) => goal.target_value && goal.current_value !== undefined)
    .map((goal: any) => {
      const progress = getProgress(goal);
      return {
        name: goal.title.length > 15 ? goal.title.substring(0, 15) + '...' : goal.title,
        'پیشرفت (%)': Math.round(progress),
        'هدف': goal.target_value,
        'فعلی': goal.current_value,
      };
    });

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">نمودار پیشرفت اهداف</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <ChartTooltip />
              <Legend />
              <Bar dataKey="پیشرفت (%)" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {goalsArray.map((goal: any) => {
        const progress = getProgress(goal);
        return (
          <div key={goal.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-lg">{goal.title}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    goal.type === 'kpi' ? 'bg-purple-100 text-purple-700' : 
                    goal.is_kr ? 'bg-blue-100 text-blue-700' : 
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {goal.type === 'okr' ? (goal.is_kr ? 'KR (Key Result)' : 'OKR (Objective)') : 'KPI'}
                  </span>
                  {goal.is_kr && goal.okr_id && (
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                      مرتبط با OKR
                    </span>
                  )}
                  <span className="text-sm text-gray-600">
                    {getCustomerName(goal.customer_id)}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-gray-700 mb-2">{goal.description}</p>
                )}
                {goal.target_value && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        {goal.current_value} / {goal.target_value} {goal.unit || ''}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(goal)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="ویرایش"
                >
                  ✏️ ویرایش
                </button>
                <button
                  onClick={() => onDelete('goal', goal.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {goalsArray.length === 0 && (
        <div className="text-center py-12 text-gray-500">هدفی ثبت نشده است</div>
      )}
    </div>
  );
};

const ExercisesList = ({ exercises, goals, customers, onEdit, onDelete }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const goalsArray = Array.isArray(goals) ? goals : [];
  const exercisesArray = Array.isArray(exercises) ? exercises : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getGoalTitle = (id: number) => {
    return goalsArray.find((g: any) => g.id === id)?.title || 'بدون هدف';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="space-y-4 pb-4">
          {exercisesArray.map((exercise: any) => (
            <div key={exercise.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                <div className="flex-1 w-full min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <span className="font-medium text-base sm:text-lg break-words">{exercise.title}</span>
                    <span className={`px-2 py-1 rounded text-xs sm:text-sm whitespace-nowrap ${getStatusColor(exercise.status)}`}>
                      {exercise.status}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                    <span className="whitespace-nowrap">مشتری: {getCustomerName(exercise.customer_id)}</span>
                    {exercise.goal_id && (
                      <span className="whitespace-nowrap">هدف: {getGoalTitle(exercise.goal_id)}</span>
                    )}
                    {exercise.due_date && (
                      <span className="whitespace-nowrap">مهلت: {toJalali(exercise.due_date)}</span>
                    )}
                  </div>
                  {exercise.description && (
                    <p className="text-sm sm:text-base text-gray-700 mb-2 break-words">{exercise.description}</p>
                  )}
                  {exercise.instructions && (
                    <div className="mt-2 p-2 sm:p-3 bg-gray-50 rounded">
                      <p className="text-xs sm:text-sm font-medium mb-1">دستورالعمل:</p>
                      <p className="text-xs sm:text-sm text-gray-700 break-words whitespace-pre-wrap">{exercise.instructions}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 self-end sm:self-start flex-shrink-0">
                  <button
                    onClick={() => onEdit(exercise)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors text-xs sm:text-sm whitespace-nowrap"
                    title="ویرایش"
                  >
                    <span className="hidden sm:inline">✏️ ویرایش</span>
                    <span className="sm:hidden">✏️</span>
                  </button>
                  <button
                    onClick={() => onDelete('exercise', exercise.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {exercisesArray.length === 0 && (
            <div className="text-center py-12 text-gray-500">تمرینی ثبت نشده است</div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportsList = ({ reports, customers, onEdit, onDelete }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const reportsArray = Array.isArray(reports) ? reports : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const handleExportExcel = () => {
    const data = reportsArray.map((report: any) => ({
      'مشتری': getCustomerName(report.customer_id),
      'تاریخ گزارش': toJalali(report.report_date),
      'نمره کلی': report.overall_score || '',
      'دستاوردها': report.achievements || '',
      'چالش‌ها': report.challenges || '',
      'مراحل بعدی': report.next_steps || '',
    }));

    // Create CSV
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map((row: Record<string, any>) => headers.map((header: string) => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `گزارش_کوچینگ_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportExcel}
          className="btn btn-secondary flex items-center gap-2"
        >
          <FileDown size={18} />
          خروجی Excel
        </button>
      </div>
      {reportsArray.map((report: any) => (
        <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium">{getCustomerName(report.customer_id)}</span>
                <span className="text-sm text-gray-600">
                  {toJalali(report.report_date)}
                </span>
                {report.overall_score && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded">
                    نمره کلی: {report.overall_score}
                  </span>
                )}
              </div>
              {report.achievements && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-green-700 mb-1">دستاوردها:</p>
                  <p className="text-gray-700">{report.achievements}</p>
                </div>
              )}
              {report.challenges && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-yellow-700 mb-1">چالش‌ها:</p>
                  <p className="text-gray-700">{report.challenges}</p>
                </div>
              )}
              {report.next_steps && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">مراحل بعدی:</p>
                  <p className="text-gray-700">{report.next_steps}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(report)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('report', report.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {reportsArray.length === 0 && (
        <div className="text-center py-12 text-gray-500">گزارشی ثبت نشده است</div>
      )}
    </div>
  );
};

const CoachingModal = ({ type, item, customers, goals, sessions, clickedDate: propClickedDate, onClose }: any) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const clickedDate = propClickedDate || null;

  // 7 رنگ برای انتخاب
  const eventColors = [
    { name: 'بنفش', value: '#6366F1', bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-300' },
    { name: 'آبی', value: '#3B82F6', bg: 'bg-info-100', text: 'text-info-700', border: 'border-info-300' },
    { name: 'سبز', value: '#10B981', bg: 'bg-success-100', text: 'text-success-700', border: 'border-success-300' },
    { name: 'زرد', value: '#F59E0B', bg: 'bg-warning-100', text: 'text-warning-700', border: 'border-warning-300' },
    { name: 'قرمز', value: '#EF4444', bg: 'bg-danger-100', text: 'text-danger-700', border: 'border-danger-300' },
    { name: 'نارنجی', value: '#F97316', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    { name: 'صورتی', value: '#EC4899', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  ];

  const getJalaliDateString = (dateStr: string | null | undefined): string => {
    if (!dateStr) {
      if (clickedDate) {
        const jalaliDate = getJalaliDayjs(clickedDate);
        return `${jalaliDate.year()}-${String(jalaliDate.month() + 1).padStart(2, '0')}-${String(jalaliDate.date()).padStart(2, '0')}`;
      }
      return formatDateForInput(new Date());
    }
    try {
      const datePart = dateStr.split('T')[0];
      const year = parseInt(datePart.split('-')[0]);
      if (year >= 1900 && year <= 2100) {
        const jalaliDate = getJalaliDayjs(datePart);
        return `${jalaliDate.year()}-${String(jalaliDate.month() + 1).padStart(2, '0')}-${String(jalaliDate.date()).padStart(2, '0')}`;
      }
      return datePart;
    } catch (err) {
      return formatDateForInput(new Date());
    }
  };

  const [formData, setFormData] = useState<any>(() => {
    if (type === 'session') {
      const initialDate = clickedDate || item?.session_date || formatDateForInput(new Date());
      return {
        customer_id: item?.customer_id || '',
        coach_id: item?.coach_id || user?.id || '',
        session_date: getJalaliDateString(initialDate),
        duration: item?.duration || '',
        notes: item?.notes || '',
        status: item?.status || 'scheduled',
        session_type: item?.session_type || null,
        meeting_link: item?.meeting_link || null,
        attendance: item?.attendance || null,
        rating: item?.rating || null,
        tags: item?.tags || null,
        color: item?.color || eventColors[0].value,
      };
    } else if (type === 'goal') {
      return {
        customer_id: item?.customer_id || '',
        title: item?.title || '',
        description: item?.description || '',
        type: item?.type || 'kpi',
        is_kr: item?.is_kr || false,
        okr_id: item?.okr_id || null,
        target_value: item?.target_value || '',
        current_value: item?.current_value || 0,
        unit: item?.unit || '',
        deadline: item?.deadline || '',
        status: item?.status || 'active',
      };
    } else if (type === 'exercise') {
      return {
        customer_id: item?.customer_id || '',
        goal_id: item?.goal_id || '',
        title: item?.title || '',
        description: item?.description || '',
        instructions: item?.instructions || '',
        due_date: item?.due_date || '',
        status: item?.status || 'pending',
      };
    } else if (type === 'report') {
      return {
        customer_id: item?.customer_id || '',
        report_date: item?.report_date || formatDateForInput(new Date()),
        achievements: item?.achievements || '',
        challenges: item?.challenges || '',
        next_steps: item?.next_steps || '',
        overall_score: item?.overall_score || '',
      };
    } else if (type === 'program') {
      return {
        customer_id: item?.customer_id || '',
        title: item?.title || '',
        description: item?.description || '',
        start_date: item?.start_date ? getJalaliDateString(item.start_date) : formatDateForInput(new Date()),
        end_date: item?.end_date ? getJalaliDateString(item.end_date) : '',
        status: item?.status || 'active',
      };
    } else if (type === 'template') {
      return {
        name: item?.name || '',
        type: item?.type || 'goal',
        content: item?.content ? (typeof item.content === 'string' ? JSON.parse(item.content) : item.content) : {},
        is_default: item?.is_default || 0,
      };
    } else if (type === 'feedback') {
      return {
        customer_id: item?.customer_id || '',
        session_id: item?.session_id || null,
        feedback_type: item?.feedback_type || 'general',
        rating: item?.rating || null,
        comments: item?.comments || '',
      };
    } else {
      return {};
    }
  });

  const mutation = useMutation(
    async (data: any) => {
      // Convert Jalali date to Gregorian for session_date
      const submitData = { ...data };
      if (type === 'session' && submitData.session_date) {
        try {
          // session_date is in Jalali format (YYYY-MM-DD), convert to Gregorian
          const gregorianDate = jalaliToGregorian(submitData.session_date);
          // Use local date methods to avoid timezone issues
          const year = gregorianDate.getFullYear();
          const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
          const day = String(gregorianDate.getDate()).padStart(2, '0');
          submitData.session_date = `${year}-${month}-${day}`;
          console.log('Converted Jalali date:', data.session_date, 'to Gregorian:', submitData.session_date);
        } catch (error) {
          console.error('Error converting Jalali date to Gregorian:', error);
          // If conversion fails, try to use as is (might already be Gregorian)
        }
      }
      
      // Convert dates for program
      if (type === 'program') {
        if (submitData.start_date) {
          const gregorianDate = jalaliToGregorian(submitData.start_date);
          const year = gregorianDate.getFullYear();
          const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
          const day = String(gregorianDate.getDate()).padStart(2, '0');
          submitData.start_date = `${year}-${month}-${day}`;
        }
        if (submitData.end_date) {
          const gregorianDate = jalaliToGregorian(submitData.end_date);
          const year = gregorianDate.getFullYear();
          const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
          const day = String(gregorianDate.getDate()).padStart(2, '0');
          submitData.end_date = `${year}-${month}-${day}`;
        }
      }

      if (item) {
        if (type === 'session') {
          return api.put(`/coaching/sessions/${item.id}`, submitData);
        } else if (type === 'goal') {
          return api.put(`/coaching/goals/${item.id}`, submitData);
        } else if (type === 'exercise') {
          return api.put(`/coaching/exercises/${item.id}`, submitData);
        } else if (type === 'report') {
          return api.put(`/coaching/reports/${item.id}`, submitData);
        } else if (type === 'program') {
          return api.put(`/coaching/programs/${item.id}`, submitData);
        } else if (type === 'template') {
          return api.put(`/coaching/templates/${item.id}`, submitData);
        } else if (type === 'feedback') {
          return api.put(`/coaching/feedback/${item.id}`, submitData);
        }
      } else {
        if (type === 'session') {
          return api.post('/coaching/sessions', submitData);
        } else if (type === 'goal') {
          return api.post('/coaching/goals', submitData);
        } else if (type === 'exercise') {
          return api.post('/coaching/exercises', submitData);
        } else if (type === 'report') {
          return api.post('/coaching/reports', submitData);
        } else if (type === 'program') {
          return api.post('/coaching/programs', submitData);
        } else if (type === 'template') {
          return api.post('/coaching/templates', submitData);
        } else if (type === 'feedback') {
          return api.post('/coaching/feedback', submitData);
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-sessions');
        queryClient.invalidateQueries('coaching-goals');
        queryClient.invalidateQueries('coaching-exercises');
        queryClient.invalidateQueries('coaching-reports');
        queryClient.invalidateQueries('coaching-programs');
        queryClient.invalidateQueries('coaching-templates');
        queryClient.invalidateQueries('coaching-feedback');
        queryClient.invalidateQueries('coaching-dashboard-stats');
        queryClient.invalidateQueries('coaching-upcoming-sessions');
        queryClient.invalidateQueries('coaching-goals-progress');
        queryClient.invalidateQueries('coaching-overdue-exercises');
        alert('اطلاعات با موفقیت ذخیره شد');
        onClose();
      },
      onError: (error: any) => {
        console.error('Error saving coaching data:', error);
        alert(error.response?.data?.error || 'خطا در ذخیره اطلاعات');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting coaching form:', { type, formData });
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {item ? 'ویرایش' : 'افزودن'} {
              type === 'session' ? 'جلسه' : 
              type === 'goal' ? 'هدف' : 
              type === 'exercise' ? 'تمرین' : 
              type === 'report' ? 'گزارش' :
              type === 'program' ? 'برنامه' :
              type === 'template' ? 'قالب' :
              type === 'feedback' ? 'بازخورد' : ''
            }
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'session' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {Array.isArray(customers) && customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">تاریخ جلسه</label>
                  <JalaliDatePicker
                    value={formData.session_date}
                    onChange={(value) => setFormData({ ...formData, session_date: value })}
                    placeholder="تاریخ جلسه را انتخاب کنید"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مدت زمان (دقیقه)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || null })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="scheduled">زمان‌بندی شده</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="cancelled">لغو شده</option>
                    <option value="rescheduled">زمان‌بندی مجدد</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نوع جلسه</label>
                  <select
                    value={formData.session_type || ''}
                    onChange={(e) => setFormData({ ...formData, session_type: e.target.value || null })}
                    className="input"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="online">آنلاین</option>
                    <option value="in_person">حضوری</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">لینک جلسه (برای جلسات آنلاین)</label>
                  <input
                    type="url"
                    value={formData.meeting_link || ''}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value || null })}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
                {item?.status === 'completed' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">حضور</label>
                      <select
                        value={formData.attendance || ''}
                        onChange={(e) => setFormData({ ...formData, attendance: e.target.value || null })}
                        className="input"
                      >
                        <option value="">انتخاب کنید</option>
                        <option value="attended">حاضر</option>
                        <option value="absent">غایب</option>
                        <option value="late">تأخیر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">امتیاز (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.rating || ''}
                        onChange={(e) => setFormData({ ...formData, rating: e.target.value ? parseInt(e.target.value) : null })}
                        className="input"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">تگ‌ها (جدا شده با کاما)</label>
                  <input
                    type="text"
                    value={formData.tags || ''}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value || null })}
                    className="input"
                    placeholder="مثلاً: مهم، پیگیری، بررسی"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">رنگ لیبل</label>
                  <div className="flex gap-2 flex-wrap">
                    {eventColors.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: colorOption.value })}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                          ${formData.color === colorOption.value 
                            ? `${colorOption.border} border-2 shadow-md` 
                            : 'border-neutral-200 hover:border-neutral-300'
                          }
                        `}
                      >
                        <div
                          className="w-6 h-6 rounded-full border border-neutral-300"
                          style={{ backgroundColor: colorOption.value }}
                        />
                        <span className={`text-sm ${formData.color === colorOption.value ? 'font-bold' : ''}`}>
                          {colorOption.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">یادداشت‌ها</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={4}
                />
              </div>
            </>
          )}

          {type === 'goal' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {Array.isArray(customers) && customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">عنوان *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نوع *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({ 
                        ...formData, 
                        type: newType,
                        is_kr: newType === 'okr' ? false : formData.is_kr, // Reset is_kr when changing to KPI
                      });
                    }}
                    className="input"
                    required
                  >
                    <option value="kpi">KPI</option>
                    <option value="okr">OKR (هدف)</option>
                  </select>
                </div>
                {formData.type === 'okr' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">نوع OKR</label>
                      <select
                        value={formData.is_kr ? 'kr' : 'objective'}
                        onChange={(e) => setFormData({ ...formData, is_kr: e.target.value === 'kr' })}
                        className="input"
                      >
                        <option value="objective">هدف (Objective)</option>
                        <option value="kr">نتیجه کلیدی (Key Result)</option>
                      </select>
                    </div>
                    {formData.is_kr && (
                      <div>
                        <label className="block text-sm font-medium mb-2">مرتبط با OKR (هدف)</label>
                        <select
                          value={formData.okr_id || ''}
                          onChange={(e) => setFormData({ ...formData, okr_id: e.target.value ? parseInt(e.target.value) : null })}
                          className="input"
                        >
                          <option value="">انتخاب OKR مرتبط</option>
                          {goals?.filter((g: any) => g.type === 'okr' && !g.is_kr && g.id !== item?.id).map((goal: any) => (
                            <option key={goal.id} value={goal.id}>{goal.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">مقدار هدف</label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || null })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مقدار فعلی</label>
                  <input
                    type="number"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">واحد</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input"
                    placeholder="مثلاً: درصد، تومان، تعداد"
                  />
                </div>
                <div>
                  <label className="label">مهلت</label>
                  <JalaliDatePicker
                    value={formData.deadline}
                    onChange={(value) => setFormData({ ...formData, deadline: value })}
                    placeholder="مهلت را انتخاب کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">فعال</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="cancelled">لغو شده</option>
                    <option value="on_hold">در انتظار</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
            </>
          )}

          {type === 'exercise' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {Array.isArray(customers) && customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">هدف (اختیاری)</label>
                <select
                  value={formData.goal_id || ''}
                  onChange={(e) => setFormData({ ...formData, goal_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="input"
                >
                  <option value="">بدون هدف</option>
                  {Array.isArray(goals) && goals.map((goal: any) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">عنوان *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">مهلت</label>
                  <JalaliDatePicker
                    value={formData.due_date}
                    onChange={(value) => setFormData({ ...formData, due_date: value })}
                    placeholder="مهلت را انتخاب کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="pending">در انتظار</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="overdue">منقضی شده</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">دستورالعمل</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="input"
                  rows={4}
                />
              </div>
            </>
          )}

          {type === 'report' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {Array.isArray(customers) && customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label label-required">تاریخ گزارش</label>
                  <JalaliDatePicker
                    value={formData.report_date}
                    onChange={(value) => setFormData({ ...formData, report_date: value })}
                    placeholder="تاریخ گزارش را انتخاب کنید"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نمره کلی</label>
                  <input
                    type="number"
                    value={formData.overall_score}
                    onChange={(e) => setFormData({ ...formData, overall_score: parseFloat(e.target.value) || null })}
                    className="input"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">دستاوردها</label>
                <textarea
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">چالش‌ها</label>
                <textarea
                  value={formData.challenges}
                  onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">مراحل بعدی</label>
                <textarea
                  value={formData.next_steps}
                  onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
            </>
          )}

          {type === 'program' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {Array.isArray(customers) && customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">عنوان برنامه *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="label">تاریخ پایان</label>
                  <JalaliDatePicker
                    value={formData.end_date}
                    onChange={(value) => setFormData({ ...formData, end_date: value })}
                    placeholder="تاریخ پایان را انتخاب کنید"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">وضعیت</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                >
                  <option value="active">فعال</option>
                  <option value="completed">تکمیل شده</option>
                  <option value="cancelled">لغو شده</option>
                  <option value="on_hold">متوقف شده</option>
                </select>
              </div>
            </>
          )}

          {type === 'template' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">نام قالب *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">نوع قالب *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">انتخاب نوع</option>
                  <option value="goal">هدف</option>
                  <option value="exercise">تمرین</option>
                  <option value="session">جلسه</option>
                  <option value="report">گزارش</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">محتوای قالب (JSON) *</label>
                <textarea
                  value={typeof formData.content === 'string' ? formData.content : JSON.stringify(formData.content || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({ ...formData, content: parsed });
                    } catch {
                      setFormData({ ...formData, content: e.target.value });
                    }
                  }}
                  className="input font-mono text-sm"
                  rows={10}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">فرمت JSON معتبر وارد کنید</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default === 1 || formData.is_default === true}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium">قالب پیش‌فرض</label>
              </div>
            </>
          )}

          {type === 'feedback' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {Array.isArray(customers) && customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">نوع بازخورد *</label>
                <select
                  value={formData.feedback_type}
                  onChange={(e) => setFormData({ ...formData, feedback_type: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">انتخاب نوع</option>
                  <option value="pre_session">قبل از جلسه</option>
                  <option value="post_session">بعد از جلسه</option>
                  <option value="general">عمومی</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">جلسه (اختیاری)</label>
                <select
                  value={formData.session_id || ''}
                  onChange={(e) => setFormData({ ...formData, session_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="input"
                >
                  <option value="">بدون جلسه</option>
                  {Array.isArray(sessions) && sessions.map((session: any) => (
                    <option key={session.id} value={session.id}>
                      {toJalali(session.session_date)} - {session.notes || 'بدون توضیحات'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">امتیاز (1-5)</label>
                <input
                  type="number"
                  value={formData.rating || ''}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value ? parseInt(e.target.value) : null })}
                  className="input"
                  min="1"
                  max="5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">نظرات</label>
                <textarea
                  value={formData.comments || ''}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="input"
                  rows={5}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Dashboard Component
const DashboardView = ({ stats, upcomingSessions, goalsProgress, overdueExercises, customers, onSessionClick, onGoalClick, onExerciseClick }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const upcomingSessionsArray = Array.isArray(upcomingSessions) ? upcomingSessions : [];
  const goalsProgressArray = Array.isArray(goalsProgress) ? goalsProgress : [];
  const overdueExercisesArray = Array.isArray(overdueExercises) ? overdueExercises : [];

  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">جلسات آینده</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats?.upcomingSessions || 0}</p>
            </div>
            <Clock className="text-blue-500" size={40} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">جلسات تکمیل شده</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats?.completedSessions || 0}</p>
            </div>
            <CheckCircle className="text-green-500" size={40} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">اهداف فعال</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats?.activeGoals || 0}</p>
            </div>
            <Target className="text-purple-500" size={40} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">تمرین‌های در انتظار</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{stats?.pendingExercises || 0}</p>
            </div>
            <AlertCircle className="text-yellow-500" size={40} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">تمرین‌های منقضی شده</p>
              <p className="text-3xl font-bold text-red-900 mt-2">{stats?.overdueExercises || 0}</p>
            </div>
            <XCircle className="text-red-500" size={40} />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700 font-medium">کل جلسات</p>
              <p className="text-3xl font-bold text-indigo-900 mt-2">{toPersianNumber(stats?.totalSessions || 0)}</p>
            </div>
            <TrendingUp className="text-indigo-500" size={40} />
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessionsArray.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">جلسات آینده (7 روز آینده)</h3>
          <div className="space-y-3">
            {upcomingSessionsArray.slice(0, 5).map((session: any) => (
              <div
                key={session.id}
                onClick={() => onSessionClick(session)}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getCustomerName(session.customer_id)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {toJalali(session.session_date)} - {session.duration || 'نامشخص'} دقیقه
                    </p>
                  </div>
                  {session.meeting_link && (
                    <a
                      href={session.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      لینک جلسه
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals Progress */}
      {goalsProgressArray.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">پیشرفت اهداف</h3>
          <div className="space-y-4">
            {goalsProgressArray.slice(0, 5).map((goal: any) => {
              const progress = goal.progress || 0;
              return (
                <div
                  key={goal.id}
                  onClick={() => onGoalClick(goal)}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-sm text-gray-600">{getCustomerName(goal.customer_id)}</p>
                    </div>
                    <span className="text-sm font-bold">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        progress >= 100 ? 'bg-green-600' : progress >= 50 ? 'bg-blue-600' : 'bg-yellow-600'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overdue Exercises */}
      {overdueExercisesArray.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <h3 className="text-lg font-bold mb-4 text-red-700">تمرین‌های منقضی شده</h3>
          <div className="space-y-3">
            {overdueExercisesArray.slice(0, 5).map((exercise: any) => (
              <div
                key={exercise.id}
                onClick={() => onExerciseClick(exercise)}
                className="border border-red-200 rounded-lg p-4 hover:bg-red-100 cursor-pointer transition-colors bg-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">{exercise.title}</p>
                    <p className="text-sm text-red-700 mt-1">
                      {getCustomerName(exercise.customer_id)} - مهلت: {toJalali(exercise.due_date)}
                    </p>
                  </div>
                  <XCircle className="text-red-500" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Calendar View Component
const CalendarView = ({ sessions, customers, onSessionClick, onCreateSession }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const sessionsArray = Array.isArray(sessions) ? sessions : [];
  
  
  const currentJalali = getJalaliDayjs();
  const [currentJalaliYear, setCurrentJalaliYear] = useState(currentJalali.year());
  const [currentJalaliMonth, setCurrentJalaliMonth] = useState(currentJalali.month() + 1);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));

  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
      case 'scheduled': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
      case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
      default: return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInJalaliMonth(currentJalaliYear, currentJalaliMonth);
    const firstDayOfMonth = getFirstDayOfJalaliMonth(currentJalaliYear, currentJalaliMonth);
    const startingDayOfWeek = getJalaliDayOfWeek(firstDayOfMonth); // 0 = شنبه, 6 = جمعه
    
    const days = [];
    const todayJalali = getJalaliDayjs();
    const todayYear = todayJalali.year();
    const todayMonth = todayJalali.month() + 1;
    const todayDay = todayJalali.date();
    
    // Add previous month's trailing days
    const prevMonth = currentJalaliMonth === 1 ? 12 : currentJalaliMonth - 1;
    const prevYear = currentJalaliMonth === 1 ? currentJalaliYear - 1 : currentJalaliYear;
    const prevMonthDays = getDaysInJalaliMonth(prevYear, prevMonth);
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const jalaliDate = getJalaliDayjs().calendar('jalali').year(prevYear).month(prevMonth - 1).date(day);
      const gregorianDate = jalaliDate.toDate();
      days.push({
        date: gregorianDate.toISOString().split('T')[0],
        jalaliDay: day,
        jalaliMonth: prevMonth,
        jalaliYear: prevYear,
        isCurrentMonth: false,
        isToday: prevYear === todayYear && prevMonth === todayMonth && day === todayDay
      });
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const jalaliDate = getJalaliDayjs().calendar('jalali').year(currentJalaliYear).month(currentJalaliMonth - 1).date(day);
      const gregorianDate = jalaliDate.toDate();
      days.push({
        date: gregorianDate.toISOString().split('T')[0],
        jalaliDay: day,
        jalaliMonth: currentJalaliMonth,
        jalaliYear: currentJalaliYear,
        isCurrentMonth: true,
        isToday: currentJalaliYear === todayYear && currentJalaliMonth === todayMonth && day === todayDay
      });
    }
    
    // Add next month's leading days
    const remainingDays = 42 - days.length;
    const nextMonth = currentJalaliMonth === 12 ? 1 : currentJalaliMonth + 1;
    const nextYear = currentJalaliMonth === 12 ? currentJalaliYear + 1 : currentJalaliYear;
    
    for (let day = 1; day <= remainingDays; day++) {
      const jalaliDate = getJalaliDayjs().calendar('jalali').year(nextYear).month(nextMonth - 1).date(day);
      const gregorianDate = jalaliDate.toDate();
      days.push({
        date: gregorianDate.toISOString().split('T')[0],
        jalaliDay: day,
        jalaliMonth: nextMonth,
        jalaliYear: nextYear,
        isCurrentMonth: false,
        isToday: nextYear === todayYear && nextMonth === todayMonth && day === todayDay
      });
    }
    
    return days;
  }, [currentJalaliYear, currentJalaliMonth]);

  // Get sessions for a specific date
  const getSessionsForDate = (date: string) => {
    if (!date) return [];
    const filtered = sessionsArray.filter((session: any) => {
      const sessionDate = session.session_date;
      if (!sessionDate) return false;
      const dateStr = sessionDate.split('T')[0];
      const matches = dateStr === date;
      if (matches) {
        console.log('Session matched for date:', date, 'Session:', session);
      }
      return matches;
    });
    console.log(`Found ${filtered.length} sessions for date ${date} (Jalali: ${toJalali(date)})`);
    return filtered;
  };

  const handlePrevMonth = () => {
    if (currentJalaliMonth === 1) {
      setCurrentJalaliMonth(12);
      setCurrentJalaliYear(currentJalaliYear - 1);
    } else {
      setCurrentJalaliMonth(currentJalaliMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentJalaliMonth === 12) {
      setCurrentJalaliMonth(1);
      setCurrentJalaliYear(currentJalaliYear + 1);
    } else {
      setCurrentJalaliMonth(currentJalaliMonth + 1);
    }
  };

  const handleToday = () => {
    const today = getJalaliDayjs();
    setCurrentJalaliYear(today.year());
    setCurrentJalaliMonth(today.month() + 1);
    setSelectedDate(formatDateForInput(today.toDate()));
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    onCreateSession(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">
          {jalaliMonthNames[currentJalaliMonth - 1]} {currentJalaliYear}
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-all text-neutral-700 hover:text-neutral-900"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={handleToday}
            className="btn btn-secondary text-sm"
          >
            امروز
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-all text-neutral-700 hover:text-neutral-900"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {jalaliWeekDays.map((day) => (
          <div key={day} className="text-center font-semibold text-neutral-700 py-2 text-sm">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, idx) => {
          const daySessions = getSessionsForDate(day.date);
          const isSelected = day.date === selectedDate;
          
          return (
            <div
              key={idx}
              onClick={() => handleDayClick(day.date)}
              className={`
                min-h-[100px] p-2 rounded-lg cursor-pointer transition-all
                ${day.isCurrentMonth ? 'bg-white/50' : 'bg-neutral-100/30'}
                ${day.isToday ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                ${isSelected ? 'ring-2 ring-info-500' : ''}
                hover:bg-white/70 backdrop-blur-sm border border-white/30
              `}
            >
              <div className={`text-sm font-medium mb-1 ${day.isCurrentMonth ? 'text-neutral-700' : 'text-neutral-400'}`}>
                {day.jalaliDay}
              </div>
              <div className="space-y-1">
                {daySessions.slice(0, 3).map((session: any, sessionIdx: number) => {
                  // Use custom color if available, otherwise use status color
                  const customColor = session.color;
                  const colorStyle = customColor 
                    ? { bg: '', text: 'text-white', border: '' }
                    : getStatusColor(session.status);
                  return (
                    <div
                      key={session.id || sessionIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionClick(session);
                      }}
                      className={`
                        text-xs px-2 py-1 rounded truncate border cursor-pointer
                        hover:opacity-80 transition-opacity
                        ${customColor ? '' : `${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
                      `}
                      style={customColor ? {
                        backgroundColor: customColor,
                        borderColor: customColor,
                        color: '#ffffff'
                      } : {}}
                      title={getCustomerName(session.customer_id)}
                    >
                      {getCustomerName(session.customer_id)}
                    </div>
                  );
                })}
                {daySessions.length > 3 && (
                  <div className="text-xs text-neutral-500 text-center">
                    +{toPersianNumber(daySessions.length - 3)} بیشتر
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Date Sessions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">
          جلسات {toJalali(selectedDate)}
        </h2>
        {getSessionsForDate(selectedDate).length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            جلسه‌ای برای این تاریخ ثبت نشده است
          </div>
        ) : (
          <div className="space-y-3">
            {getSessionsForDate(selectedDate).map((session: any) => {
              const customColor = session.color;
              const colorStyle = customColor 
                ? { bg: '', text: 'text-white', border: '' }
                : getStatusColor(session.status);
              return (
                <div
                  key={session.id}
                  onClick={() => onSessionClick(session)}
                  className={`card-hover ${customColor ? '' : `${colorStyle.bg} ${colorStyle.border}`} border-l-4 cursor-pointer`}
                  style={customColor ? {
                    backgroundColor: `${customColor}20`,
                    borderLeftColor: customColor
                  } : {}}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock size={18} />
                        <span className="font-bold text-lg">{getCustomerName(session.customer_id)}</span>
                        <span 
                          className={`text-xs px-2 py-1 rounded ${customColor ? '' : `${colorStyle.bg} ${colorStyle.text}`}`}
                          style={customColor ? {
                            backgroundColor: customColor,
                            color: '#ffffff'
                          } : {}}
                        >
                          {session.status === 'completed' ? 'تکمیل شده' : 
                           session.status === 'scheduled' ? 'زمان‌بندی شده' :
                           session.status === 'cancelled' ? 'لغو شده' : 'زمان‌بندی مجدد'}
                        </span>
                      </div>
                      {session.duration && (
                        <p className="text-sm text-neutral-600">⏱️ {session.duration} دقیقه</p>
                      )}
                      {session.notes && (
                        <p className="text-neutral-700 mt-2 text-sm">{session.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Programs List Component
const ProgramsList = ({ programs, customers, onEdit, onDelete }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const programsArray = Array.isArray(programs) ? programs : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'on_hold': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {programsArray.map((program: any) => (
        <div key={program.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-lg">{program.title}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(program.status)}`}>
                  {program.status === 'active' ? 'فعال' : 
                   program.status === 'completed' ? 'تکمیل شده' :
                   program.status === 'cancelled' ? 'لغو شده' : 'متوقف شده'}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <span>مشتری: {getCustomerName(program.customer_id)}</span>
                {program.start_date && (
                  <span className="mr-4">شروع: {toJalali(program.start_date)}</span>
                )}
                {program.end_date && (
                  <span>پایان: {toJalali(program.end_date)}</span>
                )}
              </div>
              {program.description && (
                <p className="text-gray-700 mb-2">{program.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(program)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('program', program.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {programsArray.length === 0 && (
        <div className="text-center py-12 text-gray-500">برنامه‌ای ثبت نشده است</div>
      )}
    </div>
  );
};

// Templates List Component
const TemplatesList = ({ templates, onEdit, onDelete }: any) => {
  const templatesArray = Array.isArray(templates) ? templates : [];
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'goal': return 'هدف';
      case 'exercise': return 'تمرین';
      case 'session': return 'جلسه';
      case 'report': return 'گزارش';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      {templatesArray.map((template: any) => (
        <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-lg">{template.name}</span>
                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                  {getTypeLabel(template.type)}
                </span>
                {template.is_default === 1 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                    پیش‌فرض
                  </span>
                )}
              </div>
              {template.content && (
                <div className="text-sm text-gray-600">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(typeof template.content === 'string' ? JSON.parse(template.content) : template.content, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(template)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('template', template.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {templatesArray.length === 0 && (
        <div className="text-center py-12 text-gray-500">قالبی ثبت نشده است</div>
      )}
    </div>
  );
};

// Feedback List Component
const FeedbackList = ({ feedbacks, customers, sessions, onEdit, onDelete }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const sessionsArray = Array.isArray(sessions) ? sessions : [];
  const feedbacksArray = Array.isArray(feedbacks) ? feedbacks : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getSessionTitle = (id: number) => {
    const session = sessionsArray.find((s: any) => s.id === id);
    return session ? `جلسه ${toJalali(session.session_date)}` : 'جلسه نامشخص';
  };

  const getFeedbackTypeLabel = (type: string) => {
    switch (type) {
      case 'pre_session': return 'قبل از جلسه';
      case 'post_session': return 'بعد از جلسه';
      case 'general': return 'عمومی';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      {feedbacksArray.map((feedback: any) => (
        <div key={feedback.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium">{getCustomerName(feedback.customer_id)}</span>
                <span className="px-2 py-1 bg-info-100 text-info-700 rounded text-sm">
                  {getFeedbackTypeLabel(feedback.feedback_type)}
                </span>
                {feedback.rating && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                    ⭐ {feedback.rating}/5
                  </span>
                )}
                {feedback.session_id && (
                  <span className="text-sm text-gray-600">
                    {getSessionTitle(feedback.session_id)}
                  </span>
                )}
              </div>
              {feedback.comments && (
                <p className="text-gray-700 mb-2">{feedback.comments}</p>
              )}
              <div className="text-xs text-gray-500">
                {toJalaliFull(feedback.created_at)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(feedback)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('feedback', feedback.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {feedbacksArray.length === 0 && (
        <div className="text-center py-12 text-gray-500">بازخوردی ثبت نشده است</div>
      )}
    </div>
  );
};

export default Coaching;

