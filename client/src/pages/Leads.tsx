import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Filter, Edit, Trash2, TrendingUp, UserPlus, List, Kanban as KanbanIcon } from 'lucide-react';
import { translateLeadStatus, translateSource } from '../utils/translations';
import { toPersianNumber } from '../utils/numberHelper';
import { BulkDeleteActions, SelectAllCheckbox, RowCheckbox } from '../components/BulkDeleteActions';
import Pagination from '../components/Pagination';
import { hasResponseError, getErrorMessage, getSuccessMessage } from '../utils/mutationHelper';
import { useToast } from '../contexts/ToastContext';

const Leads = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: leads, isLoading, error } = useQuery(
    ['leads', searchTerm, filterStatus, filterSource],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterSource) params.append('source', filterSource);
      const response = await api.get(`/leads?${params.toString()}`);
      // Ensure we always return an array
      const data = response.data;
      return Array.isArray(data) ? data : [];
    },
    {
      retry: 1,
      refetchInterval: 60 * 1000, // ✅ هر 60 ثانیه یکبار refresh
      keepPreviousData: true, // ✅ نمایش داده قبلی
      onError: (error) => {
        console.error('Error fetching leads:', error);
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/leads/${id}`),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('leads');
        queryClient.invalidateQueries('leads-kanban');
        setSelectedIds([]);
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const bulkDeleteMutation = useMutation(
    (ids: number[]) => api.post('/leads/bulk-delete', { ids }),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('leads');
        setSelectedIds([]);
        const deletedCount = data.data?.deletedCount || data.data?.ids?.length || 0;
        toast.showSuccess(`${toPersianNumber(deletedCount)} سرنخ با موفقیت حذف شد`);
      },
      onError: (error: any) => {
        toast.showError('خطا در حذف گروهی: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const { data: kanbanBoard } = useQuery(
    'leads-kanban',
    async () => {
      const response = await api.get('/leads/kanban/board');
      return response.data;
    },
    {
      enabled: viewMode === 'kanban',
      refetchInterval: 30 * 1000, // ✅ هر 30 ثانیه یکبار refresh (برای بورد Kanban)
      keepPreviousData: true, // ✅ نمایش داده قبلی
    }
  );

  const convertMutation = useMutation(
    ({ id, account_name }: { id: number; account_name?: string }) =>
      api.post(`/leads/${id}/convert`, { account_name }),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('leads');
        queryClient.invalidateQueries('leads-kanban');
        queryClient.invalidateQueries('accounts');
        toast.showSuccess(getSuccessMessage(response, 'سرنخ با موفقیت تبدیل شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const updatePositionMutation = useMutation(
    ({ id, position, kanban_stage }: { id: number; position: number; kanban_stage: string }) =>
      api.put(`/leads/${id}/position`, { position, kanban_stage }),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          console.error('Server returned error in response:', response.data.error);
          return;
        }
        queryClient.invalidateQueries('leads-kanban');
        queryClient.invalidateQueries('leads');
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          console.error('Error updating lead position:', error);
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    e.dataTransfer.setData('lead', JSON.stringify(lead));
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const leadData = JSON.parse(e.dataTransfer.getData('lead'));
    const leadsInStage = kanbanBoard?.[stage]?.leads || [];
    updatePositionMutation.mutate({
      id: leadData.id,
      position: leadsInStage.length,
      kanban_stage: stage,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-success-500';
    if (score >= 40) return 'bg-warning-500';
    return 'bg-danger-500';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'badge badge-info',
      contacted: 'badge badge-warning',
      qualified: 'badge badge-success',
      disqualified: 'badge badge-danger',
      converted: 'badge badge-primary',
    };
    return colors[status] || 'badge badge-neutral';
  };

  if (isLoading) {
    return <div className="text-center py-12 text-neutral-800">در حال بارگذاری...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-danger-600 mb-4">خطا در بارگذاری سرنخ‌ها</div>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          تلاش مجدد
        </button>
      </div>
    );
  }

  // Ensure leads is always an array
  const leadsArray = Array.isArray(leads) ? leads : [];

  // Pagination calculations
  const totalItems = leadsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = leadsArray.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.showError('لطفاً حداقل یک مورد را انتخاب کنید');
      return;
    }
    if (confirm(`آیا از حذف ${toPersianNumber(selectedIds.length)} سرنخ انتخاب شده اطمینان دارید؟`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedLeads.map((l: any) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const isAllSelected = paginatedLeads.length > 0 && 
    paginatedLeads.every((l: any) => selectedIds.includes(l.id));
  const isIndeterminate = selectedIds.length > 0 && 
    selectedIds.length < paginatedLeads.length && 
    paginatedLeads.some((l: any) => selectedIds.includes(l.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-info-50/30 p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 card p-3 sm:p-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">مدیریت سرنخ‌ها (Leads)</h1>
        <div className="flex gap-2">
          {viewMode === 'list' && (
            <BulkDeleteActions
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onBulkDelete={handleBulkDelete}
              isAllSelected={isAllSelected}
              isIndeterminate={isIndeterminate}
              isLoading={bulkDeleteMutation.isLoading}
              totalItems={leadsArray.length}
              itemName="سرنخ"
            />
          )}
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'list' ? 'btn btn-primary' : 'btn btn-secondary'}`}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'btn btn-primary' : 'btn btn-secondary'}`}
          >
            <KanbanIcon size={20} />
          </button>
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
      </div>

      {/* Filters */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      )}

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-4 gap-4">
          {kanbanBoard && Object.entries(kanbanBoard).map(([stage, data]: [string, any]) => {
            const leads = Array.isArray(data?.leads) ? data.leads : [];
            const stageInfo = data?.stage || { name: stage, label: stage, color: '#3B82F6' };
            return (
              <div
                key={stage}
                className="card p-4 min-h-[500px]"
                style={{ borderTop: `4px solid ${stageInfo.color}` }}
                onDrop={(e) => handleDrop(e, stage)}
                onDragOver={handleDragOver}
              >
                <h3 className="font-bold mb-4 text-neutral-700">
                  {stageInfo.label || stage} ({toPersianNumber(leads.length)})
                </h3>
                <div className="space-y-2">
                  {leads.map((lead: any) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onClick={() => {
                        setEditingLead(lead);
                        setShowModal(true);
                      }}
                      className="card-hover p-3 cursor-move"
                    >
                      <div className="font-medium mb-1 text-neutral-800">
                        {lead.first_name} {lead.last_name}
                      </div>
                      {lead.company_name && (
                        <div className="text-xs text-neutral-600 mb-1">{lead.company_name}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-neutral-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${getScoreColor(lead.lead_score || 0)}`}
                            style={{ width: `${lead.lead_score || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-neutral-700">{toPersianNumber(lead.lead_score || 0)}</span>
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <div className="text-center text-neutral-400 text-sm py-8">
                      خالی
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      /* Leads Table */
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <SelectAllCheckbox
                  isAllSelected={isAllSelected}
                  isIndeterminate={isIndeterminate}
                  onSelectAll={handleSelectAll}
                />
                <th>نام</th>
                <th>شرکت</th>
                <th>ایمیل/تلفن</th>
                <th>منبع</th>
                <th>امتیاز</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead: any) => (
                <tr key={lead.id} className={selectedIds.includes(lead.id) ? 'bg-primary-50' : ''}>
                  <RowCheckbox
                    id={lead.id}
                    selectedIds={selectedIds}
                    onSelect={handleSelectOne}
                  />
                  <td className="font-medium">
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td>{lead.company_name || '-'}</td>
                  <td>
                    <div className="text-sm">
                      {lead.email && <div className="text-neutral-800">{lead.email}</div>}
                      {lead.phone && <div className="text-neutral-600">{lead.phone}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{lead.source ? translateSource(lead.source) : '-'}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-neutral-200 rounded-full h-2 w-16">
                        <div
                          className={`h-2 rounded-full ${getScoreColor(lead.lead_score || 0)}`}
                          style={{ width: `${lead.lead_score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-neutral-700">{lead.lead_score || 0}</span>
                    </div>
                  </td>
                  <td>
                    <span className={getStatusColor(lead.status)}>
                      {translateLeadStatus(lead.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {lead.status !== 'converted' && (
                        <button
                          onClick={() => {
                            if (confirm('آیا می‌خواهید این سرنخ را به حساب تبدیل کنید؟')) {
                              convertMutation.mutate({ id: lead.id });
                            }
                          }}
                          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-2 rounded transition-colors"
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
                        className="text-success-600 hover:text-success-700 hover:bg-success-50 p-2 rounded transition-colors"
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
                        className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 p-2 rounded transition-colors"
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
          {leadsArray.length === 0 && (
            <div className="text-center py-12 text-neutral-500">سرنخی یافت نشد</div>
          )}
        </div>
        
        {/* Pagination */}
        {leadsArray.length > 0 && (
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
  const toast = useToast();
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
        toast.showSuccess('سرنخ با موفقیت ذخیره شد');
        onClose();
      },
      onError: (error: any) => {
        console.error('Error saving lead:', error);
        toast.showError(error.response?.data?.error || 'خطا در ذخیره سرنخ');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting lead form:', formData);
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral-800">
            {lead ? 'ویرایش سرنخ' : 'افزودن سرنخ جدید'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 transition-colors">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label label-required">نام</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">نام خانوادگی</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">ایمیل</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">تلفن</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">واتساپ</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">نام شرکت</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">منبع</label>
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
              <label className="label">وضعیت</label>
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
              <label className="label">صنعت</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">محدوده بودجه</label>
              <input
                type="text"
                value={formData.budget_range}
                onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                className="input"
                placeholder="مثلاً: 10-20 میلیون"
              />
            </div>
            <div>
              <label className="label">نقش تصمیم‌گیر</label>
              <input
                type="text"
                value={formData.decision_maker_role}
                onChange={(e) => setFormData({ ...formData, decision_maker_role: e.target.value })}
                className="input"
                placeholder="مثلاً: مدیر عامل"
              />
            </div>
            <div>
              <label className="label">برچسب‌ها</label>
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
            <label className="label">یادداشت‌ها</label>
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


