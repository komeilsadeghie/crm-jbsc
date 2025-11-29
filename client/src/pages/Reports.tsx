import { useQuery } from 'react-query';
import api from '../services/api';
import { Download, Filter } from 'lucide-react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { toJalali, formatDateForInput, getJalaliDayjs } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';

const Reports = () => {
  const [reportType, setReportType] = useState<'sales' | 'payments' | 'expenses' | 'time' | 'customers'>('sales');
  // استفاده از تاریخ شمسی برای dateRange
  const currentJalali = getJalaliDayjs();
  const oneMonthAgo = currentJalali.subtract(1, 'month');
  const [dateRange, setDateRange] = useState({ 
    start: formatDateForInput(oneMonthAgo.toDate()),
    end: formatDateForInput(new Date())
  });

  const { data: kpis } = useQuery('dashboard-kpis', async () => {
    const response = await api.get('/reports/dashboard/kpis');
    return response.data;
  });

  const { data: salesReport } = useQuery(
    ['sales-report', dateRange.start, dateRange.end],
    async () => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      const response = await api.get(`/reports/sales?${params.toString()}`);
      return response.data || [];
    },
    { enabled: reportType === 'sales' }
  );

  const { data: paymentsReport } = useQuery(
    ['payments-report', dateRange.start, dateRange.end],
    async () => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      const response = await api.get(`/reports/payments?${params.toString()}`);
      return response.data || [];
    },
    { enabled: reportType === 'payments' }
  );

  const { data: expensesReport } = useQuery(
    ['expenses-report', dateRange.start, dateRange.end],
    async () => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      const response = await api.get(`/reports/expenses?${params.toString()}`);
      return response.data || [];
    },
    { enabled: reportType === 'expenses' }
  );

  const { data: timeReport } = useQuery(
    ['time-report', dateRange.start, dateRange.end],
    async () => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      const response = await api.get(`/reports/time?${params.toString()}`);
      return response.data || [];
    },
    { enabled: reportType === 'time' }
  );

  const { data: customers } = useQuery('customers', async () => {
    const response = await api.get('/customers');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  const { data: interactions } = useQuery('interactions', async () => {
    const response = await api.get('/interactions?limit=1000');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  const { data: goals } = useQuery('coaching-goals', async () => {
    const response = await api.get('/coaching/goals');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  // Ensure arrays
  const customersArray = Array.isArray(customers) ? customers : [];
  const interactionsArray = Array.isArray(interactions) ? interactions : [];
  const goalsArray = Array.isArray(goals) ? goals : [];

  // Prepare chart data
  const customerTypeData = customersArray.reduce((acc: any, customer: any) => {
    acc[customer.type] = (acc[customer.type] || 0) + 1;
    return acc;
  }, {}) || {};

  const customerTypeChartData = Object.entries(customerTypeData).map(([name, value]) => ({
    name,
    value
  }));

  const revenueData = interactionsArray
    .filter((i: any) => i.type === 'deposit' && i.amount)
    .reduce((acc: any, interaction: any) => {
      const jalaliDate = toJalali(interaction.created_at);
      const month = jalaliDate.split('/')[1]; // ماه شمسی
      acc[month] = (acc[month] || 0) + parseFloat(interaction.amount);
      return acc;
    }, {}) || {};

  const revenueChartData = Object.entries(revenueData).map(([name, value]) => ({
    name,
    value
  }));

  const goalStatusData = goalsArray.reduce((acc: any, goal: any) => {
    acc[goal.status] = (acc[goal.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const goalStatusChartData = Object.entries(goalStatusData).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center glass-card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">گزارش‌گیری و تحلیل</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <JalaliDatePicker
              value={dateRange.start}
              onChange={(value) => setDateRange({ ...dateRange, start: value })}
              placeholder="از تاریخ"
            />
            <JalaliDatePicker
              value={dateRange.end}
              onChange={(value) => setDateRange({ ...dateRange, end: value })}
              placeholder="تا تاریخ"
            />
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="input w-48"
            >
              <option value="sales">گزارش فروش</option>
              <option value="payments">گزارش پرداخت‌ها</option>
              <option value="expenses">گزارش هزینه‌ها</option>
              <option value="time">گزارش زمان</option>
              <option value="customers">گزارش مشتریان</option>
            </select>
          </div>
          <button className="btn btn-secondary flex items-center gap-2">
            <Download size={20} />
            خروجی Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card">
          <p className="text-sm text-gray-600 mb-1">کل مشتریان</p>
          <p className="text-3xl font-bold text-gray-800">{kpis?.total_customers || 0}</p>
        </div>
        <div className="glass-card">
          <p className="text-sm text-gray-600 mb-1">درآمد کل</p>
          <p className="text-3xl font-bold text-gray-800">
            {new Intl.NumberFormat('fa-IR').format(kpis?.total_revenue || 0)}
          </p>
        </div>
        <div className="glass-card">
          <p className="text-sm text-gray-600 mb-1">اهداف فعال</p>
          <p className="text-3xl font-bold text-gray-800">{kpis?.goals_in_progress || 0}</p>
        </div>
        <div className="glass-card">
          <p className="text-sm text-gray-600 mb-1">میانگین نمره</p>
          <p className="text-3xl font-bold text-gray-800">{kpis?.average_customer_score || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Type Distribution */}
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4">توزیع مشتریان بر اساس نوع</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={customerTypeChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {customerTypeChartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4">روند درآمد</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Goal Status */}
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4">وضعیت اهداف</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={goalStatusChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Interaction Types */}
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4">انواع تعاملات</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(interactionsArray.reduce((acc: any, i: any) => {
              acc[i.type] = (acc[i.type] || 0) + 1;
              return acc;
            }, {})).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="glass-card">
        <h2 className="text-xl font-bold mb-4">جدول تفصیلی</h2>
        {reportType === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3">نام</th>
                  <th className="text-right p-3">نوع</th>
                  <th className="text-right p-3">وضعیت</th>
                  <th className="text-right p-3">نمره</th>
                  <th className="text-right p-3">تاریخ ثبت</th>
                </tr>
              </thead>
              <tbody>
                {customersArray.slice(0, 20).map((customer: any) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{customer.name}</td>
                    <td className="p-3">{customer.type}</td>
                    <td className="p-3">{customer.status}</td>
                    <td className="p-3">{customer.score}</td>
                    <td className="p-3">
                      {toJalali(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'revenue' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3">تاریخ</th>
                  <th className="text-right p-3">مبلغ</th>
                  <th className="text-right p-3">مرحله</th>
                  <th className="text-right p-3">توضیحات</th>
                </tr>
              </thead>
              <tbody>
                {interactionsArray
                  .filter((i: any) => i.type === 'deposit' && i.amount)
                  .slice(0, 20)
                  .map((interaction: any) => (
                    <tr key={interaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {toJalali(interaction.deposit_date || interaction.created_at)}
                      </td>
                      <td className="p-3">
                        {new Intl.NumberFormat('fa-IR').format(interaction.amount)} تومان
                      </td>
                      <td className="p-3">{interaction.deposit_stage || '-'}</td>
                      <td className="p-3">{interaction.description || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Reports;



