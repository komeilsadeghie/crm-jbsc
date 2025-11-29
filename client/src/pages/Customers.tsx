import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Filter, Edit, Trash2, Eye, CheckSquare, Square } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { translateCustomerType, translateCustomerStatus } from '../utils/translations';

const Customers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: customers, isLoading, error } = useQuery(
    ['customers', searchTerm, filterType, filterStatus],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      const response = await api.get(`/customers?${params.toString()}`);
      // Ensure we always return an array
      const data = response.data;
      return Array.isArray(data) ? data : [];
    },
    {
      retry: 1,
      onError: (error) => {
        console.error('Error fetching customers:', error);
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/customers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
        setSelectedIds([]);
      },
    }
  );

  const bulkDeleteMutation = useMutation(
    (ids: number[]) => api.post('/customers/bulk-delete', { ids }),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('customers');
        setSelectedIds([]);
        const deletedCount = data.data?.deletedCount || selectedIds.length;
        alert(`${deletedCount} مشتری با موفقیت حذف شد`);
      },
      onError: (error: any) => {
        alert('خطا در حذف گروهی: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  // Ensure customers is always an array
  const customersArray = Array.isArray(customers) ? customers : [];

  const handleDelete = (id: number) => {
    if (confirm('آیا از حذف این مشتری اطمینان دارید؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      alert('لطفاً حداقل یک مورد را انتخاب کنید');
      return;
    }
    if (confirm(`آیا از حذف ${selectedIds.length} مشتری انتخاب شده اطمینان دارید؟`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(customersArray.map((c: any) => c.id));
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

  const isAllSelected = customersArray.length > 0 && selectedIds.length === customersArray.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < customersArray.length;

  if (isLoading) {
    return <div className="text-center py-12 text-neutral-800">در حال بارگذاری...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-danger-600 mb-4">خطا در بارگذاری مشتریان</div>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-info-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">مدیریت مشتریان</h1>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn btn-danger flex items-center gap-2"
              disabled={bulkDeleteMutation.isLoading}
            >
              <Trash2 size={20} />
              حذف {selectedIds.length} مورد
            </button>
          )}
          <button
            onClick={() => {
              setEditingCustomer(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            افزودن مشتری
          </button>
        </div>
      </div>

      {/* Filters */}
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input"
          >
            <option value="">همه انواع</option>
            <option value="company">شرکت</option>
            <option value="individual">شخص</option>
            <option value="export">صادرات</option>
            <option value="import">واردات</option>
            <option value="coaching">کوچینگ</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="lead">لید</option>
            <option value="customer">مشتری</option>
            <option value="partner">شریک</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('');
              setFilterStatus('');
            }}
            className="btn btn-secondary"
          >
            پاک کردن فیلترها
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <button
                    onClick={() => handleSelectAll(!isAllSelected)}
                    className="flex items-center justify-center"
                    title={isAllSelected ? 'لغو انتخاب همه' : 'انتخاب همه'}
                  >
                    {isAllSelected ? (
                      <CheckSquare size={20} className="text-primary-600" />
                    ) : isIndeterminate ? (
                      <div className="w-5 h-5 border-2 border-primary-600 bg-primary-100 rounded"></div>
                    ) : (
                      <Square size={20} className="text-gray-400" />
                    )}
                  </button>
                </th>
                <th>نام</th>
                <th>کد</th>
                <th>نوع / نقش</th>
                <th>ایمیل</th>
                <th>تلفن</th>
                <th>نمره</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {customersArray.map((customer: any) => (
                <tr key={customer.id} className={selectedIds.includes(customer.id) ? 'bg-primary-50' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(customer.id)}
                      onChange={(e) => handleSelectOne(customer.id, e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </td>
                  <td className="font-medium">{customer.name}</td>
                  <td>
                    {customer.code ? (
                      <span className="badge badge-primary font-mono">
                        {customer.code}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info" title={`نوع مشتری: ${translateCustomerType(customer.type)}`}>
                      {translateCustomerType(customer.type)}
                    </span>
                  </td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>
                    <span className="badge badge-primary">
                      {customer.score}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      customer.status === 'active' ? 'badge-success' :
                      customer.status === 'inactive' ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {translateCustomerStatus(customer.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="text-info-600 hover:text-info-700 hover:bg-info-50 p-2 rounded transition-colors"
                        title="مشاهده"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowModal(true);
                        }}
                        className="text-success-600 hover:text-success-700 hover:bg-success-50 p-2 rounded transition-colors"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
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
          {customersArray.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              مشتری‌ای یافت نشد
            </div>
          )}
        </div>
      </div>

      {/* Customer Modal */}
      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
        />
      )}
      </div>
    </div>
  );
};

const CustomerModal = ({ customer, onClose }: { customer: any; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    type: customer?.type || 'individual',
    email: customer?.email || '',
    phone: customer?.phone || '',
    company_name: customer?.company_name || '',
    address: customer?.address || '',
    website: customer?.website || '',
    score: customer?.score || 0,
    status: customer?.status || 'active',
    category: customer?.category || '',
    notes: customer?.notes || '',
    gender: customer?.gender || '',
    site_languages_count: customer?.site_languages_count || '',
    service_type: customer?.service_type || '',
    delivery_deadline: customer?.delivery_deadline || '',
    site_costs: customer?.site_costs || '',
    initial_delivery_date: customer?.initial_delivery_date || '',
    languages_added_date: customer?.languages_added_date || '',
    code: customer?.code || '',
    designer: customer?.designer || '',
  });

  const mutation = useMutation(
    (data: any) => {
      if (customer) {
        return api.put(`/customers/${customer.id}`, data);
      }
      return api.post('/customers', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
        alert('مشتری با موفقیت ذخیره شد');
        onClose();
      },
      onError: (error: any) => {
        console.error('Error saving customer:', error);
        alert(error.response?.data?.error || 'خطا در ذخیره مشتری');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting customer form:', formData);
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral-800">
            {customer ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label label-required">نوع</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
                required
              >
                <option value="individual">شخص</option>
                <option value="company">شرکت</option>
                <option value="export">صادرات</option>
                <option value="import">واردات</option>
                <option value="coaching">کوچینگ</option>
              </select>
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
              <label className="label">نام شرکت</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">وضعیت</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
                <option value="lead">لید</option>
                <option value="customer">مشتری</option>
                <option value="partner">شریک</option>
              </select>
            </div>
            <div>
              <label className="label">نمره</label>
              <input
                type="number"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                className="input"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="label">دسته‌بندی</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">جنسیت</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="input"
              >
                <option value="">انتخاب کنید</option>
                <option value="male">مرد</option>
                <option value="female">زن</option>
              </select>
            </div>
            <div>
              <label className="label">کد</label>
              <input
                type="number"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value ? parseInt(e.target.value) : '' })}
                className="input"
                min="1"
                max="9"
              />
            </div>
            <div>
              <label className="label">طراح</label>
              <input
                type="text"
                value={formData.designer}
                onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">تعداد زبان های سایت</label>
              <input
                type="number"
                value={formData.site_languages_count}
                onChange={(e) => setFormData({ ...formData, site_languages_count: e.target.value ? parseInt(e.target.value) : '' })}
                className="input"
                min="0"
              />
            </div>
            <div>
              <label className="label">نوع خدمات</label>
              <input
                type="text"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">ددلاین تحویل</label>
              <input
                type="date"
                value={formData.delivery_deadline}
                onChange={(e) => setFormData({ ...formData, delivery_deadline: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">هزینه ها برای سایت ها</label>
              <input
                type="number"
                value={formData.site_costs}
                onChange={(e) => setFormData({ ...formData, site_costs: e.target.value ? parseFloat(e.target.value) : '' })}
                className="input"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="label">تاریخ اتمام و تحویل اولیه سایت</label>
              <input
                type="date"
                value={formData.initial_delivery_date}
                onChange={(e) => setFormData({ ...formData, initial_delivery_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">تاریخ اضافه کردن زبان های سایت</label>
              <input
                type="date"
                value={formData.languages_added_date}
                onChange={(e) => setFormData({ ...formData, languages_added_date: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">آدرس</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              rows={2}
            />
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

export default Customers;



