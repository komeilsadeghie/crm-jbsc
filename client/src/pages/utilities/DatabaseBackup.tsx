import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { Download, Database, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { formatNumber, toPersianNumber } from '../../utils/numberHelper';
import { toJalali } from '../../utils/dateHelper';
import ConfirmDialog from '../../components/ConfirmDialog';

const DatabaseBackup = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number }>({ show: false });

  const { data: backups, isLoading } = useQuery(
    ['database-backups'],
    async () => {
      try {
        const response = await api.get('/utilities/database-backup');
        return Array.isArray(response.data) ? response.data : [];
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.warn('Database backup endpoint not found, returning empty array');
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
        console.error('Error fetching backups:', error);
        if (error.response?.status !== 404) {
          toast.showError('خطا در بارگذاری پشتیبان‌ها');
        }
      }
    }
  );

  const createBackupMutation = useMutation(
    () => api.post('/utilities/database-backup'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('database-backups');
        toast.showSuccess('پشتیبان با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        toast.showError('خطا در ایجاد پشتیبان: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/utilities/database-backup/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('database-backups');
        toast.showSuccess('پشتیبان با موفقیت حذف شد');
        setDeleteConfirm({ show: false });
      },
      onError: (error: any) => {
        toast.showError('خطا در حذف پشتیبان: ' + (error.response?.data?.error || error.message));
      }
    }
  );

  const handleDownload = async (id: number, filename: string) => {
    try {
      const response = await api.get(`/utilities/database-backup/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.showSuccess('پشتیبان با موفقیت دانلود شد');
    } catch (error: any) {
      toast.showError('خطا در دانلود پشتیبان: ' + (error.response?.data?.error || error.message));
    }
  };

  const backupsArray = Array.isArray(backups) ? backups : [];
  const totalItems = backupsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBackups = backupsArray.slice(startIndex, startIndex + itemsPerPage);

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
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">پشتیبان‌گیری دیتابیس</h1>
          <button
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isLoading}
            className="btn btn-primary flex items-center gap-2"
          >
            <Database size={20} />
            {createBackupMutation.isLoading ? 'در حال ایجاد...' : 'ایجاد پشتیبان دیتابیس'}
          </button>
        </div>

        {/* Warning */}
        <div className="card bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-warning-600 dark:text-warning-400 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-warning-800 dark:text-warning-200 mb-1">توجه</h3>
              <p className="text-sm text-warning-700 dark:text-warning-300">
                به دلیل محدودیت زمان اجرا و حافظه PHP، پشتیبان‌گیری از دیتابیس‌های بسیار بزرگ ممکن است امکان‌پذیر نباشد. 
                اگر دیتابیس شما بسیار بزرگ است، ممکن است نیاز باشد مستقیماً از سرور SQL از طریق خط فرمان پشتیبان بگیرید.
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>پشتیبان</th>
                  <th>اندازه</th>
                  <th>تاریخ</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBackups.length > 0 ? (
                  paginatedBackups.map((backup: any) => (
                    <tr key={backup.id}>
                      <td className="font-medium">{backup.filename || `backup-${backup.id}`}</td>
                      <td>{formatNumber(backup.size)} بایت</td>
                      <td>{backup.created_at ? toJalali(backup.created_at) : '-'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(backup.id, backup.filename)}
                            className="text-primary-600 hover:text-primary-700"
                            title="دانلود"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(backup.id)}
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
                    <td colSpan={4} className="text-center py-12">
                      <EmptyState
                        icon={Database}
                        title="هیچ پشتیبانی یافت نشد"
                        description="برای شروع، اولین پشتیبان را ایجاد کنید"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {backupsArray.length > 0 && (
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
          title="حذف پشتیبان"
          message="آیا مطمئن هستید که می‌خواهید این پشتیبان را حذف کنید؟"
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

export default DatabaseBackup;

