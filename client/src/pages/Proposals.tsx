import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, FileText, Send, CheckCircle, XCircle, Eye, Calendar } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { useToast } from '../contexts/ToastContext';

const Proposals = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<any>(null);
  const [formData, setFormData] = useState({
    account_id: '',
    contact_id: '',
    deal_id: '',
    title: '',
    content: '',
    amount: '',
    currency: 'IRR',
    valid_until: '',
    items: [] as any[],
  });

  const { data: proposals, isLoading } = useQuery(
    ['proposals', searchTerm, filterStatus],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      const response = await api.get(`/proposals?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : [];
    }
  );

  const { data: accounts } = useQuery('accounts', async () => {
    const response = await api.get('/accounts');
    return Array.isArray(response.data) ? response.data : [];
  });

  const { data: contacts } = useQuery('contacts', async () => {
    const response = await api.get('/contacts');
    return Array.isArray(response.data) ? response.data : [];
  });

  const { data: deals } = useQuery('deals', async () => {
    const response = await api.get('/deals');
    return Array.isArray(response.data) ? response.data : [];
  });

  const createMutation = useMutation(
    (data: any) => api.post('/proposals', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('proposals');
        setShowModal(false);
        setEditingProposal(null);
        resetForm();
        toast.showSuccess('پروپوزال با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateMutation = useMutation(
    (data: any) => api.put(`/proposals/${editingProposal?.id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('proposals');
        setShowModal(false);
        setEditingProposal(null);
        resetForm();
        toast.showSuccess('پروپوزال با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/proposals/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('proposals');
        toast.showSuccess('پروپوزال با موفقیت حذف شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const sendMutation = useMutation(
    (id: number) => api.post(`/proposals/${id}/send`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('proposals');
        toast.showSuccess('پروپوزال با موفقیت ارسال شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const resetForm = () => {
    setFormData({
      account_id: '',
      contact_id: '',
      deal_id: '',
      title: '',
      content: '',
      amount: '',
      currency: 'IRR',
      valid_until: '',
      items: [],
    });
  };

  const handleEdit = (proposal: any) => {
    setEditingProposal(proposal);
    setFormData({
      account_id: proposal.account_id || '',
      contact_id: proposal.contact_id || '',
      deal_id: proposal.deal_id || '',
      title: proposal.title || '',
      content: proposal.content || '',
      amount: proposal.amount || '',
      currency: proposal.currency || 'IRR',
      valid_until: proposal.valid_until ? proposal.valid_until.split('T')[0] : '',
      items: proposal.items || [],
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id || !formData.title || !formData.content) {
      toast.showError('لطفاً فیلدهای الزامی را پر کنید');
      return;
    }

    const submitData = {
      ...formData,
      account_id: parseInt(formData.account_id.toString()),
      contact_id: formData.contact_id ? parseInt(formData.contact_id.toString()) : null,
      deal_id: formData.deal_id ? parseInt(formData.deal_id.toString()) : null,
      amount: formData.amount ? parseFloat(formData.amount.toString()) : null,
      items: formData.items.map((item: any) => ({
        ...item,
        quantity: parseFloat(item.quantity || 1),
        unit_price: parseFloat(item.unit_price || 0),
        tax_rate: parseFloat(item.tax_rate || 0),
      })),
    };

    if (editingProposal) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_name: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';
      case 'sent': return 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300';
      case 'accepted': return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300';
      case 'declined': return 'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300';
      case 'expired': return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300';
      default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'پیش‌نویس';
      case 'sent': return 'ارسال شده';
      case 'accepted': return 'قبول شده';
      case 'declined': return 'رد شده';
      case 'expired': return 'منقضی شده';
      default: return status;
    }
  };

  const filteredProposals = proposals?.filter((proposal: any) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        proposal.proposal_number?.toLowerCase().includes(searchLower) ||
        proposal.title?.toLowerCase().includes(searchLower) ||
        proposal.account_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  return (
    <div className="p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 md:pt-6 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 glass-card p-3 sm:p-4">
          <h1 className="page-heading-gradient text-xl sm:text-2xl md:text-3xl">پروپوزال‌ها</h1>
        <button
          onClick={() => {
            setEditingProposal(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          پروپوزال جدید
        </button>
      </div>

        {/* Filters */}
        <div className="glass-card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={20} />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pr-10"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="sent">ارسال شده</option>
          <option value="accepted">قبول شده</option>
          <option value="declined">رد شده</option>
          <option value="expired">منقضی شده</option>
        </select>
      </div>

        {/* Table */}
        <div className="glass-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-right">شماره</th>
              <th className="p-3 text-right">موضوع</th>
              <th className="p-3 text-right">مشتری</th>
              <th className="p-3 text-right">مبلغ</th>
              <th className="p-3 text-right">وضعیت</th>
              <th className="p-3 text-right">اعتبار تا</th>
              <th className="p-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center">در حال بارگذاری...</td>
              </tr>
            ) : filteredProposals.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center">پروپوزالی یافت نشد</td>
              </tr>
            ) : (
              filteredProposals.map((proposal: any) => (
                <tr key={proposal.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="p-3">{toPersianNumber(proposal.proposal_number)}</td>
                  <td className="p-3 font-medium">{proposal.title}</td>
                  <td className="p-3">{proposal.account_name || '-'}</td>
                  <td className="p-3">
                    {proposal.amount ? `${toPersianNumber(parseFloat(proposal.amount).toLocaleString())} ${proposal.currency}` : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(proposal.status)}`}>
                      {getStatusLabel(proposal.status)}
                    </span>
                  </td>
                  <td className="p-3">
                    {proposal.valid_until ? toJalali(proposal.valid_until) : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {proposal.status === 'draft' && (
                        <button
                          onClick={() => sendMutation.mutate(proposal.id)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="ارسال"
                        >
                          <Send size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(proposal)}
                        className="text-green-600 hover:text-green-800"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('آیا از حذف این پروپوزال اطمینان دارید؟')) {
                            deleteMutation.mutate(proposal.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

        {/* Modal */}
        {showModal && (
        <ProposalModal
          formData={formData}
          setFormData={setFormData}
          accounts={accounts || []}
          contacts={contacts || []}
          deals={deals || []}
          onClose={() => {
            setShowModal(false);
            setEditingProposal(null);
            resetForm();
          }}
          onSubmit={handleSubmit}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onItemChange={handleItemChange}
          isSubmitting={createMutation.isLoading || updateMutation.isLoading}
        />
        )}
      </div>
    </div>
  );
};

const ProposalModal = ({
  formData,
  setFormData,
  accounts,
  contacts,
  deals,
  onClose,
  onSubmit,
  onAddItem,
  onRemoveItem,
  onItemChange,
  isSubmitting,
}: any) => {
  const filteredContacts = contacts.filter((c: any) => 
    !formData.account_id || c.account_id === parseInt(formData.account_id.toString())
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">پروپوزال جدید</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">مشتری *</label>
              <select
                required
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="input w-full"
              >
                <option value="">انتخاب مشتری</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">مخاطب</label>
              <select
                value={formData.contact_id}
                onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                className="input w-full"
                disabled={!formData.account_id}
              >
                <option value="">انتخاب مخاطب</option>
                {filteredContacts.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">پروژه</label>
              <select
                value={formData.deal_id}
                onChange={(e) => setFormData({ ...formData, deal_id: e.target.value })}
                className="input w-full"
              >
                <option value="">انتخاب پروژه</option>
                {deals.map((deal: any) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">واحد پول</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input w-full"
              >
                <option value="IRR">ریال</option>
                <option value="USD">دلار</option>
                <option value="EUR">یورو</option>
              </select>
            </div>
          </div>

          <div>
              <label className="block text-sm font-medium mb-1">موضوع *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
                placeholder="موضوع پروپوزال"
              />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">محتوای پروپوزال *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input w-full"
              rows={6}
              placeholder="محتوای پروپوزال..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">مبلغ</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input w-full"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">اعتبار تا</label>
              <JalaliDatePicker
                value={formData.valid_until}
                onChange={(value) => setFormData({ ...formData, valid_until: value })}
                placeholder="تاریخ اعتبار را انتخاب کنید"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">آیتم‌ها</label>
              <button
                type="button"
                onClick={onAddItem}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                + افزودن آیتم
              </button>
            </div>
            {formData.items.length > 0 && (
              <div className="space-y-2">
                {formData.items.map((item: any, index: number) => (
                  <div key={index} className="flex gap-2 items-start p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="نام آیتم"
                        value={item.item_name}
                        onChange={(e) => onItemChange(index, 'item_name', e.target.value)}
                        className="input text-sm"
                      />
                      <input
                        type="number"
                        placeholder="تعداد"
                        value={item.quantity}
                        onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
                        className="input text-sm"
                      />
                      <input
                        type="number"
                        placeholder="قیمت واحد"
                        value={item.unit_price}
                        onChange={(e) => onItemChange(index, 'unit_price', e.target.value)}
                        className="input text-sm"
                      />
                      <input
                        type="number"
                        placeholder="مالیات %"
                        value={item.tax_rate}
                        onChange={(e) => onItemChange(index, 'tax_rate', e.target.value)}
                        className="input text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Proposals;

