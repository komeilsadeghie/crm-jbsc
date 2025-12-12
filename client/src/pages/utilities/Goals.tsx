import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { Plus, Search, Edit, Trash2, Target, Filter } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../contexts/ToastContext';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { formatNumber, toPersianNumber } from '../../utils/numberHelper';
import { toJalali } from '../../utils/dateHelper';
import ConfirmDialog from '../../components/ConfirmDialog';

const Goals = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number }>({ show: false });
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: goals, isLoading, isFetching } = useQuery(
    ['goals', debouncedSearchTerm, filterType],
    async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        if (filterType) params.append('type', filterType);
        const response = await api.get(`/utilities/goals?${params.toString()}`);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error: any) {
        // If endpoint doesn't exist, return empty array instead of throwing
        if (error.response?.status === 404) {
          console.warn('Goals endpoint not found, returning empty array');
          return [];
        }
        throw error;
      }
    },
    {
      retry: 1,
      staleTime: 1 * 60 * 1000,
      cacheTime: 3 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      onError: (error: any) => {
        console.error('Error fetching goals:', error);
        // Only show error if it's not a 404 (endpoint doesn't exist)
        if (error.response?.status !== 404) {
          toast.showError('خطا در بارگذاری اهداف');
        }
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/utilities/goals/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('goals');
        toast.showSuccess('هدف با موفقیت حذف شد');
        setDeleteConfirm({ show: false });
      },
      onError: (error: any) => {
        toast.showError('خطا در حذف هدف: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const goalsArray = Array.isArray(goals) ? goals : [];
  const totalItems = goalsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGoals = goalsArray.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = (id: number) => {
    setDeleteConfirm({ show: true, id });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
        <div className="max-w-7xl mx-auto">
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">اهداف</h1>
          <button
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            هدف جدید
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="label">جستجو</label>
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
            </div>
            <div>
              <label className="label">نوع هدف</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input"
              >
                <option value="">همه انواع</option>
                <option value="revenue">درآمد</option>
                <option value="sales">فروش</option>
                <option value="leads">سرنخ</option>
                <option value="custom">سفارشی</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>موضوع</th>
                  <th>کارمند</th>
                  <th>دستاورد</th>
                  <th>تاریخ شروع</th>
                  <th>تاریخ پایان</th>
                  <th>نوع هدف</th>
                  <th>پیشرفت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGoals.length > 0 ? (
                  paginatedGoals.map((goal: any) => (
                    <tr key={goal.id}>
                      <td className="font-medium">{goal.subject || '-'}</td>
                      <td>{goal.staff_name || '-'}</td>
                      <td>{toPersianNumber(goal.achievement)}</td>
                      <td>{goal.start_date ? toJalali(goal.start_date) : '-'}</td>
                      <td>{goal.end_date ? toJalali(goal.end_date) : '-'}</td>
                      <td>
                        <span className="badge badge-info">
                          {goal.goal_type === 'revenue' ? 'درآمد' :
                           goal.goal_type === 'sales' ? 'فروش' :
                           goal.goal_type === 'leads' ? 'سرنخ' : 'سفارشی'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{toPersianNumber(goal.progress, { decimals: 2 })}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-primary-600 hover:text-primary-700"
                            title="ویرایش"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(goal.id)}
                            className="text-danger-600 hover:text-danger-700"
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
                    <td colSpan={8} className="text-center py-12">
                      <EmptyState
                        icon={Target}
                        title="هیچ هدفی یافت نشد"
                        description="برای شروع، اولین هدف را ایجاد کنید"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {goalsArray.length > 0 && (
            <div className="px-4 sm:px-6 py-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.show}
          title="حذف هدف"
          message="آیا مطمئن هستید که می‌خواهید این هدف را حذف کنید؟"
          onConfirm={() => {
            if (deleteConfirm.id) {
              deleteMutation.mutate(deleteConfirm.id);
            }
          }}
          onCancel={() => setDeleteConfirm({ show: false })}
        />
      </div>
    </div>
  );
};

export default Goals;

