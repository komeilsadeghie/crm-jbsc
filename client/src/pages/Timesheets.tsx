import { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Calendar, Filter, Download, RefreshCw } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Timesheets = () => {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [groupByTask, setGroupByTask] = useState(false);

  const { data: timesheets, isLoading, refetch } = useQuery(
    ['timesheets', dateFilter, customerFilter, projectFilter],
    async () => {
      try {
        const params = new URLSearchParams();
        if (dateFilter) params.append('date', dateFilter);
        if (customerFilter) params.append('customer_id', customerFilter);
        if (projectFilter) params.append('project_id', projectFilter);
        const response = await api.get(`/timesheets/me?${params.toString()}`);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error: any) {
        if (error.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    {
      retry: 1,
      staleTime: 1 * 60 * 1000,
      cacheTime: 3 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  // Calculate summary statistics
  const summary = useMemo(() => {
    const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const calculateTime = (timesheets: any[]) => {
      return timesheets.reduce((total, ts: any) => {
        const duration = ts.duration_minutes || 0;
        return total + duration;
      }, 0);
    };

    const filterByDateRange = (start: Date, end: Date) => {
      return timesheetsArray.filter((ts: any) => {
        const tsDate = new Date(ts.start_time);
        return tsDate >= start && tsDate <= end;
      });
    };

    return {
      total: formatTime(calculateTime(timesheetsArray)),
      thisWeek: formatTime(calculateTime(filterByDateRange(thisWeekStart, now))),
      lastWeek: formatTime(calculateTime(filterByDateRange(lastWeekStart, thisWeekStart))),
      thisMonth: formatTime(calculateTime(filterByDateRange(thisMonthStart, now))),
      lastMonth: formatTime(calculateTime(filterByDateRange(lastMonthStart, lastMonthEnd))),
    };
  }, [timesheets]);

  // Chart data for today
  const chartData = useMemo(() => {
    const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTimesheets = timesheetsArray.filter((ts: any) => {
      const tsDate = new Date(ts.start_time);
      return tsDate >= today;
    });

    // Group by hour
    const hourlyData: Record<number, number> = {};
    todayTimesheets.forEach((ts: any) => {
      const hour = new Date(ts.start_time).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + (ts.duration_minutes || 0);
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      minutes: hourlyData[i] || 0,
    }));
  }, [timesheets]);

  // Pagination
  const { totalItems, totalPages, paginatedTimesheets } = useMemo(() => {
    const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];
    let filtered = timesheetsArray;

    // Group by task if enabled
    if (groupByTask) {
      const grouped: Record<number, any> = {};
      filtered.forEach((ts: any) => {
        const taskId = ts.task_id || 0;
        if (!grouped[taskId]) {
          grouped[taskId] = {
            ...ts,
            duration_minutes: 0,
            count: 0,
          };
        }
        grouped[taskId].duration_minutes += ts.duration_minutes || 0;
        grouped[taskId].count += 1;
      });
      filtered = Object.values(grouped);
    }

    const total = filtered.length;
    const pages = Math.ceil(total / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);

    return {
      totalItems: total,
      totalPages: pages,
      paginatedTimesheets: paginated,
    };
  }, [timesheets, currentPage, itemsPerPage, groupByTask]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const formatDecimal = (minutes: number) => {
    return (minutes / 60).toFixed(2);
  };

  const { data: customers } = useQuery('customers', async () => {
    try {
      const response = await api.get('/customers');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  });

  const { data: projects } = useQuery('projects', async () => {
    try {
      const response = await api.get('/projects');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
        <div className="max-w-7xl mx-auto">
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">تایم‌شیت‌های من</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">نمای کلی تفصیلی از تایم‌شیت‌ها و ساعات ثبت شده</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">کل زمان ثبت شده</div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
              {toPersianNumber(summary.total)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">زمان ثبت شده ماه گذشته</div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
              {toPersianNumber(summary.lastMonth)}
            </div>
          </div>
          <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <div className="text-sm text-primary-700 dark:text-primary-300">زمان ثبت شده این ماه</div>
            <div className="text-2xl font-bold text-primary-900 dark:text-primary-100 mt-2">
              {toPersianNumber(summary.thisMonth)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">زمان ثبت شده هفته گذشته</div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
              {toPersianNumber(summary.lastWeek)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">زمان ثبت شده این هفته</div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
              {toPersianNumber(summary.thisWeek)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">نمودار زمان ثبت شده امروز</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">تاریخ</label>
              <JalaliDatePicker
                value={dateFilter}
                onChange={(value) => {
                  setDateFilter(value);
                  setCurrentPage(1);
                }}
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div>
              <label className="label">مشتری</label>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input"
              >
                <option value="">همه مشتریان</option>
                {customers?.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">پروژه</label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input"
              >
                <option value="">همه پروژه‌ها</option>
                {projects?.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => refetch()}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={18} />
                بروزرسانی
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-4">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button className="btn btn-secondary flex items-center gap-2">
                <Download size={18} />
                خروجی
              </button>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupByTask}
                  onChange={(e) => {
                    setGroupByTask(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">گروه‌بندی بر اساس تسک</span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>تسک</th>
                  <th>برچسب‌های تایم‌شیت</th>
                  <th>زمان شروع</th>
                  <th>زمان پایان</th>
                  <th>یادداشت</th>
                  <th>مرتبط</th>
                  <th>زمان (ساعت)</th>
                  <th>زمان (اعشاری)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTimesheets.length > 0 ? (
                  paginatedTimesheets.map((timesheet: any, index: number) => (
                    <tr key={timesheet.id || index}>
                      <td>
                        {timesheet.task_title ? (
                          <div>
                            <div className="font-medium">{timesheet.task_title}</div>
                            {timesheet.task_status && (
                              <span className="badge badge-info text-xs mt-1">
                                {timesheet.task_status === 'done' ? 'انجام شده' : 
                                 timesheet.task_status === 'in_progress' ? 'در حال انجام' : 
                                 timesheet.task_status === 'todo' ? 'انجام نشده' : timesheet.task_status}
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {timesheet.tags && timesheet.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {timesheet.tags.map((tag: string, i: number) => (
                              <span key={i} className="badge badge-neutral text-xs">{tag}</span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{timesheet.start_time ? toJalali(timesheet.start_time) : '-'}</td>
                      <td>{timesheet.end_time ? toJalali(timesheet.end_time) : '-'}</td>
                      <td className="max-w-xs truncate">{timesheet.note || '-'}</td>
                      <td>
                        {timesheet.project_name && (
                          <div className="text-sm">{timesheet.project_name}</div>
                        )}
                        {timesheet.customer_name && (
                          <div className="text-xs text-neutral-500">{timesheet.customer_name}</div>
                        )}
                        {!timesheet.project_name && !timesheet.customer_name && '-'}
                      </td>
                      <td className="font-medium">
                        {toPersianNumber(formatTime(timesheet.duration_minutes || 0))}
                      </td>
                      <td>{toPersianNumber(formatDecimal(timesheet.duration_minutes || 0))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <EmptyState
                        icon={Clock}
                        title="هیچ تایم‌شیتی یافت نشد"
                        description="شما هنوز تایم‌شیتی ثبت نکرده‌اید"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex justify-between items-center">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  نمایش {toPersianNumber((currentPage - 1) * itemsPerPage + 1)} تا {toPersianNumber(Math.min(currentPage * itemsPerPage, totalItems))} از {toPersianNumber(totalItems)} مورد
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-4 text-sm">
                <div>
                  <span className="text-neutral-600 dark:text-neutral-400">کل زمان ثبت شده: </span>
                  <span className="font-bold">{toPersianNumber(formatTime(paginatedTimesheets.reduce((sum: number, ts: any) => sum + (ts.duration_minutes || 0), 0)))}</span>
                </div>
                <div>
                  <span className="text-neutral-600 dark:text-neutral-400">کل زمان ثبت شده: </span>
                  <span className="font-bold">{toPersianNumber(formatDecimal(paginatedTimesheets.reduce((sum: number, ts: any) => sum + (ts.duration_minutes || 0), 0)))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timesheets;




