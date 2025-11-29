import { useQuery } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  DollarSign, 
  Target, 
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: kpis, isLoading } = useQuery('dashboard-kpis', async () => {
    const response = await api.get('/dashboard/kpis');
    return response.data;
  });

  const { data: roleKpis } = useQuery(
    ['role-kpis', user?.role],
    async () => {
      if (user?.role === 'coach') {
        const response = await api.get('/dashboard/coach-kpis');
        return response.data;
      } else if (user?.role === 'sales_manager' || user?.role === 'admin') {
        const response = await api.get('/dashboard/sales-kpis');
        return response.data;
      }
      return null;
    },
    { enabled: !!user }
  );

  const { data: pipeline } = useQuery('deals-pipeline', async () => {
    const response = await api.get('/deals/analytics/pipeline');
    return response.data;
  });

  const { data: leads } = useQuery('recent-leads', async () => {
    const response = await api.get('/leads?sortBy=created_at&order=DESC&limit=5');
    return response.data;
  });

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  const statCards = [
    {
      title: 'کل مشتریان',
      value: kpis?.total_customers || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'مشتریان فعال',
      value: kpis?.active_customers || 0,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'درآمد کل',
      value: new Intl.NumberFormat('fa-IR').format(kpis?.total_revenue || 0) + ' تومان',
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      title: 'میانگین نمره',
      value: kpis?.average_customer_score || 0,
      icon: Award,
      color: 'bg-purple-500',
    },
    {
      title: 'اهداف در حال انجام',
      value: kpis?.goals_in_progress || 0,
      icon: Target,
      color: 'bg-indigo-500',
    },
    {
      title: 'جلسات کوچینگ',
      value: kpis?.coaching_sessions_scheduled || 0,
      icon: Calendar,
      color: 'bg-pink-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">داشبورد</h1>
        <div className="text-sm text-gray-600">
          خوش آمدید، {user?.full_name || user?.username}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Pipeline */}
      {pipeline && pipeline.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">قیف فروش</h2>
            <Link to="/deals" className="text-primary-600 hover:underline text-sm">
              مشاهده همه →
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Role-specific KPIs */}
      {roleKpis && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">
            {user?.role === 'coach' ? 'آمار کوچینگ' : 'آمار فروش'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(roleKpis).map(([key, value]: [string, any]) => (
              <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">{key}</p>
                <p className="text-xl font-bold text-primary-600">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leads */}
      {leads && leads.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">آخرین سرنخ‌ها</h2>
            <Link to="/leads" className="text-primary-600 hover:underline text-sm">
              مشاهده همه →
            </Link>
          </div>
          <div className="space-y-3">
            {leads.map((lead: any) => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                  <p className="text-sm text-gray-600">{lead.company_name || lead.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (lead.lead_score || 0) >= 70 ? 'bg-green-500' :
                          (lead.lead_score || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${lead.lead_score || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{lead.lead_score || 0}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                    lead.status === 'qualified' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Customers */}
      {kpis?.top_customers && kpis.top_customers.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">مشتریان برتر (بر اساس نمره)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3">نام</th>
                  <th className="text-right p-3">نوع</th>
                  <th className="text-right p-3">نمره</th>
                  <th className="text-right p-3">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {kpis.top_customers.map((customer: any) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{customer.name}</td>
                    <td className="p-3">{customer.type}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded">
                        {customer.score}
                      </span>
                    </td>
                    <td className="p-3">{customer.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Interactions */}
      {kpis?.recent_interactions && kpis.recent_interactions.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">آخرین تعاملات</h2>
          <div className="space-y-3">
            {kpis.recent_interactions.slice(0, 5).map((interaction: any) => (
              <div key={interaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{interaction.customer_name || 'نامشخص'}</p>
                  <p className="text-sm text-gray-600">{interaction.type} - {interaction.subject}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(interaction.created_at).toLocaleDateString('fa-IR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


