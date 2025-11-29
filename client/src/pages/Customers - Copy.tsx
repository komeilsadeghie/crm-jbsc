import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';

const Customers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const { data: customers, isLoading } = useQuery(
    ['customers', searchTerm, filterType, filterStatus],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      const response = await api.get(`/customers?${params.toString()}`);
      return response.data;
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/customers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
      },
    }
  );

  const handleDelete = (id: number) => {
    if (confirm('آیا از حذف این مشتری اطمینان دارید؟')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">مدیریت مشتریان</h1>
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
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3">نام</th>
                <th className="text-right p-3">نوع</th>
                <th className="text-right p-3">ایمیل</th>
                <th className="text-right p-3">تلفن</th>
                <th className="text-right p-3">نمره</th>
                <th className="text-right p-3">وضعیت</th>
                <th className="text-right p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer: any) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{customer.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {customer.type}
                    </span>
                  </td>
                  <td className="p-3">{customer.email || '-'}</td>
                  <td className="p-3">{customer.phone || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded">
                      {customer.score}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      customer.status === 'active' ? 'bg-green-100 text-green-700' :
                      customer.status === 'inactive' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="مشاهده"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowModal(true);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
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
          {(!customers || customers.length === 0) && (
            <div className="text-center py-12 text-gray-500">
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {customer ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نوع *</label>
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
              <label className="block text-sm font-medium mb-2">نام شرکت</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">وضعیت</label>
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
              <label className="block text-sm font-medium mb-2">نمره</label>
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
              <label className="block text-sm font-medium mb-2">دسته‌بندی</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">آدرس</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              rows={2}
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

export default Customers;


