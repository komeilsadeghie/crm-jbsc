import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Edit, Trash2, Receipt, DollarSign, Settings } from 'lucide-react';
import { toJalali, formatDateForInput } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { useAuth } from '../contexts/AuthContext';
import AdvancedFilter from '../components/AdvancedFilter';

const Expenses = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data: expenses } = useQuery(
    ['expenses', filterCategory, advancedFilters],
    async () => {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (advancedFilters.dateFrom) params.append('start_date', advancedFilters.dateFrom);
      if (advancedFilters.dateTo) params.append('end_date', advancedFilters.dateTo);
      if (advancedFilters.amountMin) params.append('amountMin', advancedFilters.amountMin);
      if (advancedFilters.amountMax) params.append('amountMax', advancedFilters.amountMax);
      if (advancedFilters.category) params.append('category', advancedFilters.category);
      
      const response = await api.get(`/expenses?${params.toString()}`);
      return response.data || [];
    }
  );

  const { data: categories } = useQuery('expense-categories', async () => {
    const response = await api.get('/expenses/categories');
    return response.data || [];
  });

  const createMutation = useMutation(
    (data: any) => api.post('/expenses', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        setShowModal(false);
        setEditingExpense(null);
        alert('هزینه با موفقیت ثبت شد');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/expenses/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        setShowModal(false);
        setEditingExpense(null);
        alert('هزینه با موفقیت به‌روزرسانی شد');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/expenses/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        alert('هزینه با موفقیت حذف شد');
      },
    }
  );

  const createCategoryMutation = useMutation(
    (data: any) => api.post('/expenses/categories', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expense-categories');
        setShowCategoryModal(false);
        setEditingCategory(null);
        alert('دسته‌بندی با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateCategoryMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/expenses/categories/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expense-categories');
        setShowCategoryModal(false);
        setEditingCategory(null);
        alert('دسته‌بندی با موفقیت به‌روزرسانی شد');
      },
    }
  );

  const deleteCategoryMutation = useMutation(
    (id: number) => api.delete(`/expenses/categories/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expense-categories');
        alert('دسته‌بندی با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const totalAmount = expenses?.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center glass-card">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">هزینه‌ها</h1>
          <div className="mt-2 flex items-center gap-4">
            <div className="text-lg font-medium text-gray-700">
              مجموع: {toPersianNumber(new Intl.NumberFormat('fa-IR').format(totalAmount))} ریال
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input"
            >
              <option value="">همه دسته‌ها</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <AdvancedFilter
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            filterConfig={{
              dateRange: true,
              amountRange: { label: 'بازه مبلغ' },
              category: categories ? {
                label: 'دسته‌بندی',
                options: categories.map((cat: any) => ({ value: cat.name, label: cat.name })),
              } : undefined,
            }}
          />
          {isAdmin && (
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="btn btn-secondary flex items-center gap-2"
              title="مدیریت دسته‌بندی‌ها"
            >
              <Settings size={20} />
              <span className="hidden sm:inline">مدیریت دسته‌بندی‌ها</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            هزینه جدید
          </button>
        </div>
      </div>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3">تاریخ</th>
                <th className="text-right p-3">دسته</th>
                <th className="text-right p-3">مبلغ</th>
                <th className="text-right p-3">توضیحات</th>
                <th className="text-right p-3">مشتری</th>
                <th className="text-right p-3">قابل فاکتور</th>
                <th className="text-right p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {expenses?.map((expense: any) => (
                <tr key={expense.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{toJalali(expense.expense_date)}</td>
                  <td className="p-3">{expense.category}</td>
                  <td className="p-3 font-medium">
                    {toPersianNumber(new Intl.NumberFormat('fa-IR').format(expense.amount))} {expense.currency}
                  </td>
                  <td className="p-3">{expense.description || '-'}</td>
                  <td className="p-3">{expense.account_name || '-'}</td>
                  <td className="p-3">
                    {expense.billable === 1 ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-400">✗</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExpense(expense);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('آیا مطمئن هستید؟')) {
                            deleteMutation.mutate(expense.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
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

      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
          }}
          onSave={(data) => {
            if (editingExpense) {
              updateMutation.mutate({ id: editingExpense.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}

      {showCategoryModal && isAdmin && (
        <CategoryManagementModal
          category={editingCategory}
          categories={categories}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={(data, categoryId) => {
            if (categoryId) {
              updateCategoryMutation.mutate({ id: categoryId, data });
            } else {
              createCategoryMutation.mutate(data);
            }
            setEditingCategory(null);
          }}
          onDelete={(id) => {
            deleteCategoryMutation.mutate(id);
            setEditingCategory(null);
          }}
        />
      )}
      </div>
    </div>
  );
};

const CategoryManagementModal = ({ category, categories, onClose, onSave, onDelete }: any) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#00A3FF',
  });

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(category?.id || null);

  React.useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#00A3FF',
      });
      setEditingCategoryId(category.id);
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#00A3FF',
      });
      setEditingCategoryId(null);
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, editingCategoryId);
  };

  const handleEditCategory = (cat: any) => {
    setFormData({
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#00A3FF',
    });
    setEditingCategoryId(cat.id);
  };

  const currentEditingCategory = editingCategoryId 
    ? categories?.find((c: any) => c.id === editingCategoryId)
    : null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">مدیریت دسته‌بندی‌ها</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-bold mb-2">دسته‌بندی‌های موجود</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories?.map((cat: any) => (
              <div
                key={cat.id}
                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                  editingCategoryId === cat.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: cat.color || '#00A3FF' }}
                  />
                  <span>{cat.name}</span>
                </div>
                <button
                  onClick={() => handleEditCategory(cat)}
                  className="text-blue-600 hover:text-blue-700 px-2 text-sm"
                >
                  ویرایش
                </button>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
          <h3 className="font-bold">{currentEditingCategory ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}</h3>
          <div>
            <label className="block text-sm font-medium mb-1">نام دسته‌بندی *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="مثلاً: تبلیغات، حقوق و دستمزد، اجاره"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رنگ</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-12 border rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex justify-between items-center pt-4">
            {currentEditingCategory && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) {
                    onDelete(currentEditingCategory.id);
                    setEditingCategoryId(null);
                    setFormData({ name: '', description: '', color: '#00A3FF' });
                  }
                }}
                className="btn btn-danger"
              >
                حذف
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button 
                type="button" 
                onClick={() => {
                  setEditingCategoryId(null);
                  setFormData({ name: '', description: '', color: '#00A3FF' });
                }}
                className="btn btn-secondary"
              >
                جدید
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                بستن
              </button>
              <button type="submit" className="btn btn-primary">
                {currentEditingCategory ? 'به‌روزرسانی' : 'ایجاد'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const ExpenseModal = ({ expense, categories, onClose, onSave }: any) => {
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

  const { data: projects } = useQuery('projects', async () => {
    const response = await api.get('/projects');
    return response.data || [];
  });

  const [formData, setFormData] = useState({
    account_id: expense?.account_id || '',
    project_id: expense?.project_id || '',
    category: expense?.category || '',
    amount: expense?.amount || '',
    currency: expense?.currency || 'IRR',
    expense_date: expense?.expense_date || formatDateForInput(new Date()),
    description: expense?.description || '',
    receipt_file_path: expense?.receipt_file_path || '',
    billable: expense?.billable || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      account_id: formData.account_id ? parseInt(formData.account_id) : null,
      project_id: formData.project_id ? parseInt(formData.project_id) : null,
      amount: parseFloat(formData.amount),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold mb-4">{expense ? 'ویرایش' : 'ایجاد'} هزینه</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">دسته *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
              >
                <option value="">انتخاب دسته</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">مبلغ *</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label label-required">تاریخ</label>
              <JalaliDatePicker
                value={formData.expense_date}
                onChange={(value) => setFormData({ ...formData, expense_date: value })}
                placeholder="تاریخ را انتخاب کنید"
                required
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
                ) : accounts && accounts.length > 0 ? (
                  accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.name || acc.company_name || `حساب #${acc.id}`}</option>
                  ))
                ) : (
                  <option disabled>مشتری‌ای یافت نشد</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">پروژه</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب پروژه</option>
                {projects?.map((proj: any) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">مسیر فایل رسید</label>
            <input
              type="text"
              value={formData.receipt_file_path}
              onChange={(e) => setFormData({ ...formData, receipt_file_path: e.target.value })}
              className="input"
              placeholder="/path/to/receipt.pdf"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.billable}
              onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm">قابل فاکتور شدن</label>
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

export default Expenses;

