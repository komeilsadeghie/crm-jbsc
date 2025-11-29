import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Filter, Edit, Trash2, TrendingUp, UserPlus } from 'lucide-react';

const Leads = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  const { data: leads, isLoading } = useQuery(
    ['leads', searchTerm, filterStatus, filterSource],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterSource) params.append('source', filterSource);
      const response = await api.get(`/leads?${params.toString()}`);
      return response.data;
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/leads/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('leads');
      },
    }
  );

  const convertMutation = useMutation(
    ({ id, account_name }: { id: number; account_name?: string }) =>
      api.post(`/leads/${id}/convert`, { account_name }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('leads');
        queryClient.invalidateQueries('accounts');
      },
    }
  );

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-green-100 text-green-700',
      disqualified: 'bg-red-100 text-red-700',
      converted: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">مدیریت سرنخ‌ها (Leads)</h1>
        <button
          onClick={() => {
            setEditingLead(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن سرنخ
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="new">جدید</option>
            <option value="contacted">تماس گرفته شده</option>
            <option value="qualified">کوالیسفای</option>
            <option value="disqualified">دیس‌کوال</option>
            <option value="converted">تبدیل شده</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="input"
          >
            <option value="">همه منابع</option>
            <option value="website">وب‌سایت</option>
            <option value="social">شبکه‌های اجتماعی</option>
            <option value="referral">معرفی</option>
            <option value="advertising">تبلیغات</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('');
              setFilterSource('');
            }}
            className="btn btn-secondary"
          >
            پاک کردن فیلترها
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3">نام</th>
                <th className="text-right p-3">شرکت</th>
                <th className="text-right p-3">ایمیل/تلفن</th>
                <th className="text-right p-3">منبع</th>
                <th className="text-right p-3">امتیاز</th>
                <th className="text-right p-3">وضعیت</th>
                <th className="text-right p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {leads?.map((lead: any) => (
                <tr key={lead.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td className="p-3">{lead.company_name || '-'}</td>
                  <td className="p-3">
                    <div className="text-sm">
                      {lead.email && <div>{lead.email}</div>}
                      {lead.phone && <div className="text-gray-600">{lead.phone}</div>}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">{lead.source || '-'}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                        <div
                          className={`h-2 rounded-full ${getScoreColor(lead.lead_score || 0)}`}
                          style={{ width: `${lead.lead_score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{lead.lead_score || 0}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {lead.status !== 'converted' && (
                        <button
                          onClick={() => {
                            if (confirm('آیا می‌خواهید این سرنخ را به حساب تبدیل کنید؟')) {
                              convertMutation.mutate({ id: lead.id });
                            }
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                          title="تبدیل به حساب"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingLead(lead);
                          setShowModal(true);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('آیا از حذف این سرنخ اطمینان دارید؟')) {
                            deleteMutation.mutate(lead.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!leads || leads.length === 0) && (
            <div className="text-center py-12 text-gray-500">سرنخی یافت نشد</div>
          )}
        </div>
      </div>

      {/* Lead Modal */}
      {showModal && (
        <LeadModal
          lead={editingLead}
          onClose={() => {
            setShowModal(false);
            setEditingLead(null);
          }}
        />
      )}
    </div>
  );
};

const LeadModal = ({ lead, onClose }: { lead: any; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: lead?.first_name || '',
    last_name: lead?.last_name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    whatsapp: lead?.whatsapp || '',
    company_name: lead?.company_name || '',
    source: lead?.source || '',
    tags: lead?.tags || '',
    status: lead?.status || 'new',
    industry: lead?.industry || '',
    budget_range: lead?.budget_range || '',
    decision_maker_role: lead?.decision_maker_role || '',
    notes: lead?.notes || '',
  });

  const mutation = useMutation(
    (data: any) => {
      if (lead) {
        return api.put(`/leads/${lead.id}`, data);
      }
      return api.post('/leads', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('leads');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {lead ? 'ویرایش سرنخ' : 'افزودن سرنخ جدید'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">نام *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نام خانوادگی</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ایمیل</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">تلفن</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">واتساپ</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نام شرکت</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">منبع</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="input"
              >
                <option value="">انتخاب منبع</option>
                <option value="website">وب‌سایت</option>
                <option value="social">شبکه‌های اجتماعی</option>
                <option value="referral">معرفی</option>
                <option value="advertising">تبلیغات</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">وضعیت</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="new">جدید</option>
                <option value="contacted">تماس گرفته شده</option>
                <option value="qualified">کوالیسفای</option>
                <option value="disqualified">دیس‌کوال</option>
                <option value="converted">تبدیل شده</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">صنعت</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">محدوده بودجه</label>
              <input
                type="text"
                value={formData.budget_range}
                onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                className="input"
                placeholder="مثلاً: 10-20 میلیون"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نقش تصمیم‌گیر</label>
              <input
                type="text"
                value={formData.decision_maker_role}
                onChange={(e) => setFormData({ ...formData, decision_maker_role: e.target.value })}
                className="input"
                placeholder="مثلاً: مدیر عامل"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">برچسب‌ها</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="input"
                placeholder="مثلاً: طراحی سایت، سئو"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">یادداشت‌ها</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
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

export default Leads;

