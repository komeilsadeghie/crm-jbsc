import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Filter, Edit, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { translateDealStage } from '../utils/translations';
import { toPersianNumber } from '../utils/numberHelper';
import { formatDateForInput } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import Pagination from '../components/Pagination';

const Deals = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'funnel'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: deals, isLoading, error } = useQuery(
    ['deals', searchTerm, filterStage],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStage) params.append('stage', filterStage);
      const response = await api.get(`/deals?${params.toString()}`);
      // Ensure we always return an array
      const data = response.data;
      return Array.isArray(data) ? data : [];
    },
    {
      retry: 1,
      onError: (error) => {
        console.error('Error fetching deals:', error);
      }
    }
  );

  const { data: pipeline, error: pipelineError } = useQuery(
    'deals-pipeline',
    async () => {
      const response = await api.get('/deals/analytics/pipeline');
      // Ensure we always return an array
      const data = response.data;
      return Array.isArray(data) ? data : [];
    },
    {
      retry: 1,
      onError: (error) => {
        console.error('Error fetching pipeline:', error);
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/deals/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals');
        queryClient.invalidateQueries('deals-pipeline');
      },
    }
  );

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      discovery: 'badge badge-info',
      proposal: 'badge badge-warning',
      contract: 'badge badge-primary',
      design: 'badge badge-primary',
      development: 'badge badge-success',
      qa: 'badge badge-warning',
      delivery: 'badge badge-success',
      support: 'badge badge-neutral',
    };
    return colors[stage] || 'badge badge-neutral';
  };

  const getStageLabel = (stage: string) => {
    return translateDealStage(stage);
  };

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">خطا در بارگذاری پروژه‌ها</div>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          تلاش مجدد
        </button>
      </div>
    );
  }

  // Ensure deals is always an array
  const dealsArray = Array.isArray(deals) ? deals : [];
  const pipelineArray = Array.isArray(pipeline) ? pipeline : [];

  // Pagination calculations for list view
  const totalItems = dealsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeals = dealsArray.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const totalValue = dealsArray.reduce((sum: number, deal: any) => sum + (deal.budget || 0), 0);
  const weightedValue = dealsArray.reduce((sum: number, deal: any) => 
    sum + ((deal.budget || 0) * (deal.probability || 0) / 100), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-info-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center card">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">مدیریت پروژه‌ها (Deals)</h1>
          <div className="flex items-center gap-6 mt-2 text-sm text-neutral-600">
            <span>ارزش کل: <strong>{toPersianNumber(new Intl.NumberFormat('fa-IR').format(totalValue))}</strong> تومان</span>
            <span>ارزش پیش‌بینی شده: <strong>{toPersianNumber(new Intl.NumberFormat('fa-IR').format(weightedValue))}</strong> تومان</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600 font-medium' : 'text-neutral-600 hover:text-neutral-800'}`}
            >
              لیست
            </button>
            <button
              onClick={() => setViewMode('funnel')}
              className={`px-4 py-2 rounded transition-colors ${viewMode === 'funnel' ? 'bg-white shadow-sm text-primary-600 font-medium' : 'text-neutral-600 hover:text-neutral-800'}`}
            >
              قیف فروش
            </button>
          </div>
          <button
            onClick={() => {
              setEditingDeal(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            افزودن پروژه
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10"
            />
          </div>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="input"
          >
            <option value="">همه مراحل</option>
            <option value="discovery">کشف نیاز</option>
            <option value="proposal">پروپوزال</option>
            <option value="contract">قرارداد</option>
            <option value="design">طراحی</option>
            <option value="development">توسعه</option>
            <option value="qa">تست و QA</option>
            <option value="delivery">تحویل</option>
            <option value="support">پشتیبانی</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStage('');
            }}
            className="btn btn-secondary"
          >
            پاک کردن فیلترها
          </button>
        </div>
      </div>

      {/* Funnel View */}
      {viewMode === 'funnel' && pipelineArray.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">قیف فروش</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={pipelineArray}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1">
                  {pipelineArray.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getStageColor(entry.stage).split(' ')[0].replace('bg-', '')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              {pipelineArray.map((stage: any) => (
                <div key={stage.stage} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-3 py-1 rounded text-sm ${getStageColor(stage.stage)}`}>
                      {getStageLabel(stage.stage)}
                    </span>
                    <span className="font-bold">{toPersianNumber(stage.count)} پروژه</span>
                  </div>
                  <div className="text-sm text-neutral-600 space-y-1">
                    <div>ارزش کل: {toPersianNumber(new Intl.NumberFormat('fa-IR').format(stage.total_value || 0))} تومان</div>
                    <div>ارزش پیش‌بینی: {toPersianNumber(new Intl.NumberFormat('fa-IR').format(stage.weighted_value || 0))} تومان</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>عنوان پروژه</th>
                  <th>مشتری</th>
                  <th>مرحله</th>
                  <th>بودجه</th>
                  <th>احتمال</th>
                  <th>ارزش پیش‌بینی</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDeals.map((deal: any) => {
                  const weightedValue = (deal.budget || 0) * (deal.probability || 0) / 100;
                  return (
                    <tr key={deal.id}>
                      <td className="font-medium">{deal.title}</td>
                      <td>{deal.account_name || '-'}</td>
                      <td>
                        <span className={getStageColor(deal.stage)}>
                          {getStageLabel(deal.stage)}
                        </span>
                      </td>
                      <td>
                        {deal.budget ? toPersianNumber(new Intl.NumberFormat('fa-IR').format(deal.budget)) + ' تومان' : '-'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-200 rounded-full h-2 w-20">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${deal.probability || 0}%` }}
                            />
                          </div>
                          <span className="text-sm">{toPersianNumber(deal.probability || 0)}%</span>
                        </div>
                      </td>
                      <td className="font-medium">
                        {toPersianNumber(new Intl.NumberFormat('fa-IR').format(weightedValue))} تومان
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingDeal(deal);
                              setShowModal(true);
                            }}
                            className="text-success-600 hover:text-success-700 hover:bg-success-50 p-2 rounded transition-colors"
                            title="ویرایش"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('آیا از حذف این پروژه اطمینان دارید؟')) {
                                deleteMutation.mutate(deal.id);
                              }
                            }}
                            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 p-2 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          {dealsArray.length === 0 && (
            <div className="text-center py-12 text-neutral-500">پروژه‌ای یافت نشد</div>
          )}
        </div>
        
        {/* Pagination */}
        {dealsArray.length > 0 && (
          <div className="px-4 sm:px-6 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
      )}

      {/* Deal Modal */}
      {showModal && (
        <DealModal
          deal={editingDeal}
          onClose={() => {
            setShowModal(false);
            setEditingDeal(null);
          }}
        />
      )}
      </div>
    </div>
  );
};

const DealModal = ({ deal, onClose }: { deal: any; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    account_id: deal?.account_id || '',
    contact_id: deal?.contact_id || '',
    title: deal?.title || '',
    stage: deal?.stage || 'discovery',
    budget: deal?.budget || '',
    probability: deal?.probability || 0,
    services: deal?.services || '',
    site_model: deal?.site_model || '',
    designer_id: deal?.designer_id || '',
    start_date: deal?.start_date ? formatDateForInput(deal.start_date) : '',
    expected_delivery_date: deal?.expected_delivery_date ? formatDateForInput(deal.expected_delivery_date) : '',
    notes: deal?.notes || '',
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery('accounts', async () => {
    try {
      const response = await api.get('/accounts');
      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
  });

  const { data: users } = useQuery('users', async () => {
    // This would need a users endpoint
    return [];
  });

  const mutation = useMutation(
    (data: any) => {
      if (deal) {
        return api.put(`/deals/${deal.id}`, data);
      }
      return api.post('/deals', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals');
        queryClient.invalidateQueries('deals-pipeline');
        alert('پروژه با موفقیت ذخیره شد');
        onClose();
      },
      onError: (error: any) => {
        console.error('Error saving deal:', error);
        alert(error.response?.data?.error || 'خطا در ذخیره پروژه');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      account_id: formData.account_id ? parseInt(formData.account_id) : null,
      contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
      designer_id: formData.designer_id ? parseInt(formData.designer_id) : null,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      probability: parseInt(formData.probability),
    };
    console.log('Submitting deal form:', submitData);
    mutation.mutate(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral-800">
            {deal ? 'ویرایش پروژه' : 'افزودن پروژه جدید'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 transition-colors">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">عنوان پروژه *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">مشتری</label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب مشتری</option>
                {accountsLoading ? (
                  <option disabled>در حال بارگذاری...</option>
                ) : accounts && accounts.length > 0 ? (
                  accounts.map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.company_name || `حساب #${account.id}`}
                    </option>
                  ))
                ) : (
                  <option disabled>مشتری‌ای یافت نشد</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">مرحله *</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="input"
                required
              >
                <option value="discovery">کشف نیاز</option>
                <option value="proposal">پروپوزال</option>
                <option value="contract">قرارداد</option>
                <option value="design">طراحی</option>
                <option value="development">توسعه</option>
                <option value="qa">تست و QA</option>
                <option value="delivery">تحویل</option>
                <option value="support">پشتیبانی</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">بودجه (تومان)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">احتمال برد (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">مدل سایت</label>
              <select
                value={formData.site_model}
                onChange={(e) => setFormData({ ...formData, site_model: e.target.value })}
                className="input"
              >
                <option value="">انتخاب مدل</option>
                <option value="wordpress">WordPress</option>
                <option value="shopify">Shopify</option>
                <option value="custom">سفارشی</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">طراح مسئول</label>
              <select
                value={formData.designer_id}
                onChange={(e) => setFormData({ ...formData, designer_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب طراح</option>
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاریخ شروع</label>
              <JalaliDatePicker
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                placeholder="تاریخ شروع را انتخاب کنید"
              />
            </div>
            <div>
              <label className="label">تاریخ تحویل پیش‌بینی شده</label>
              <JalaliDatePicker
                value={formData.expected_delivery_date}
                onChange={(value) => setFormData({ ...formData, expected_delivery_date: value })}
                placeholder="تاریخ تحویل را انتخاب کنید"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">خدمات</label>
            <input
              type="text"
              value={formData.services}
              onChange={(e) => setFormData({ ...formData, services: e.target.value })}
              className="input"
              placeholder="مثلاً: طراحی سایت، سئو، بازاریابی"
            />
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

export default Deals;

