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
  Users,
  Ticket
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
      refetchInterval: 60000,
      onError: (error) => {
        console.error('Error fetching dashboard:', error);
      }
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card p-8 text-center">
          <div className="text-xl mb-2">در حال بارگذاری...</div>
          <div className="text-sm text-gray-600">لطفاً صبر کنید</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card p-8 text-center">
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
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    if (payment.period === 'this_week') {
      paymentChartData[adjustedIndex].thisWeek += payment.amount || 0;
    } else if (payment.period === 'last_week') {
      paymentChartData[adjustedIndex].lastWeek += payment.amount || 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-20 sm:pt-24 md:pt-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="card flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">داشبورد</h1>
          <div className="text-sm text-gray-600">
            خوش آمدید، {user?.fullName || user?.username}
          </div>
        </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/invoices" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">فاکتورهای در انتظار پرداخت</p>
                <p className="text-2xl font-bold text-gray-800">
                  {kpis.invoices_awaiting_payment || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">از {kpis.invoices_total || 0} فاکتور</p>
              </div>
              <FileText className="text-red-500" size={32} />
            </div>
          </Link>

          <Link to="/leads" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">سرنخ‌های تبدیل شده</p>
                <p className="text-2xl font-bold text-gray-800">
                  {kpis.converted_leads || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">از {kpis.leads_total || 0} سرنخ</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </Link>

          <Link to="/projects" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">پروژه‌های در حال انجام</p>
                <p className="text-2xl font-bold text-gray-800">
                  {kpis.projects_in_progress || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">از {kpis.projects_total || 0} پروژه</p>
              </div>
              <FolderOpen className="text-blue-500" size={32} />
            </div>
          </Link>

          <Link to="/tasks" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">وظایف تمام نشده</p>
                <p className="text-2xl font-bold text-gray-800">
                  {kpis.tasks_not_finished || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">از {kpis.tasks_total || 0} وظیفه</p>
              </div>
              <CheckSquare className="text-purple-500" size={32} />
            </div>
          </Link>
        </div>

        {/* Overview Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Invoice Overview */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">خلاصه فاکتورها</h3>
              <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
            </div>
            <div className="space-y-2 text-sm">
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
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">خلاصه پیش‌فاکتورها</h3>
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
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">خلاصه پروپوزال‌ها</h3>
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
        <div className="card">
          <h3 className="text-lg font-bold mb-4">خلاصه مالی</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-gray-600 mb-1">فاکتورهای معوق</div>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.outstanding || 0)} تومان
              </div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm text-gray-600 mb-1">فاکتورهای سررسید گذشته</div>
              <div className="text-2xl font-bold text-yellow-600">
                {new Intl.NumberFormat('fa-IR').format(financialSummary.past_due || 0)} تومان
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
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
            <div className="card">
              <div className="border-b">
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
                          <span className="text-sm font-medium">وظایف من</span>
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
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {task.status}
                                    </span>
                                  </td>
                                  <td className="p-2">{task.start_date ? toJalali(task.start_date) : '-'}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
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
                          <span className="text-sm font-medium">پروژه‌های من</span>
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
                      <span className="text-sm font-medium">تیکت‌ها</span>
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
                          <span className="text-sm font-medium">آخرین فعالیت</span>
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
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">رویدادهای این هفته</h3>
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
            <div className="card">
              <h3 className="text-lg font-bold mb-4">سوابق پرداخت</h3>
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
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">قراردادهای در حال انقضا</h3>
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
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">گزارش تیکت‌های کارکنان</h3>
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
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">خلاصه سرنخ‌ها</h3>
                <Link to="/leads" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                {leadsOverview.length > 0 ? (
                  <PieChart>
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
                  </PieChart>
                ) : (
                  <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
                )}
              </ResponsiveContainer>
            </div>

            {/* Project Status Chart */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">آمار بر اساس وضعیت پروژه</h3>
                <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                {projectStatus.length > 0 ? (
                  <PieChart>
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
                  </PieChart>
                ) : (
                  <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
                )}
              </ResponsiveContainer>
            </div>

            {/* Tickets by Status */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">تیکت‌های در انتظار پاسخ بر اساس وضعیت</h3>
                <Link to="/tickets" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                {ticketStatus.length > 0 ? (
                  <PieChart>
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
                  </PieChart>
                ) : (
                  <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
                )}
              </ResponsiveContainer>
            </div>

            {/* Tickets by Department */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">تیکت‌های در انتظار پاسخ بر اساس دپارتمان</h3>
                <Link to="/tickets" className="text-sm text-blue-600 hover:text-blue-700">مشاهده همه</Link>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                {ticketDepartments.length > 0 ? (
                  <PieChart>
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
                  </PieChart>
                ) : (
                  <div className="text-center py-8 text-gray-500">داده‌ای وجود ندارد</div>
                )}
              </ResponsiveContainer>
            </div>

            {/* Goals */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">اهداف</h3>
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
                            className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
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
