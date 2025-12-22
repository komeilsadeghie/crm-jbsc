import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, Eye, CheckSquare, Square, Target, FileText as FileTextIcon, MessageSquare as MessageSquareIcon, ArrowUpDown, ArrowUp, ArrowDown, FolderPlus } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import EmptyState from '../components/EmptyState';
import { toJalali } from '../utils/dateHelper';
import { translateCustomerType, translateCustomerStatus } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import AdvancedFilter from '../components/AdvancedFilter';
import { isSuccessfulResponse, hasResponseError, getErrorMessage, getSuccessMessage } from '../utils/mutationHelper';

const Customers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number; type?: 'single' | 'bulk'; count?: number }>({ show: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<'list' | 'programs' | 'templates' | 'feedback'>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Customer Programs
  const { data: customerPrograms } = useQuery(
    ['customer-programs', selectedCustomerId],
    async () => {
      const url = selectedCustomerId 
        ? `/coaching/programs?customer_id=${selectedCustomerId}`
        : '/coaching/programs';
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : [];
    },
    { 
      enabled: activeTab === 'programs',
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  // Customer Templates
  const { data: customerTemplates } = useQuery(
    ['customer-templates'],
    async () => {
      const response = await api.get('/coaching/templates');
      return Array.isArray(response.data) ? response.data : [];
    },
    { 
      enabled: activeTab === 'templates',
      staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  // Customer Feedback
  const { data: customerFeedback } = useQuery(
    ['customer-feedback', selectedCustomerId],
    async () => {
      const url = selectedCustomerId 
        ? `/coaching/feedback?customer_id=${selectedCustomerId}`
        : '/coaching/feedback';
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : [];
    },
    { 
      enabled: activeTab === 'feedback',
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  // Users list for filters (coach selector)
  const { data: users } = useQuery(
    'assignable-users',
    async () => {
      try {
        const response = await api.get('/users/assignable');
        return Array.isArray(response.data) ? response.data : [];
      } catch {
        return [];
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const { data: customers, isLoading, error } = useQuery(
    ['customers', debouncedSearchTerm, filterType, filterStatus, advancedFilters],
    async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      
      // Add advanced filters
      if (advancedFilters.dateFrom) params.append('dateFrom', advancedFilters.dateFrom);
      if (advancedFilters.dateTo) params.append('dateTo', advancedFilters.dateTo);
      if (advancedFilters.journeyStage) params.append('journey_stage', advancedFilters.journeyStage);
      if (advancedFilters.userId) params.append('coach_id', String(advancedFilters.userId));
      if (advancedFilters.category) params.append('category', advancedFilters.category);
      
      const response = await api.get(`/customers?${params.toString()}`);
      // Ensure we always return an array
      const data = response.data;
      return Array.isArray(data) ? data : [];
    },
    {
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes - customers list changes more frequently
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      keepPreviousData: true, // Keep previous data while fetching new data
      onError: (error) => {
        console.error('Error fetching customers:', error);
      }
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/customers/${id}`),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('customers');
        setSelectedIds([]);
        toast.showSuccess(getSuccessMessage(response, 'مشتری با موفقیت حذف شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا در حذف مشتری: ' + getErrorMessage(error));
        }
      },
    }
  );

  const bulkDeleteMutation = useMutation(
    (ids: number[]) => api.post('/customers/bulk-delete', { ids }),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('customers');
        const deletedCount = response?.data?.deletedCount || selectedIds.length;
        setSelectedIds([]);
        toast.showSuccess(`${deletedCount} مشتری با موفقیت حذف شد`);
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا در حذف گروهی: ' + getErrorMessage(error));
        }
      },
    }
  );

  const convertToProjectMutation = useMutation(
    ({ customerId, project_name, project_description }: { customerId: number; project_name?: string; project_description?: string }) => 
      api.post(`/customers/${customerId}/convert-to-project`, { project_name, project_description }),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        
        // ✅ موفق است
        queryClient.invalidateQueries('projects');
        queryClient.invalidateQueries('customers');
        toast.showSuccess(getSuccessMessage(response, 'پروژه با موفقیت ایجاد شد'));
        // Navigate to the created project detail page if project_id is available
        if (response?.data?.project_id) {
          navigate(`/projects/${response.data.project_id}`);
        } else {
          // Fallback to projects list
          navigate('/projects');
        }
      },
      onError: (error: any) => {
        // ✅ فقط در صورت خطای واقعی (status >= 400)
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا در ایجاد پروژه: ' + getErrorMessage(error));
        } else {
          // اگر status 200-299 است ولی onError صدا زده شده، احتمالاً مشکلی در response structure است
          console.warn('Mutation error but status might be OK:', error);
        }
      },
    }
  );

  // Ensure customers is always an array
  const customersArray = Array.isArray(customers) ? customers : [];

  // Sort function
  const handleSort = (field: string) => {
    setSortConfig((current) => {
      if (current?.field === field) {
        return current.direction === 'asc' 
          ? { field, direction: 'desc' }
          : null;
      }
      return { field, direction: 'asc' };
    });
  };

  // Sort data based on sortConfig
  const getSortedData = (data: any[]) => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];
      
      // Handle null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr, 'fa');
      } else {
        return bStr.localeCompare(aStr, 'fa');
      }
    });
  };

  // Memoize sorted data to prevent unnecessary recalculations
  const sortedCustomers = useMemo(() => getSortedData(customersArray), [customersArray, sortConfig]);
  const sortedPrograms = useMemo(() => getSortedData(customerPrograms || []), [customerPrograms, sortConfig]);
  const sortedTemplates = useMemo(() => getSortedData(customerTemplates || []), [customerTemplates, sortConfig]);
  const sortedFeedbacks = useMemo(() => getSortedData(customerFeedback || []), [customerFeedback, sortConfig]);

  // Pagination calculations for customers list - memoized for performance
  const { totalItems, totalPages, paginatedCustomers } = useMemo(() => {
    const total = sortedCustomers.length;
    const pages = Math.ceil(total / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = sortedCustomers.slice(start, end);
    
    return {
      totalItems: total,
      totalPages: pages,
      paginatedCustomers: paginated,
    };
  }, [sortedCustomers, currentPage, itemsPerPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]); // Only depend on totalPages to avoid infinite loop

  const handleDelete = (id: number) => {
    setDeleteConfirm({ show: true, id, type: 'single' });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.showWarning('لطفاً حداقل یک مورد را انتخاب کنید');
      return;
    }
    setDeleteConfirm({ show: true, type: 'bulk', count: selectedIds.length });
  };

  const confirmDelete = () => {
    if (deleteConfirm.type === 'single' && deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === 'bulk') {
      bulkDeleteMutation.mutate(selectedIds);
    }
    setDeleteConfirm({ show: false });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedCustomers.map((c: any) => c.id));
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

  const isAllSelected = paginatedCustomers.length > 0 && 
    paginatedCustomers.every((c: any) => selectedIds.includes(c.id));
  const isIndeterminate = selectedIds.length > 0 && 
    selectedIds.length < paginatedCustomers.length && 
    paginatedCustomers.some((c: any) => selectedIds.includes(c.id));

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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center card">
          <h1 className="page-heading-gradient">مدیریت مشتریان</h1>
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

      {/* Tabs */}
      <div className="card">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => {
              setActiveTab('list');
              setSortConfig(null);
            }}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors flex items-center gap-1 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'list'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            لیست مشتریان
          </button>
          <button
            onClick={() => {
              setActiveTab('programs');
              setSortConfig(null);
            }}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors flex items-center gap-1 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'programs'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <Target size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">برنامه‌ها</span>
            <span className="sm:hidden">برنامه</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('templates');
              setSortConfig(null);
            }}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors flex items-center gap-1 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'templates'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <FileTextIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">قالب‌ها</span>
            <span className="sm:hidden">قالب</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('feedback');
              setSortConfig(null);
            }}
            className={`px-3 sm:px-4 py-2 font-medium transition-colors flex items-center gap-1 whitespace-nowrap text-sm sm:text-base ${
              activeTab === 'feedback'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <MessageSquareIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">بازخورد</span>
            <span className="sm:hidden">بازخورد</span>
          </button>
        </div>
      </div>

      {/* Filters - Only show for list tab */}
      {activeTab === 'list' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                setAdvancedFilters({});
              }}
              className="btn btn-secondary"
            >
              پاک کردن فیلترها
            </button>
          </div>
          <div className="flex gap-2">
            <AdvancedFilter
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              filterConfig={{
                dateRange: true,
                status: { label: 'وضعیت', options: [
                  { value: 'active', label: 'فعال' },
                  { value: 'inactive', label: 'غیرفعال' },
                  { value: 'lead', label: 'لید' },
                ]},
                type: { label: 'نوع', options: [
                  { value: 'coaching', label: 'کوچینگ' },
                  { value: 'individual', label: 'شخص' },
                  { value: 'company', label: 'شرکت' },
                  { value: 'export', label: 'صادرات' },
                  { value: 'import', label: 'واردات' },
                ]},
                user: users ? {
                  label: 'کوچ',
                  options: users.filter((u: any) => u.role === 'coach' || u.role === 'coach_manager' || u.role === 'admin').map((u: any) => ({
                    value: u.id,
                    label: u.username || u.full_name || u.email,
                  })),
                } : undefined,
                customFields: [
                  {
                    label: 'مرحله سفر',
                    field: 'journeyStage',
                    type: 'select',
                    options: [
                      { value: 'code_executed', label: 'کد مد نظر اجرا شد' },
                      { value: 'list_sent_to_coaching', label: 'لیست دانش پذیرها به کوچینگ داده شد' },
                      { value: 'initial_contact', label: 'ارتباط اولیه کوچ با دانش پذیر' },
                      { value: 'product_selection_session', label: 'جلسه انتخاب محصول' },
                      { value: 'key_actions', label: 'اقدامات کلیدی' },
                      { value: 'coach_feedback', label: 'بازخورد از کوچ' },
                      { value: 'completed', label: 'تکمیل شده' },
                    ],
                  },
                ],
              }}
            />
          </div>
        </div>
      )}

      {/* Customers Table */}
      {activeTab === 'list' && (
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
                        <Square size={20} className="text-neutral-400 dark:text-neutral-500" />
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
                {paginatedCustomers.map((customer: any) => (
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
                        <span className="text-neutral-400 dark:text-neutral-500">-</span>
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
                          onClick={() => {
                            if (confirm(`آیا می‌خواهید برای مشتری "${customer.name}" یک پروژه ایجاد کنید؟`)) {
                              convertToProjectMutation.mutate({
                                customerId: customer.id,
                                project_name: `پروژه ${customer.name}`
                              });
                            }
                          }}
                          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-2 rounded transition-colors"
                          title="ایجاد پروژه"
                          disabled={convertToProjectMutation.isLoading}
                        >
                          <FolderPlus size={18} />
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
          </div>
          {!isLoading && !error && customersArray.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              مشتری‌ای یافت نشد
            </div>
          )}
          {isLoading && (
            <div className="text-center py-12 text-neutral-500">
              در حال بارگذاری...
            </div>
          )}
          {error && (
            <div className="text-center py-12 text-danger-500">
              خطا در بارگذاری مشتریان: {error instanceof Error ? error.message : 'خطای نامشخص'}
            </div>
          )}
          
          {/* Pagination */}
          {customersArray.length > 0 && (
            <div className="px-4 sm:px-6 py-4">
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
      )}

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <div className="card">
          <div className="mb-4">
            <label className="label">انتخاب مشتری</label>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
              className="input"
            >
              <option value="">همه مشتریان</option>
              {customersArray.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <CustomerProgramsList programs={sortedPrograms} customers={customersArray} onEdit={() => {}} onDelete={() => {}} />
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="card">
          <CustomerTemplatesList templates={sortedTemplates} onEdit={() => {}} onDelete={() => {}} sortConfig={sortConfig} onSort={handleSort} />
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="card">
          <div className="mb-4">
            <label className="label">انتخاب مشتری</label>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
              className="input"
            >
              <option value="">همه مشتریان</option>
              {customersArray.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <CustomerFeedbackList feedbacks={sortedFeedbacks} customers={customersArray} onEdit={() => {}} onDelete={() => {}} sortConfig={sortConfig} onSort={handleSort} />
        </div>
      )}

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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false })}
        onConfirm={confirmDelete}
        title={deleteConfirm.type === 'bulk' ? 'حذف چند مورد' : 'حذف مشتری'}
        message={
          deleteConfirm.type === 'bulk'
            ? `آیا از حذف ${deleteConfirm.count} مشتری انتخاب شده اطمینان دارید؟ این عمل قابل بازگشت نیست.`
            : 'آیا از حذف این مشتری اطمینان دارید؟ این عمل قابل بازگشت نیست.'
        }
        type="danger"
        confirmText="حذف"
        cancelText="لغو"
        isLoading={deleteMutation.isLoading || bulkDeleteMutation.isLoading}
      />
      </div>
    </div>
  );
};

const CustomerModal = ({ customer, onClose }: { customer: any; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: users } = useQuery('assignable-users', async () => {
    try {
      const response = await api.get('/users/assignable');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  });

  const [formData, setFormData] = useState({
    name: customer?.name || '',
    type: customer?.type || 'coaching',
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
    journey_stage: customer?.journey_stage || 'code_executed',
    coach_id: customer?.coach_id || '',
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
        toast.showSuccess('مشتری با موفقیت ذخیره شد');
        onClose();
      },
      onError: (error: any) => {
        console.error('Error saving customer:', error);
        toast.showError(error.response?.data?.error || 'خطا در ذخیره مشتری');
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
                value={formData.type || 'coaching'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
                required
              >
                <option value="coaching">کوچینگ (پیش‌فرض)</option>
                <option value="individual">شخص</option>
                <option value="company">شرکت</option>
                <option value="export">صادرات</option>
                <option value="import">واردات</option>
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
            <div>
              <label className="label">کوچ</label>
              <select
                value={formData.coach_id || ''}
                onChange={(e) => setFormData({ ...formData, coach_id: e.target.value ? parseInt(e.target.value) : null })}
                className="input"
              >
                <option value="">انتخاب کوچ</option>
                {users?.filter((u: any) => u.role === 'coach' || u.role === 'coach_manager' || u.role === 'admin').map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.username || user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">مرحله سفر مشتری</label>
              <select
                value={formData.journey_stage || 'code_executed'}
                onChange={(e) => setFormData({ ...formData, journey_stage: e.target.value })}
                className="input"
              >
                <option value="code_executed">کد مد نظر اجرا شد</option>
                <option value="list_sent_to_coaching">لیست دانش پذیرها به کوچینگ داده شد</option>
                <option value="initial_contact">ارتباط اولیه کوچ با دانش پذیر</option>
                <option value="product_selection_session">جلسه برای انتخاب محصول با کوچ</option>
                <option value="key_actions">اقدامات کلیدی (ارتباط مداوم با کوچ)</option>
                <option value="coach_feedback">بازخورد از کوچ برای دانش پذیر</option>
                <option value="completed">تکمیل شده</option>
              </select>
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

// Customer Programs List Component
const CustomerProgramsList = ({ programs, customers, onEdit, onDelete }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const programsArray = Array.isArray(programs) ? programs : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'on_hold': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600';
    }
  };

  return (
    <div className="space-y-4">
      {programsArray.map((program: any) => (
        <div key={program.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-lg">{program.title}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(program.status)}`}>
                  {program.status === 'active' ? 'فعال' : 
                   program.status === 'completed' ? 'تکمیل شده' :
                   program.status === 'cancelled' ? 'لغو شده' : 'متوقف شده'}
                </span>
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                <span>مشتری: {getCustomerName(program.customer_id)}</span>
                {program.start_date && (
                  <span className="mr-4">شروع: {toJalali(program.start_date)}</span>
                )}
                {program.end_date && (
                  <span>پایان: {toJalali(program.end_date)}</span>
                )}
              </div>
              {program.description && (
                <p className="text-neutral-700 dark:text-neutral-300 mb-2">{program.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(program)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('program', program.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {programsArray.length === 0 && (
        <EmptyState
          icon={Target}
          title="برنامه‌ای ثبت نشده است"
          description="برای شروع، اولین برنامه کوچینگ را اضافه کنید"
        />
      )}
    </div>
  );
};

// Customer Templates List Component
const CustomerTemplatesList = ({ templates, onEdit, onDelete, sortConfig, onSort }: any) => {
  const templatesArray = Array.isArray(templates) ? templates : [];
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'goal': return 'هدف';
      case 'exercise': return 'تمرین';
      case 'session': return 'جلسه';
      case 'report': return 'گزارش';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      {templatesArray.length > 0 && onSort && (
        <div className="flex gap-2 mb-4 pb-2 border-b border-neutral-200">
          <button
            onClick={() => onSort('name')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            نام
            {sortConfig?.field === 'name' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-neutral-400 dark:text-neutral-500" />
            )}
          </button>
          <button
            onClick={() => onSort('type')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            نوع
            {sortConfig?.field === 'type' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-neutral-400 dark:text-neutral-500" />
            )}
          </button>
        </div>
      )}
      {templatesArray.map((template: any) => (
        <div key={template.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-lg">{template.name}</span>
                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                  {getTypeLabel(template.type)}
                </span>
                {template.is_default === 1 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                    پیش‌فرض
                  </span>
                )}
              </div>
              {template.content && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(typeof template.content === 'string' ? JSON.parse(template.content) : template.content, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(template)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('template', template.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {templatesArray.length === 0 && (
        <EmptyState
          icon={FileTextIcon}
          title="قالبی ثبت نشده است"
          description="برای شروع، اولین قالب کوچینگ را اضافه کنید"
        />
      )}
    </div>
  );
};

// Customer Feedback List Component
const CustomerFeedbackList = ({ feedbacks, customers, onEdit, onDelete, sortConfig, onSort }: any) => {
  const customersArray = Array.isArray(customers) ? customers : [];
  const feedbacksArray = Array.isArray(feedbacks) ? feedbacks : [];
  
  const getCustomerName = (id: number) => {
    return customersArray.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getFeedbackTypeLabel = (type: string) => {
    switch (type) {
      case 'pre_session': return 'قبل از جلسه';
      case 'post_session': return 'بعد از جلسه';
      case 'general': return 'عمومی';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      {feedbacksArray.length > 0 && onSort && (
        <div className="flex gap-2 mb-4 pb-2 border-b border-neutral-200">
          <button
            onClick={() => onSort('customer_id')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            مشتری
            {sortConfig?.field === 'customer_id' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-neutral-400 dark:text-neutral-500" />
            )}
          </button>
          <button
            onClick={() => onSort('feedback_type')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            نوع بازخورد
            {sortConfig?.field === 'feedback_type' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-neutral-400 dark:text-neutral-500" />
            )}
          </button>
        </div>
      )}
      {feedbacksArray.map((feedback: any) => (
        <div key={feedback.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium">{getCustomerName(feedback.customer_id)}</span>
                <span className="px-2 py-1 bg-info-100 text-info-700 rounded text-sm">
                  {getFeedbackTypeLabel(feedback.feedback_type)}
                </span>
                {feedback.rating && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                    ⭐ {feedback.rating}/5
                  </span>
                )}
              </div>
              {feedback.comments && (
                <p className="text-neutral-700 dark:text-neutral-300 mb-2">{feedback.comments}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(feedback)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="ویرایش"
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => onDelete('feedback', feedback.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {feedbacksArray.length === 0 && (
        <EmptyState
          icon={MessageSquareIcon}
          title="هیچ بازخوردی ثبت نشده است"
          description="برای شروع، اولین بازخورد را اضافه کنید"
        />
      )}
    </div>
  );
};

export default Customers;



