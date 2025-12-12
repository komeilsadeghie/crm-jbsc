import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { Plus, Search, Edit, Trash2, Bell, Calendar } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../contexts/ToastContext';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { toPersianNumber } from '../../utils/numberHelper';
import { toJalali } from '../../utils/dateHelper';
import ConfirmDialog from '../../components/ConfirmDialog';

const Announcements = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number }>({ show: false });
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: announcements, isLoading } = useQuery(
    ['announcements', debouncedSearchTerm],
    async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        const response = await api.get(`/utilities/announcements?${params.toString()}`);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error: any) {
        // If endpoint doesn't exist, return empty array instead of throwing
        if (error.response?.status === 404) {
          console.warn('Announcements endpoint not found, returning empty array');
          return [];
        }
        throw error;
      }
    },
    {
      retry: 1,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      onError: (error: any) => {
        console.error('Error fetching announcements:', error);
        // Only show error if it's not a 404 (endpoint doesn't exist)
        if (error.response?.status !== 404) {
          toast.showError('خطا در بارگذاری اعلانات');
        }
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/utilities/announcements/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('announcements');
        toast.showSuccess('اعلان با موفقیت حذف شد');
        setDeleteConfirm({ show: false });
      },
      onError: (error: any) => {
        toast.showError('خطا در حذف اعلان: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const announcementsArray = Array.isArray(announcements) ? announcements : [];
  const totalItems = announcementsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAnnouncements = announcementsArray.slice(startIndex, startIndex + itemsPerPage);

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
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">اعلانات</h1>
          <button
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            اعلان جدید
          </button>
        </div>

        {/* Filters */}
        <div className="card">
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

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>متن</th>
                  <th>تاریخ شروع</th>
                  <th>تاریخ پایان</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAnnouncements.length > 0 ? (
                  paginatedAnnouncements.map((announcement: any) => (
                    <tr key={announcement.id}>
                      <td className="font-medium">{announcement.title || '-'}</td>
                      <td className="max-w-xs truncate">{announcement.message || '-'}</td>
                      <td>{announcement.start_date ? toJalali(announcement.start_date) : '-'}</td>
                      <td>{announcement.end_date ? toJalali(announcement.end_date) : '-'}</td>
                      <td>
                        <span className={`badge ${
                          announcement.is_active ? 'badge-success' : 'badge-danger'
                        }`}>
                          {announcement.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
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
                            onClick={() => handleDelete(announcement.id)}
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
                    <td colSpan={6} className="text-center py-12">
                      <EmptyState
                        icon={Bell}
                        title="هیچ اعلانی یافت نشد"
                        description="برای شروع، اولین اعلان را ایجاد کنید"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {announcementsArray.length > 0 && (
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
          title="حذف اعلان"
          message="آیا مطمئن هستید که می‌خواهید این اعلان را حذف کنید؟"
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

export default Announcements;

