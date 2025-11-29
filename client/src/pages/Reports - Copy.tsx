import { useQuery } from 'react-query';
import api from '../services/api';
import { Download, Filter } from 'lucide-react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Reports = () => {
  const [reportType, setReportType] = useState<'customers' | 'revenue' | 'coaching' | 'interactions'>('customers');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: kpis } = useQuery('dashboard-kpis', async () => {
    const response = await api.get('/dashboard/kpis');
    return response.data;
  });

  const { data: customers } = useQuery('customers', async () => {
    const response = await api.get('/customers');
    return response.data;
  });

  const { data: interactions } = useQuery('interactions', async () => {
    const response = await api.get('/interactions?limit=1000');
    return response.data;
  });

  const { data: goals } = useQuery('coaching-goals', async () => {
    const response = await api.get('/coaching/goals');
    return response.data;
  });

  // Prepare chart data
  const customerTypeData = customers?.reduce((acc: any, customer: any) => {
    acc[customer.type] = (acc[customer.type] || 0) + 1;
    return acc;
  }, {}) || {};

  const customerTypeChartData = Object.entries(customerTypeData).map(([name, value]) => ({
    name,
    value
  }));

  const revenueData = interactions
    ?.filter((i: any) => i.type === 'deposit' && i.amount)
    .reduce((acc: any, interaction: any) => {
      const month = new Date(interaction.created_at).toLocaleDateString('fa-IR', { month: 'short' });
      acc[month] = (acc[month] || 0) + parseFloat(interaction.amount);
      return acc;
    }, {}) || {};

  const revenueChartData = Object.entries(revenueData).map(([name, value]) => ({
    name,
    value
  }));

  const goalStatusData = goals?.reduce((acc: any, goal: any) => {
    acc[goal.status] = (acc[goal.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const goalStatusChartData = Object.entries(goalStatusData).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">گزارش‌گیری و تحلیل</h1>
        <div className="flex items-center gap-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="input w-48"
          >
            <option value="customers">گزارش مشتریان</option>
            <option value="revenue">گزارش درآمد</option>
            <option value="coaching">گزارش کوچینگ</option>
            <option value="interactions">گزارش تعاملات</option>
          </select>
          <button className="btn btn-secondary flex items-center gap-2">
            <Download size={20} />
            خروجی Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">کل مشتریان</p>
          <p className="text-3xl font-bold text-gray-800">{kpis?.total_customers || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">درآمد کل</p>
          <p className="text-3xl font-bold text-gray-800">
            {new Intl.NumberFormat('fa-IR').format(kpis?.total_revenue || 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">اهداف فعال</p>
          <p className="text-3xl font-bold text-gray-800">{kpis?.goals_in_progress || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">میانگین نمره</p>
          <p className="text-3xl font-bold text-gray-800">{kpis?.average_customer_score || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Type Distribution */}
        <div className="card">
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
        <div className="card">
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
        <div className="card">
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
        <div className="card">
          <h2 className="text-xl font-bold mb-4">انواع تعاملات</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={interactions?.reduce((acc: any, i: any) => {
              acc[i.type] = (acc[i.type] || 0) + 1;
              return acc;
            }, {}) ? Object.entries(interactions.reduce((acc: any, i: any) => {
              acc[i.type] = (acc[i.type] || 0) + 1;
              return acc;
            }, {})).map(([name, value]) => ({ name, value })) : []}>
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
      <div className="card">
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
                {customers?.slice(0, 20).map((customer: any) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{customer.name}</td>
                    <td className="p-3">{customer.type}</td>
                    <td className="p-3">{customer.status}</td>
                    <td className="p-3">{customer.score}</td>
                    <td className="p-3">
                      {new Date(customer.created_at).toLocaleDateString('fa-IR')}
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
                {interactions
                  ?.filter((i: any) => i.type === 'deposit' && i.amount)
                  .slice(0, 20)
                  .map((interaction: any) => (
                    <tr key={interaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(interaction.deposit_date || interaction.created_at).toLocaleDateString('fa-IR')}
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
  );
};

export default Reports;


