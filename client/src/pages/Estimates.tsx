import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, FileText, Download, Printer, FileCheck } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import { useToast } from '../contexts/ToastContext';
import JalaliDatePicker from '../components/JalaliDatePicker';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

const Estimates = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number }>({ show: false });
  const [convertConfirm, setConvertConfirm] = useState<{ show: boolean; id?: number }>({ show: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [formData, setFormData] = useState({
    account_id: '',
    deal_id: '',
    amount: '',
    currency: 'IRR',
    status: 'draft',
    valid_until: '',
    notes: '',
    contract_type: '',
    domain_name: '',
    hosting_type: '',
    hosting_duration: '',
    ssl_included: false,
    maintenance_months: '',
    seo_package: '',
    site_pages: '',
    site_languages: '',
    payment_terms: '',
    delivery_days: '',
    warranty_months: '',
    items: [] as any[],
  });

  const { data: estimates, isLoading } = useQuery(
    ['estimates', searchTerm, filterStatus],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      const response = await api.get(`/estimates?${params.toString()}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    {
      retry: 1,
      onError: (error) => {
        console.error('Error fetching estimates:', error);
      }
    }
  );

  // Pagination calculations - memoized for performance
  const { totalItems, totalPages, paginatedEstimates } = useMemo(() => {
    const estimatesArray = Array.isArray(estimates) ? estimates : [];
    const total = estimatesArray.length;
    const pages = Math.ceil(total / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = estimatesArray.slice(start, end);
    
    return {
      totalItems: total,
      totalPages: pages,
      paginatedEstimates: paginated,
    };
  }, [estimates, currentPage, itemsPerPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useQuery('accounts', async () => {
    try {
      const response = await api.get('/accounts');
      const data = response.data;
      console.log('Accounts fetched:', data);
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      console.error('Error response:', error.response?.data);
      return [];
    }
  }, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: deals } = useQuery('deals', async () => {
    const response = await api.get('/deals');
    return Array.isArray(response.data) ? response.data : [];
  });

  const createMutation = useMutation(
    (data: any) => api.post('/estimates', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('estimates');
        setShowModal(false);
        setEditingEstimate(null);
        setFormData({
          account_id: '',
          deal_id: '',
          amount: '',
          currency: 'IRR',
          status: 'draft',
          valid_until: '',
          notes: '',
          contract_type: '',
          domain_name: '',
          hosting_type: '',
          hosting_duration: '',
          ssl_included: false,
          maintenance_months: '',
          seo_package: '',
          site_pages: '',
          site_languages: '',
          payment_terms: '',
          delivery_days: '',
          warranty_months: '',
          items: [],
        });
        alert('پیش‌فاکتور با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        console.error('Error creating estimate:', error);
        alert('خطا در ایجاد پیش‌فاکتور: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/estimates/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('estimates');
        setShowModal(false);
        setEditingEstimate(null);
        alert('پیش‌فاکتور با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        console.error('Error updating estimate:', error);
        alert('خطا در به‌روزرسانی پیش‌فاکتور: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/estimates/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('estimates');
        toast.showSuccess('پیش‌فاکتور با موفقیت حذف شد');
        setDeleteConfirm({ show: false });
      },
      onError: (error: any) => {
        toast.showError('خطا در حذف پیش‌فاکتور: ' + (error.response?.data?.error || error.message));
        setDeleteConfirm({ show: false });
      },
    }
  );

  const convertMutation = useMutation(
    (id: number) => api.post(`/estimates/${id}/convert-to-invoice`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('estimates');
        queryClient.invalidateQueries('invoices');
        toast.showSuccess('پیش‌فاکتور با موفقیت به فاکتور تبدیل شد');
        setConvertConfirm({ show: false });
      },
      onError: (error: any) => {
        toast.showError('خطا در تبدیل پیش‌فاکتور: ' + (error.response?.data?.error || error.message));
        setConvertConfirm({ show: false });
      },
    }
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
      sent: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
      accepted: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
      expired: 'bg-orange-100 text-orange-700',
    };
    return colors[status] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'پیش‌نویس',
      sent: 'ارسال شده',
      accepted: 'پذیرفته شده',
      declined: 'رد شده',
      expired: 'منقضی شده',
    };
    return labels[status] || status;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('لطفاً مبلغ را وارد کنید');
      return;
    }

    const data = {
      ...formData,
      account_id: formData.account_id ? parseInt(formData.account_id) : null,
      deal_id: formData.deal_id ? parseInt(formData.deal_id) : null,
      amount: parseFloat(formData.amount),
      hosting_duration: formData.hosting_duration ? parseInt(formData.hosting_duration) : null,
      maintenance_months: formData.maintenance_months ? parseInt(formData.maintenance_months) : null,
      site_pages: formData.site_pages ? parseInt(formData.site_pages) : null,
      delivery_days: formData.delivery_days ? parseInt(formData.delivery_days) : null,
      warranty_months: formData.warranty_months ? parseInt(formData.warranty_months) : null,
    };

    if (editingEstimate) {
      updateMutation.mutate({ id: editingEstimate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDownloadPDF = async (id: number) => {
    try {
      const response = await api.get(`/estimates/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `estimate-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      alert('خطا در دانلود PDF: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDownloadWord = async (id: number) => {
    try {
      const response = await api.get(`/estimates/${id}/word`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `estimate-${id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      alert('خطا در دانلود Word: ' + (error.response?.data?.error || error.message));
    }
  };

  const handlePrint = async (id: number) => {
    try {
      const response = await api.get(`/estimates/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error: any) {
      alert('خطا در پرینت: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (estimate: any) => {
    setEditingEstimate(estimate);
    setFormData({
      account_id: estimate.account_id?.toString() || '',
      deal_id: estimate.deal_id?.toString() || '',
      amount: estimate.amount?.toString() || '',
      currency: estimate.currency || 'IRR',
      status: estimate.status || 'draft',
      valid_until: estimate.valid_until ? estimate.valid_until.split('T')[0] : '',
      notes: estimate.notes || '',
      contract_type: estimate.contract_type || '',
      domain_name: estimate.domain_name || '',
      hosting_type: estimate.hosting_type || '',
      hosting_duration: estimate.hosting_duration?.toString() || '',
      ssl_included: estimate.ssl_included ? true : false,
      maintenance_months: estimate.maintenance_months?.toString() || '',
      seo_package: estimate.seo_package || '',
      site_pages: estimate.site_pages?.toString() || '',
      site_languages: estimate.site_languages || '',
      payment_terms: estimate.payment_terms || '',
      delivery_days: estimate.delivery_days?.toString() || '',
      warranty_months: estimate.warranty_months?.toString() || '',
      items: estimate.items || [],
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm({ show: true, id });
  };

  const handleConvert = (id: number) => {
    setConvertConfirm({ show: true, id });
  };

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center glass-card">
          <h1 className="page-heading-gradient">پیش‌فاکتورها</h1>
        <button
          onClick={() => {
            setEditingEstimate(null);
            setFormData({
              account_id: '',
              deal_id: '',
              amount: '',
              currency: 'IRR',
              status: 'draft',
              valid_until: '',
              notes: '',
              contract_type: '',
              domain_name: '',
              hosting_type: '',
              hosting_duration: '',
              ssl_included: false,
              maintenance_months: '',
              seo_package: '',
              site_pages: '',
              site_languages: '',
              payment_terms: '',
              delivery_days: '',
              warranty_months: '',
              items: [],
            });
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          پیش‌فاکتور جدید
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={20} />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border rounded-lg bg-white"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
          style={{ borderColor: 'rgba(0, 0, 0, 0.02)', borderImage: 'none' }}
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="sent">ارسال شده</option>
          <option value="accepted">پذیرفته شده</option>
          <option value="declined">رد شده</option>
          <option value="expired">منقضی شده</option>
        </select>
      </div>

      {/* Estimates List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="backdrop-blur-sm bg-white/50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">مشتری</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">مبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">اعتبار تا</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {paginatedEstimates && paginatedEstimates.length > 0 ? (
                paginatedEstimates.map((estimate: any) => (
                  <tr key={estimate.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-neutral-400 dark:text-neutral-500" />
                        <span className="font-medium">{toPersianNumber(estimate.estimate_number || estimate.id)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {estimate.account_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {toPersianNumber(estimate.amount?.toLocaleString('fa-IR') || '0')} {estimate.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(estimate.status)}`}>
                        {getStatusLabel(estimate.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {estimate.valid_until ? toJalali(estimate.valid_until) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPDF(estimate.id)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="دانلود PDF"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => handleDownloadWord(estimate.id)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="دانلود Word"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handlePrint(estimate.id)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="پرینت"
                        >
                          <Printer size={18} />
                        </button>
                        {estimate.status !== 'cancelled' && estimate.status !== 'declined' && (
                          <button
                            onClick={() => handleConvert(estimate.id)}
                            className="text-green-600 hover:text-green-800"
                            title="تبدیل به فاکتور"
                          >
                            <FileCheck size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(estimate)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="ویرایش"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(estimate.id)}
                          className="text-red-600 hover:text-red-800"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                    پیش‌فاکتوری یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalItems > 0 && (
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingEstimate ? 'ویرایش پیش‌فاکتور' : 'پیش‌فاکتور جدید'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">مشتری</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="input"
                  >
                    <option value="">انتخاب مشتری</option>
                    {accountsLoading ? (
                      <option disabled>در حال بارگذاری...</option>
                    ) : accountsError ? (
                      <option disabled>خطا در بارگذاری مشتری‌ها</option>
                    ) : accounts && accounts.length > 0 ? (
                      accounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name || acc.company_name || `حساب #${acc.id}`}
                        </option>
                      ))
                    ) : (
                      <option disabled>مشتری‌ای یافت نشد (جدول accounts خالی است)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">پروژه</label>
                  <select
                    value={formData.deal_id}
                    onChange={(e) => setFormData({ ...formData, deal_id: e.target.value })}
                    className="input"
                  >
                    <option value="">انتخاب پروژه</option>
                    {deals?.map((deal: any) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">مبلغ</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">واحد پول</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                  >
                    <option value="IRR">ریال</option>
                    <option value="USD">دلار</option>
                    <option value="EUR">یورو</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="draft">پیش‌نویس</option>
                    <option value="sent">ارسال شده</option>
                    <option value="accepted">پذیرفته شده</option>
                    <option value="declined">رد شده</option>
                    <option value="expired">منقضی شده</option>
                  </select>
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
              {/* Contract/Site Fields */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">جزئیات قرارداد/سایت</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">نوع قرارداد</label>
                    <select
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                      className="input"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="website">طراحی وب‌سایت</option>
                      <option value="hosting">هاستینگ</option>
                      <option value="domain">دامنه</option>
                      <option value="ssl">گواهینامه SSL</option>
                      <option value="maintenance">پشتیبانی و نگهداری</option>
                      <option value="seo">بهینه‌سازی موتور جستجو</option>
                      <option value="other">سایر</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">نام دامنه</label>
                    <input
                      type="text"
                      value={formData.domain_name}
                      onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                      className="input"
                      placeholder="example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">نوع هاستینگ</label>
                    <input
                      type="text"
                      value={formData.hosting_type}
                      onChange={(e) => setFormData({ ...formData, hosting_type: e.target.value })}
                      className="input"
                      placeholder="مثلاً: Linux, Windows"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">مدت هاستینگ (ماه)</label>
                    <input
                      type="number"
                      value={formData.hosting_duration}
                      onChange={(e) => setFormData({ ...formData, hosting_duration: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.ssl_included}
                        onChange={(e) => setFormData({ ...formData, ssl_included: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">گواهینامه SSL شامل</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">مدت پشتیبانی (ماه)</label>
                    <input
                      type="number"
                      value={formData.maintenance_months}
                      onChange={(e) => setFormData({ ...formData, maintenance_months: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">پکیج SEO</label>
                    <input
                      type="text"
                      value={formData.seo_package}
                      onChange={(e) => setFormData({ ...formData, seo_package: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">تعداد صفحات سایت</label>
                    <input
                      type="number"
                      value={formData.site_pages}
                      onChange={(e) => setFormData({ ...formData, site_pages: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">زبان‌های سایت</label>
                    <input
                      type="text"
                      value={formData.site_languages}
                      onChange={(e) => setFormData({ ...formData, site_languages: e.target.value })}
                      className="input"
                      placeholder="مثلاً: فارسی، انگلیسی"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">شرایط پرداخت</label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="input"
                      placeholder="مثلاً: 50% پیش‌پرداخت"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">روزهای تحویل</label>
                    <input
                      type="number"
                      value={formData.delivery_days}
                      onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">ضمانت (ماه)</label>
                    <input
                      type="number"
                      value={formData.warranty_months}
                      onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">یادداشت</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEstimate(null);
                  }}
                  className="px-6 py-2 border rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isLoading || updateMutation.isLoading
                    ? 'در حال ذخیره...'
                    : editingEstimate
                    ? 'ذخیره'
                    : 'ایجاد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Confirm Dialog */}
      {convertConfirm.show && (
        <ConfirmDialog
          title="تبدیل پیش‌فاکتور به فاکتور"
          message="آیا مطمئن هستید که می‌خواهید این پیش‌فاکتور را به فاکتور تبدیل کنید؟"
          onConfirm={() => {
            if (convertConfirm.id) {
              convertMutation.mutate(convertConfirm.id);
            }
          }}
          onCancel={() => setConvertConfirm({ show: false })}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm.show && (
        <ConfirmDialog
          title="حذف پیش‌فاکتور"
          message="آیا مطمئن هستید که می‌خواهید این پیش‌فاکتور را حذف کنید؟ این عمل قابل بازگشت نیست."
          onConfirm={() => {
            if (deleteConfirm.id) {
              deleteMutation.mutate(deleteConfirm.id);
            }
          }}
          onCancel={() => setDeleteConfirm({ show: false })}
        />
      )}
    </div>
  );
};

export default Estimates;

