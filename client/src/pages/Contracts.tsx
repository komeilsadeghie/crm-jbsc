import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Edit, Trash2, Calendar, AlertCircle, RefreshCw, Download, FileText } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import { translateContractStatus, translateCurrency } from '../utils/translations';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { isSuccessfulResponse, hasResponseError, getErrorMessage, getSuccessMessage } from '../utils/mutationHelper';
import { useToast } from '../contexts/ToastContext';

const Contracts = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);

  const { data: contracts } = useQuery(
    'contracts', 
    async () => {
      const response = await api.get('/contracts');
      return response.data || [];
    },
    {
      refetchInterval: 60 * 1000, // ✅ هر 60 ثانیه یکبار refresh
      keepPreviousData: true, // ✅ نمایش داده قبلی تا داده جدید بیاید
    }
  );

  const { data: expiringContracts } = useQuery(
    'contracts-expiring', 
    async () => {
      const response = await api.get('/contracts/expiring-soon?days=30');
      return response.data || [];
    },
    {
      refetchInterval: 60 * 1000, // ✅ هر 60 ثانیه یکبار refresh
      keepPreviousData: true, // ✅ نمایش داده قبلی
    }
  );

  const createMutation = useMutation(
    (data: any) => api.post('/contracts', data),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('contracts');
        queryClient.invalidateQueries('contracts-expiring');
        setShowModal(false);
        setEditingContract(null);
        toast.showSuccess(getSuccessMessage(response, 'قرارداد با موفقیت ایجاد شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/contracts/${id}`, data),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('contracts');
        queryClient.invalidateQueries('contracts-expiring');
        setShowModal(false);
        setEditingContract(null);
        toast.showSuccess(getSuccessMessage(response, 'قرارداد با موفقیت به‌روزرسانی شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const renewMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.post(`/contracts/${id}/renew`, data),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('contracts');
        queryClient.invalidateQueries('contracts-expiring');
        toast.showSuccess(getSuccessMessage(response, 'قرارداد با موفقیت تمدید شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/contracts/${id}`),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('contracts');
        queryClient.invalidateQueries('contracts-expiring');
        toast.showSuccess(getSuccessMessage(response, 'قرارداد با موفقیت حذف شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'badge badge-neutral',
      active: 'badge badge-success',
      expired: 'badge badge-danger',
      cancelled: 'badge badge-warning',
    };
    return colors[status] || 'badge badge-neutral';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-info-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">قراردادها</h1>
        <button
          onClick={() => {
            setEditingContract(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          قرارداد جدید
        </button>
      </div>

      {expiringContracts && expiringContracts.length > 0 && (
        <div className="alert alert-warning">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-warning-600" size={20} />
            <h3 className="font-bold text-warning-800">قراردادهای در حال انقضا</h3>
          </div>
          <div className="space-y-2">
            {expiringContracts.map((contract: any) => (
              <div key={contract.id} className="flex justify-between items-center text-neutral-800">
                <span>{contract.title} - {contract.account_name}</span>
                <span className="text-sm text-warning-700">
                  انقضا: {toJalali(contract.end_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>شماره قرارداد</th>
                <th>عنوان</th>
                <th>مشتری</th>
                <th>شروع</th>
                <th>پایان</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {contracts?.map((contract: any) => (
                <tr key={contract.id}>
                  <td>{contract.contract_number}</td>
                  <td className="font-medium">{contract.title}</td>
                  <td>{contract.account_name}</td>
                  <td>{toJalali(contract.start_date)}</td>
                  <td>{contract.end_date ? toJalali(contract.end_date) : '-'}</td>
                  <td>
                    {contract.value ? toPersianNumber(new Intl.NumberFormat('fa-IR').format(contract.value)) : '-'} {contract.currency ? translateCurrency(contract.currency) : ''}
                  </td>
                  <td>
                    <span className={getStatusColor(contract.status)}>
                      {translateContractStatus(contract.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.get(`/contracts/${contract.id}/pdf`, {
                              responseType: 'blob',
                            });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `contract-${contract.contract_number}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error: any) {
                            toast.showError('خطا در دانلود PDF: ' + (error.response?.data?.error || error.message));
                          }
                        }}
                        className="text-success-600 hover:text-success-700 transition-colors p-1 rounded hover:bg-success-50"
                        title="دانلود PDF"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.get(`/contracts/${contract.id}/word`, {
                              responseType: 'blob',
                            });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `contract-${contract.contract_number}.docx`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error: any) {
                            toast.showError('خطا در دانلود Word: ' + (error.response?.data?.error || error.message));
                          }
                        }}
                        className="text-info-600 hover:text-info-700 transition-colors p-1 rounded hover:bg-info-50"
                        title="دانلود Word"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingContract(contract);
                          setShowModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-700 transition-colors p-1 rounded hover:bg-primary-50"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                      {contract.status === 'active' && contract.end_date && (
                        <button
                          onClick={() => {
                            if (confirm('آیا می‌خواهید این قرارداد را تمدید کنید؟')) {
                              renewMutation.mutate({
                                id: contract.id,
                                data: {},
                              });
                            }
                          }}
                          className="text-success-600 hover:text-success-700 transition-colors p-1 rounded hover:bg-success-50"
                          title="تمدید"
                        >
                          <RefreshCw size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('آیا مطمئن هستید؟')) {
                            deleteMutation.mutate(contract.id);
                          }
                        }}
                        className="text-danger-600 hover:text-danger-700 transition-colors p-1 rounded hover:bg-danger-50"
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
        </div>
      </div>
      </div>

      {showModal && (
        <ContractModal
          contract={editingContract}
          onClose={() => {
            setShowModal(false);
            setEditingContract(null);
          }}
          onSave={(data: any) => {
            if (editingContract) {
              updateMutation.mutate({ id: editingContract.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
};

const ContractModal = ({ contract, onClose, onSave }: any) => {
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

  const [formData, setFormData] = useState({
    account_id: contract?.account_id || '',
    title: contract?.title || '',
    description: contract?.description || '',
    contract_type: contract?.contract_type || '',
    contract_model: contract?.contract_model || '',
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    value: contract?.value || '',
    currency: contract?.currency || 'IRR',
    status: contract?.status || 'draft',
    auto_renew: contract?.auto_renew || false,
    renewal_notice_days: contract?.renewal_notice_days || 30,
    // Contract/Website details
    domain_name: contract?.domain_name || '',
    hosting_type: contract?.hosting_type || '',
    hosting_duration: contract?.hosting_duration || '',
    ssl_certificate: contract?.ssl_certificate || false,
    support_duration: contract?.support_duration || '',
    seo_package: contract?.seo_package || '',
    website_pages: contract?.website_pages || '',
    website_languages: contract?.website_languages || '',
    payment_terms: contract?.payment_terms || '',
    delivery_days: contract?.delivery_days || '',
    warranty_months: contract?.warranty_months || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.account_id || formData.account_id === '') {
      toast.showError('لطفاً مشتری را انتخاب کنید');
      return;
    }
    
    if (!formData.title || formData.title.trim() === '') {
      toast.showError('لطفاً عنوان قرارداد را وارد کنید');
      return;
    }
    
    const submitData = {
      ...formData,
      account_id: parseInt(formData.account_id.toString()),
      value: formData.value ? parseFloat(formData.value.toString()) : null,
      renewal_notice_days: formData.renewal_notice_days ? parseInt(formData.renewal_notice_days.toString()) : 30,
      hosting_duration: formData.hosting_duration ? parseInt(formData.hosting_duration.toString()) : null,
      ssl_certificate: formData.ssl_certificate ? 1 : 0,
      support_duration: formData.support_duration ? parseInt(formData.support_duration.toString()) : null,
      website_pages: formData.website_pages ? parseInt(formData.website_pages.toString()) : null,
      delivery_days: formData.delivery_days ? parseInt(formData.delivery_days.toString()) : null,
      warranty_months: formData.warranty_months ? parseInt(formData.warranty_months.toString()) : null,
    };
    
    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4 text-neutral-800">{contract ? 'ویرایش' : 'ایجاد'} قرارداد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">مشتری</label>
            <select
              required
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
                  <option key={acc.id} value={acc.id}>{acc.name || acc.company_name || `حساب #${acc.id}`}</option>
                ))
              ) : (
                <option disabled>مشتری‌ای یافت نشد (جدول accounts خالی است)</option>
              )}
            </select>
          </div>
          <div>
            <label className="label label-required">عنوان</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع قرارداد</label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                className="input"
              >
                <option value="">انتخاب نوع قرارداد</option>
                <option value="service">خدمات</option>
                <option value="product">محصول</option>
                <option value="maintenance">پشتیبانی</option>
                <option value="hosting">هاستینگ</option>
                <option value="website">وب‌سایت</option>
                <option value="seo">سئو</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div>
              <label className="label">مدل قرارداد</label>
              <select
                value={formData.contract_model || ''}
                onChange={(e) => setFormData({ ...formData, contract_model: e.target.value })}
                className="input"
              >
                <option value="">انتخاب مدل قرارداد</option>
                <option value="fixed_price">قیمت ثابت</option>
                <option value="hourly">ساعتی</option>
                <option value="monthly">ماهانه</option>
                <option value="yearly">سالانه</option>
                <option value="milestone">بر اساس milestone</option>
                <option value="retainer">Retainer</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label label-required">تاریخ شروع</label>
              <JalaliDatePicker
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                placeholder="تاریخ شروع را انتخاب کنید"
                required
              />
            </div>
            <div>
              <label className="label">تاریخ پایان</label>
              <JalaliDatePicker
                value={formData.end_date}
                onChange={(value) => setFormData({ ...formData, end_date: value })}
                placeholder="تاریخ پایان را انتخاب کنید"
              />
            </div>
            <div>
              <label className="label">مبلغ</label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">واحد پول</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input"
              >
                <option value="IRR">{translateCurrency('IRR')}</option>
                <option value="USD">{translateCurrency('USD')}</option>
                <option value="EUR">{translateCurrency('EUR')}</option>
              </select>
            </div>
            <div>
              <label className="label">وضعیت</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="draft">پیش‌نویس</option>
                <option value="active">فعال</option>
                <option value="expired">منقضی شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
            </div>
            <div>
              <label className="label">یادآور انقضا (روز)</label>
              <input
                type="number"
                value={formData.renewal_notice_days}
                onChange={(e) => setFormData({ ...formData, renewal_notice_days: parseInt(e.target.value) })}
                className="input"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.auto_renew}
              onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-neutral-700">تمدید خودکار</label>
          </div>

          {/* Contract/Website Details Section */}
          <div className="border-t border-neutral-200 pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4 text-neutral-800">جزئیات قرارداد/سایت</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">نام دامنه</label>
                <input
                  type="text"
                  value={formData.domain_name}
                  onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                  className="input"
                  placeholder="example.com"
                />
              </div>
              <div>
                <label className="label">نوع هاستینگ</label>
                <input
                  type="text"
                  value={formData.hosting_type}
                  onChange={(e) => setFormData({ ...formData, hosting_type: e.target.value })}
                  className="input"
                  placeholder="cpanel"
                />
              </div>
              <div>
                <label className="label">مدت هاستینگ (ماه)</label>
                <input
                  type="number"
                  value={formData.hosting_duration}
                  onChange={(e) => setFormData({ ...formData, hosting_duration: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">مدت پشتیبانی (ماه)</label>
                <input
                  type="number"
                  value={formData.support_duration}
                  onChange={(e) => setFormData({ ...formData, support_duration: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">پکیج SEO</label>
                <input
                  type="text"
                  value={formData.seo_package}
                  onChange={(e) => setFormData({ ...formData, seo_package: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">تعداد صفحات سایت</label>
                <input
                  type="number"
                  value={formData.website_pages}
                  onChange={(e) => setFormData({ ...formData, website_pages: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">زبانهای سایت</label>
                <input
                  type="text"
                  value={formData.website_languages}
                  onChange={(e) => setFormData({ ...formData, website_languages: e.target.value })}
                  className="input"
                  placeholder="fa,en"
                />
              </div>
              <div>
                <label className="label">شرایط پرداخت</label>
                <input
                  type="text"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="input"
                  placeholder="50%"
                />
              </div>
              <div>
                <label className="label">روزهای تحویل</label>
                <input
                  type="number"
                  value={formData.delivery_days}
                  onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">ضمانت (ماه)</label>
                <input
                  type="number"
                  value={formData.warranty_months}
                  onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ssl_certificate}
                  onChange={(e) => setFormData({ ...formData, ssl_certificate: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-neutral-700">گواهینامه SSL شامل</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary">
              ذخیره
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Contracts;

