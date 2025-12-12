import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { Search, X, RefreshCw } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../contexts/ToastContext';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { formatNumber, toPersianNumber } from '../../utils/numberHelper';
import { toJalali } from '../../utils/dateHelper';

const TicketPipeLog = () => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: logs, isLoading, isFetching, refetch } = useQuery(
    ['ticket-pipe-log', debouncedSearchTerm, dateFilter],
    async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        if (dateFilter) params.append('date', dateFilter);
        const response = await api.get(`/utilities/ticket-pipe-log?${params.toString()}`);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.warn('Ticket pipe log endpoint not found, returning empty array');
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
        console.error('Error fetching ticket pipe logs:', error);
        if (error.response?.status !== 404) {
          toast.showError('خطا در بارگذاری لاگ‌ها');
        }
      }
    }
  );

  const logsArray = Array.isArray(logs) ? logs : [];
  const totalItems = logsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = logsArray.slice(startIndex, startIndex + itemsPerPage);

  const handleClearLog = async () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام لاگ‌ها را پاک کنید؟')) {
      try {
        await api.delete('/utilities/ticket-pipe-log');
        toast.showSuccess('لاگ‌ها با موفقیت پاک شدند');
        refetch();
      } catch (error: any) {
        toast.showError('خطا در پاک کردن لاگ‌ها: ' + (error.response?.data?.error || error.message));
      }
    }
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
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">لاگ تیکت Pipe</h1>
          <button
            onClick={handleClearLog}
            className="btn btn-danger flex items-center gap-2"
          >
            <X size={20} />
            پاک کردن لاگ
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">فیلتر بر اساس تاریخ</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input"
              />
            </div>
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
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>نام فرستنده</th>
                  <th>تاریخ</th>
                  <th>به</th>
                  <th>ایمیل فرستنده</th>
                  <th>موضوع</th>
                  <th>پیام</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td>{log.from_name || '-'}</td>
                      <td>{log.date ? toJalali(log.date) : '-'}</td>
                      <td>{log.to || '-'}</td>
                      <td>{log.from_email || '-'}</td>
                      <td>{log.subject || '-'}</td>
                      <td className="max-w-xs truncate">{log.message || '-'}</td>
                      <td>
                        <span className={`badge ${
                          log.status === 'success' ? 'badge-success' :
                          log.status === 'failed' ? 'badge-danger' :
                          'badge-warning'
                        }`}>
                          {log.status === 'success' ? 'موفق' :
                           log.status === 'failed' ? 'ناموفق' :
                           'در حال پردازش'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <EmptyState
                        icon={RefreshCw}
                        title="هیچ لاگی یافت نشد"
                        description="لاگ‌های تیکت Pipe در اینجا نمایش داده می‌شوند"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logsArray.length > 0 && (
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
      </div>
    </div>
  );
};

export default TicketPipeLog;

