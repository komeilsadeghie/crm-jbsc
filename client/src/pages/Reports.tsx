import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { Download, Filter, FileText, TrendingUp, Users, DollarSign, Calendar, Target, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { toJalali, formatDateForInput, getJalaliDayjs } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import AdvancedFilter from '../components/AdvancedFilter';
import { toPersianNumber } from '../utils/numberHelper';

const Reports = () => {
  const [reportType, setReportType] = useState<'sales' | 'payments' | 'expenses' | 'time' | 'customers' | 'coaching' | 'leads' | 'deals' | 'tasks' | 'tickets'>('sales');
  const currentJalali = getJalaliDayjs();
  const oneMonthAgo = currentJalali.subtract(1, 'month');
  const [dateRange, setDateRange] = useState({ 
    start: formatDateForInput(oneMonthAgo.toDate()),
    end: formatDateForInput(new Date())
  });
  const [filters, setFilters] = useState<any>({});
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');

  // Get filter config based on report type
  const getFilterConfig = () => {
    switch (reportType) {
      case 'customers':
        return {
          dateRange: true,
          status: { label: 'وضعیت', options: [
            { value: 'active', label: 'فعال' },
            { value: 'inactive', label: 'غیرفعال' },
            { value: 'lead', label: 'لید' },
          ]},
          type: { label: 'نوع', options: [
            { value: 'coaching', label: 'کوچینگ' },
            { value: 'individual', label: 'شخص' },
            { value: 'company', label: 'شرکت' },
          ]},
        };
      case 'coaching':
        return {
          dateRange: true,
          status: { label: 'وضعیت جلسه', options: [
            { value: 'scheduled', label: 'زمان‌بندی شده' },
            { value: 'completed', label: 'تکمیل شده' },
            { value: 'cancelled', label: 'لغو شده' },
          ]},
        };
      case 'leads':
        return {
          dateRange: true,
          status: { label: 'وضعیت', options: [
            { value: 'new', label: 'جدید' },
            { value: 'contacted', label: 'تماس گرفته شده' },
            { value: 'qualified', label: 'واجد شرایط' },
            { value: 'converted', label: 'تبدیل شده' },
          ]},
        };
      case 'expenses':
        return {
          dateRange: true,
          amountRange: { label: 'بازه مبلغ' },
          category: { label: 'دسته‌بندی', options: [] },
        };
      default:
        return { dateRange: true };
    }
  };

  // Fetch data based on report type
  const { data: reportData, isLoading } = useQuery(
    ['reports', reportType, dateRange.start, dateRange.end, filters],
    async () => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });

      const endpoints: any = {
        sales: '/reports/sales',
        payments: '/reports/payments',
        expenses: '/reports/expenses',
        customers: '/reports/customers',
        coaching: '/reports/coaching',
        leads: '/reports/leads',
        deals: '/reports/deals',
        tasks: '/reports/tasks',
        tickets: '/reports/tickets',
      };

      const endpoint = endpoints[reportType] || '/reports/sales';
      const response = await api.get(`${endpoint}?${params.toString()}`);
      return response.data || [];
    },
    { enabled: !!dateRange.start && !!dateRange.end }
  );

  // Get categories for expenses
  const { data: expenseCategories } = useQuery(
    'expense-categories',
    async () => {
      const response = await api.get('/expenses/categories');
      return response.data || [];
    },
    { enabled: reportType === 'expenses' }
  );

  // Update filter config with dynamic data
  const filterConfig = getFilterConfig();
  if (reportType === 'expenses' && expenseCategories && filterConfig.category) {
    filterConfig.category.options = expenseCategories.map((cat: any) => ({
      value: cat.name,
      label: cat.name,
    }));
  }

  // Export functionality
  const handleExport = () => {
    if (!reportData || reportData.length === 0) {
      alert('داده‌ای برای خروجی گیری وجود ندارد');
      return;
    }

    if (exportFormat === 'csv') {
      const headers = Object.keys(reportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...reportData.map((row: any) =>
          headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `گزارش_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else if (exportFormat === 'excel') {
      // Create Excel-like CSV with BOM for Excel
      const headers = Object.keys(reportData[0] || {});
      const csvContent = [
        headers.join('\t'),
        ...reportData.map((row: any) =>
          headers.map(header => (row[header] || '').toString()).join('\t')
        )
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `گزارش_${reportType}_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!reportData || !Array.isArray(reportData)) return [];
    
    return reportData.map((item: any) => ({
      name: item.date ? toJalali(item.date).split(' ')[0] : item.name || 'نامشخص',
      value: item.total_revenue || item.amount || item.total || item.count || 0,
      ...item,
    }));
  };

  const chartData = prepareChartData();

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              گزارش‌گیری حرفه‌ای
            </h1>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={handleExport}
                disabled={!reportData || reportData.length === 0}
                className="btn btn-primary flex items-center gap-2"
              >
                <Download size={20} />
                خروجی {exportFormat === 'excel' ? 'Excel' : 'CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="glass-card">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'sales', label: 'فروش', icon: DollarSign },
              { id: 'payments', label: 'پرداخت‌ها', icon: TrendingUp },
              { id: 'expenses', label: 'هزینه‌ها', icon: FileText },
              { id: 'customers', label: 'مشتریان', icon: Users },
              { id: 'coaching', label: 'کوچینگ', icon: Target },
              { id: 'leads', label: 'لیدها', icon: Users },
              { id: 'deals', label: 'معاملات', icon: DollarSign },
              { id: 'tasks', label: 'وظایف', icon: FileText },
              { id: 'tickets', label: 'تیکت‌ها', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  reportType === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">از تاریخ</label>
              <JalaliDatePicker
                value={dateRange.start}
                onChange={(value) => setDateRange({ ...dateRange, start: value })}
                placeholder="از تاریخ"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">تا تاریخ</label>
              <JalaliDatePicker
                value={dateRange.end}
                onChange={(value) => setDateRange({ ...dateRange, end: value })}
                placeholder="تا تاریخ"
              />
            </div>
            <AdvancedFilter
              filters={filters}
              onFiltersChange={setFilters}
              filterConfig={filterConfig}
            />
          </div>
        </div>

        {/* Charts */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">در حال بارگذاری...</div>
        ) : chartData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="glass-card">
              <h3 className="text-lg font-bold mb-4">نمودار میله‌ای</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line Chart */}
            <div className="glass-card">
              <h3 className="text-lg font-bold mb-4">نمودار خطی</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="glass-card lg:col-span-2">
              <h3 className="text-lg font-bold mb-4">توزیع</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="glass-card text-center py-12 text-gray-500">
            داده‌ای برای نمایش وجود ندارد
          </div>
        )}

        {/* Data Table */}
        {reportData && reportData.length > 0 && (
          <div className="glass-card">
            <h3 className="text-lg font-bold mb-4">جدول داده‌ها</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {Object.keys(reportData[0] || {}).map((key) => (
                      <th key={key} className="text-right p-3 font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      {Object.values(row).map((value: any, cellIdx: number) => (
                        <td key={cellIdx} className="p-3 text-sm">
                          {typeof value === 'number' ? toPersianNumber(value.toString()) : String(value || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
