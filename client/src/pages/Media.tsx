import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Calendar, FileText, Image, Video, CheckCircle, XCircle, Clock, Upload, FileSpreadsheet, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from 'lucide-react';
import { toJalali, toJalaliFull } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../contexts/ToastContext';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import Pagination from '../components/Pagination';

const Media = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'briefs' | 'items' | 'calendar' | 'assets' | 'import'>('briefs');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'brief' | 'item' | 'asset'>('brief');
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: briefs } = useQuery('media-briefs', async () => {
    const response = await api.get('/media/briefs');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  const { data: items } = useQuery('media-items', async () => {
    const response = await api.get('/media/items');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  const { data: calendar } = useQuery('media-calendar', async () => {
    const response = await api.get('/media/calendar');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  const { data: assets } = useQuery('media-assets', async () => {
    const response = await api.get('/media/assets');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

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

  // Filter data
  const getFilteredData = (data: any[], tab: string) => {
    return data.filter((item: any) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.name && item.name.toLowerCase().includes(searchLower)) ||
          (item.description && item.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Type filter (for items)
      if (tab === 'items' && filterType && item.type !== filterType) return false;

      // Status filter (for assets)
      if (tab === 'assets' && filterStatus && item.approval_status !== filterStatus) return false;

      // Date filters
      const dateField = item.created_at || item.date || item.created_date;
      if (filterDateFrom && dateField) {
        const itemDate = new Date(dateField).toISOString().split('T')[0];
        if (itemDate < filterDateFrom) return false;
      }
      if (filterDateTo && dateField) {
        const itemDate = new Date(dateField).toISOString().split('T')[0];
        if (itemDate > filterDateTo) return false;
      }

      return true;
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
      
      // Handle dates
      if (sortConfig.field.includes('date') || sortConfig.field.includes('_at')) {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        if (isNaN(aDate) || isNaN(bDate)) {
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          return sortConfig.direction === 'asc' 
            ? aStr.localeCompare(bStr, 'fa')
            : bStr.localeCompare(aStr, 'fa');
        }
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
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

  // Combined filter and sort
  const getFilteredAndSortedData = (data: any[], tab: string) => {
    const filtered = getFilteredData(data, tab);
    return getSortedData(filtered);
  };

  const tabs = [
    { id: 'briefs', label: 'بریف‌های محتوا', icon: FileText },
    { id: 'items', label: 'آیتم‌های محتوا', icon: Image },
    { id: 'calendar', label: 'تقویم انتشار', icon: Calendar },
    { id: 'assets', label: 'دارایی‌ها', icon: Video },
    { id: 'import', label: 'واردات مشتریان', icon: FileText },
  ];


  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 glass-card">
          <h1 className="page-heading-gradient text-xl sm:text-2xl md:text-3xl">مدیریت محتوا و مدیا</h1>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2 text-sm sm:text-base whitespace-nowrap w-full sm:w-auto justify-center"
        >
          <Plus size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">افزودن {tabs.find(t => t.id === activeTab)?.label}</span>
          <span className="sm:hidden">افزودن</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSortConfig(null); // Reset sort when changing tabs
                setModalType(tab.id === 'briefs' ? 'brief' : tab.id === 'assets' ? 'asset' : 'item');
              }}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {(activeTab === 'briefs' || activeTab === 'items' || activeTab === 'assets') && (
        <div className="glass-card">
          <div className="space-y-4">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-5 sm:h-5" size={18} />
                <input
                  type="text"
                  placeholder="جستجو..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pr-9 sm:pr-10 text-sm sm:text-base"
                />
              </div>
              {activeTab === 'items' && (
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input text-sm sm:text-base"
                >
                  <option value="">همه انواع</option>
                  <option value="video">ویدیو</option>
                  <option value="image">تصویر</option>
                  <option value="text">متن</option>
                </select>
              )}
              {activeTab === 'assets' && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input text-sm sm:text-base"
                >
                  <option value="">همه وضعیت‌ها</option>
                  <option value="approved">تایید شده</option>
                  <option value="rejected">رد شده</option>
                  <option value="pending">در انتظار</option>
                  <option value="revision_requested">نیاز به بازبینی</option>
                </select>
              )}
              <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="btn btn-secondary flex items-center gap-2 flex-1 text-sm sm:text-base"
                >
                  <Filter size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">فیلتر پیشرفته</span>
                  <span className="sm:hidden">فیلتر</span>
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('');
                    setFilterStatus('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="btn btn-secondary text-sm sm:text-base"
                  title="پاک کردن همه فیلترها"
                >
                  <span className="hidden sm:inline">پاک کردن</span>
                  <span className="sm:hidden">پاک</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="label">تاریخ از</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">تاریخ تا</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="glass-card">
        {activeTab === 'briefs' && (
          <BriefsList
            briefs={getFilteredAndSortedData(Array.isArray(briefs) ? briefs : [], 'briefs')}
            onEdit={(brief: any) => {
              setEditingItem(brief);
              setModalType('brief');
              setShowModal(true);
            }}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}

        {activeTab === 'items' && (
          <ItemsList
            items={getFilteredAndSortedData(Array.isArray(items) ? items : [], 'items')}
            onEdit={(item: any) => {
              setEditingItem(item);
              setModalType('item');
              setShowModal(true);
            }}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView calendar={calendar} />
        )}

        {activeTab === 'assets' && (
          <AssetsList
            assets={getFilteredAndSortedData(Array.isArray(assets) ? assets : [], 'assets')}
            onEdit={(asset: any) => {
              setEditingItem(asset);
              setModalType('asset');
              setShowModal(true);
            }}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}

        {activeTab === 'import' && (
          <ImportCustomersSection onSuccess={(data?: any) => {
            queryClient.invalidateQueries('customers');
            queryClient.invalidateQueries('projects');
            if (data?.projectsCreated > 0) {
              // If projects were created, navigate to projects page
              navigate('/projects');
            } else {
              navigate('/customers');
            }
          }} />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <MediaModal
          type={modalType}
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  </div>
  );
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    approved: 'bg-green-100 text-green-700',
    in_production: 'bg-blue-100 text-blue-700',
    completed: 'bg-purple-100 text-purple-700',
    briefed: 'bg-yellow-100 text-yellow-700',
    producing: 'bg-blue-100 text-blue-700',
    review: 'bg-orange-100 text-orange-700',
    scheduled: 'bg-indigo-100 text-indigo-700',
    published: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const BriefsList = ({ briefs, onEdit, sortConfig, onSort }: any) => {
  const briefsArray = Array.isArray(briefs) ? briefs : [];
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Pagination
  const totalItems = briefsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBriefs = briefsArray.slice(startIndex, endIndex);
  
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }
  
  return (
    <div className="space-y-4">
      {briefsArray.length > 0 && onSort && (
        <div className="flex gap-2 mb-4 pb-2 border-b border-neutral-200">
          <button
            onClick={() => onSort('title')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            عنوان
            {sortConfig?.field === 'title' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onSort('created_at')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            تاریخ ایجاد
            {sortConfig?.field === 'created_at' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-gray-400" />
            )}
          </button>
        </div>
      )}
      {paginatedBriefs.map((brief: any) => (
        <div key={brief.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(brief.status)}`}>
                  {brief.status}
                </span>
                <span className="text-sm text-gray-600">
                  {brief.platform && `پلتفرم: ${brief.platform}`}
                </span>
              </div>
              {brief.objective && (
                <p className="font-medium mb-2">{brief.objective}</p>
              )}
              {brief.message && (
                <p className="text-gray-700 mb-2">{brief.message}</p>
              )}
              {brief.keywords && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {brief.keywords.split(',').map((keyword: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => onEdit(brief)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
            >
              ویرایش
            </button>
          </div>
        </div>
      ))}
      {(!briefs || briefs.length === 0) && (
        <EmptyState
          icon={FileText}
          title="بریفی ثبت نشده است"
          description="برای شروع، اولین بریف محتوا را اضافه کنید"
        />
      )}
      
      {/* Pagination */}
      {briefsArray.length > 0 && (
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
  );
};

const ItemsList = ({ items, onEdit }: any) => {
  const itemsArray = Array.isArray(items) ? items : [];
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Pagination
  const totalItems = itemsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = itemsArray.slice(startIndex, endIndex);
  
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={20} />;
      case 'image': return <Image size={20} />;
      default: return <FileText size={20} />;
    }
  };

  return (
    <div className="space-y-4">
      {paginatedItems.map((item: any) => (
        <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getTypeIcon(item.content_type)}
                <span className="font-medium">{item.title || item.content_type}</span>
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {item.platform && <div>پلتفرم: {item.platform}</div>}
                {item.publish_date && (
                  <div>تاریخ انتشار: {toJalali(item.publish_date)}</div>
                )}
                {item.links && (
                  <div>
                    <a href={item.links} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      مشاهده لینک
                    </a>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onEdit(item)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
            >
              ویرایش
            </button>
          </div>
        </div>
      ))}
      {itemsArray.length === 0 && (
        <EmptyState
          icon={Image}
          title="آیتمی ثبت نشده است"
          description="برای شروع، اولین محتوای رسانه‌ای را اضافه کنید"
        />
      )}
      
      {/* Pagination */}
      {itemsArray.length > 0 && (
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
  );
};

const CalendarView = ({ calendar }: any) => {
  if (!calendar || calendar.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        رویدادی در تقویم ثبت نشده است
      </div>
    );
  }

  const groupedByDate = calendar.reduce((acc: any, item: any) => {
    const date = item.publish_date || item.date;
    if (!date) return acc;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, items]: [string, any]) => (
        <div key={date} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <h3 className="font-bold mb-3 text-primary-600">{toJalaliFull(date)}</h3>
          <div className="space-y-2">
            {items.map((item: any, idx: number) => (
              <div key={item.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <span className="font-medium">{item.content_title || item.title || 'بدون عنوان'}</span>
                  {item.publish_time && (
                    <span className="text-sm text-gray-500 mr-2">({item.publish_time})</span>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(item.content_status || item.status)}`}>
                  {item.content_status || item.status || 'scheduled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(groupedByDate).length === 0 && (
        <div className="text-center py-12 text-gray-500">رویدادی در تقویم ثبت نشده است</div>
      )}
    </div>
  );
};

const AssetsList = ({ assets, onEdit, sortConfig, onSort }: any) => {
  const assetsArray = Array.isArray(assets) ? assets : [];
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Pagination
  const totalItems = assetsArray.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssets = assetsArray.slice(startIndex, endIndex);
  
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }
  const getApprovalIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="text-green-600" size={20} />;
      case 'rejected': return <XCircle className="text-red-600" size={20} />;
      case 'revision_requested': return <Clock className="text-yellow-600" size={20} />;
      default: return <Clock className="text-gray-400" size={20} />;
    }
  };

  return (
    <div className="space-y-4">
      {assetsArray.length > 0 && onSort && (
        <div className="flex gap-2 mb-4 pb-2 border-b border-neutral-200">
          <button
            onClick={() => onSort('name')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            نام
            {sortConfig?.field === 'name' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onSort('approval_status')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            وضعیت تایید
            {sortConfig?.field === 'approval_status' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onSort('created_at')}
            className="flex items-center gap-1 text-sm hover:text-primary-600 transition-colors"
          >
            تاریخ ایجاد
            {sortConfig?.field === 'created_at' ? (
              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-gray-400" />
            )}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedAssets.map((asset: any) => (
        <div key={asset.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{asset.file_name}</span>
            {getApprovalIcon(asset.approval_status)}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>نوع: {asset.asset_type}</div>
            <div>نسخه: {asset.version}</div>
            {asset.file_size && (
              <div>حجم: {(asset.file_size / 1024 / 1024).toFixed(2)} MB</div>
            )}
            <div className={`mt-2 px-2 py-1 rounded text-xs inline-block ${getStatusColor(asset.approval_status)}`}>
              {asset.approval_status}
            </div>
          </div>
          <button
            onClick={() => onEdit(asset)}
            className="mt-2 text-sm text-primary-600 hover:underline"
          >
            مشاهده جزئیات
          </button>
        </div>
      ))}
      {assetsArray.length === 0 && (
        <div className="col-span-full">
          <EmptyState
            icon={Image}
            title="دارایی ثبت نشده است"
            description="برای شروع، اولین دارایی رسانه‌ای را اضافه کنید"
          />
        </div>
      )}
      </div>
      
      {/* Pagination */}
      {assetsArray.length > 0 && (
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
  );
};

const MediaModal = ({ type, item, onClose }: any) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formData, setFormData] = useState<any>(() => {
    if (type === 'brief') {
      return {
        deal_id: item?.deal_id || '',
        account_id: item?.account_id || '',
        objective: item?.objective || '',
        message: item?.message || '',
        persona: item?.persona || '',
        keywords: item?.keywords || '',
        cta: item?.cta || '',
        platform: item?.platform || '',
        status: item?.status || 'draft',
      };
    } else if (type === 'item') {
      return {
        brief_id: item?.brief_id || '',
        deal_id: item?.deal_id || '',
        content_type: item?.content_type || 'post',
        title: item?.title || '',
        status: item?.status || 'briefed',
        platform: item?.platform || '',
        publish_date: item?.publish_date || '',
        links: item?.links || '',
        notes: item?.notes || '',
      };
    } else {
      return {
        deal_id: item?.deal_id || '',
        brief_id: item?.brief_id || '',
        asset_type: item?.asset_type || 'image',
        file_name: item?.file_name || '',
        file_path: item?.file_path || '',
        approval_status: item?.approval_status || 'pending',
        notes: item?.notes || '',
      };
    }
  });

  const mutation = useMutation(
    async (data: any) => {
      if (item) {
        if (type === 'brief') {
          return api.put(`/media/briefs/${item.id}`, data);
        } else if (type === 'item') {
          return api.put(`/media/items/${item.id}`, data);
        }
      } else {
        if (type === 'brief') {
          return api.post('/media/briefs', data);
        } else if (type === 'item') {
          return api.post('/media/items', data);
        } else {
          return api.post('/media/assets', data);
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('media-briefs');
        queryClient.invalidateQueries('media-items');
        queryClient.invalidateQueries('media-assets');
        toast.showSuccess('اطلاعات با موفقیت ذخیره شد');
        onClose();
      },
      onError: (error: any) => {
        console.error('Error saving media data:', error);
        toast.showError(error.response?.data?.error || 'خطا در ذخیره اطلاعات');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting media form:', { type, formData });
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {item ? 'ویرایش' : 'افزودن'} {type === 'brief' ? 'بریف' : type === 'item' ? 'آیتم' : 'دارایی'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'brief' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">هدف</label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">پیام</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">پرسونا</label>
                  <input
                    type="text"
                    value={formData.persona}
                    onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">پلتفرم</label>
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">کلمات کلیدی</label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="input"
                    placeholder="مثلاً: واردات، صادرات، تجارت"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CTA</label>
                  <input
                    type="text"
                    value={formData.cta}
                    onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </>
          )}

          {type === 'item' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نوع محتوا *</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="post">پست</option>
                    <option value="video">ویدیو</option>
                    <option value="reels">ریلز</option>
                    <option value="blog">بلاگ</option>
                    <option value="page">صفحه</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="briefed">بریف شده</option>
                    <option value="producing">در حال تولید</option>
                    <option value="review">در حال بررسی</option>
                    <option value="scheduled">زمان‌بندی شده</option>
                    <option value="published">منتشر شده</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">عنوان</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">پلتفرم</label>
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">تاریخ انتشار</label>
                  <JalaliDatePicker
                    value={formData.publish_date}
                    onChange={(value) => setFormData({ ...formData, publish_date: value })}
                    placeholder="تاریخ انتشار را انتخاب کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">لینک</label>
                  <input
                    type="url"
                    value={formData.links}
                    onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">یادداشت‌ها</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
            </>
          )}

          {type === 'asset' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نوع دارایی *</label>
                  <select
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="logo">لوگو</option>
                    <option value="raw_video">ویدیو خام</option>
                    <option value="edited_video">ویدیو ادیت شده</option>
                    <option value="image">تصویر</option>
                    <option value="document">سند</option>
                    <option value="other">سایر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نام فایل *</label>
                  <input
                    type="text"
                    value={formData.file_name}
                    onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مسیر فایل *</label>
                  <input
                    type="text"
                    value={formData.file_path}
                    onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت تایید</label>
                  <select
                    value={formData.approval_status}
                    onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                    className="input"
                  >
                    <option value="pending">در انتظار</option>
                    <option value="approved">تایید شده</option>
                    <option value="rejected">رد شده</option>
                    <option value="revision_requested">نیاز به بازبینی</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">یادداشت‌ها</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
            </>
          )}

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

// Import Customers Section
const ImportCustomersSection = ({ onSuccess }: { onSuccess: (data?: any) => void }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [createDeals, setCreateDeals] = useState(true);
  const [createProjects, setCreateProjects] = useState(false);

  const previewMutation = useMutation(
    async (file: File) => {
      console.log('Starting file read, file name:', file.name, 'size:', file.size, 'type:', file.type);
      
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('فایل باید فرمت Excel (.xlsx یا .xls) باشد');
      }

      const reader = new FileReader();
      const base64File = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          if (!result || !result.includes(',')) {
            reject(new Error('خطا در خواندن فایل'));
            return;
          }
          const base64 = result.split(',')[1];
          console.log('File converted to base64, length:', base64.length);
          if (!base64 || base64.length === 0) {
            reject(new Error('فایل خالی است'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(new Error('خطا در خواندن فایل: ' + (error.target?.error?.message || 'خطای نامشخص')));
        };
        reader.readAsDataURL(file);
      });

      console.log('Sending preview request to server...');
      try {
        const response = await api.post('/media/import/preview', { file: base64File });
        console.log('Preview response received:', response.data);
        return response.data;
      } catch (apiError: any) {
        console.error('API error:', apiError);
        console.error('Response:', apiError.response?.data);
        throw apiError;
      }
    },
    {
      onSuccess: (data) => {
        if (!data || !data.headers || !Array.isArray(data.headers)) {
          toast.showError('خطا: داده‌های دریافتی از سرور نامعتبر است');
          return;
        }
        setPreviewData(data);
        setIsPreviewing(true);
        // Auto-map common column names (including Media Dr.Jafari format)
        const autoMapping: Record<string, string> = {};
        data.headers.forEach((header: string) => {
          const normalized = header.toLowerCase().trim();
          // Name mapping - support various formats (prioritize exact matches)
          if ((normalized.includes('نام') && normalized.includes('خانوادگی')) || 
              normalized === 'نام و نام خانوادگی' ||
              normalized === 'name' ||
              normalized === 'نام') {
            autoMapping[header] = 'name';
          } else if (normalized.includes('نام') && (normalized.includes('خانوادگی') || normalized.includes('surname') || normalized.includes('name'))) {
            autoMapping[header] = 'name';
          } else if (normalized.includes('name') && !normalized.includes('website') && !normalized.includes('domain')) {
            autoMapping[header] = 'name';
          }
          // Type mapping
          if (normalized.includes('نوع') && (normalized.includes('فعالیت') || normalized.includes('activity'))) {
            autoMapping[header] = 'type';
          } else if (normalized.includes('type') && !normalized.includes('service')) {
            autoMapping[header] = 'type';
          }
          // Phone mapping
          if (normalized.includes('تلفن') || normalized.includes('phone') || normalized.includes('موبایل') || normalized.includes('شماره')) {
            autoMapping[header] = 'phone';
          }
          // Website/Domain mapping
          if (normalized.includes('وب‌سایت') || normalized.includes('website') || normalized.includes('سایت') || normalized.includes('domain') || normalized.includes('نام دامنه')) {
            autoMapping[header] = 'website';
          }
          // Balance mapping
          if (normalized.includes('مانده') || normalized.includes('balance') || normalized.includes('باقیمانده')) {
            autoMapping[header] = 'balance';
          }
          // Website start date
          if (normalized.includes('شروع') && (normalized.includes('سایت') || normalized.includes('website'))) {
            autoMapping[header] = 'website_start_date';
          }
          // Website delivery date
          if (normalized.includes('تحویل') && (normalized.includes('سایت') || normalized.includes('website'))) {
            autoMapping[header] = 'website_delivery_date';
          }
          // Code mapping
          if (normalized === 'code' || normalized === 'کد') {
            autoMapping[header] = 'code';
          }
          // Designer mapping
          if (normalized.includes('طراح') || normalized.includes('designer')) {
            autoMapping[header] = 'designer';
          }
          // Company name from website name
          if (normalized.includes('نام وب') || normalized.includes('domain name')) {
            autoMapping[header] = 'company_name';
          }
          // Email
          if (normalized.includes('ایمیل') || normalized.includes('email')) {
            autoMapping[header] = 'email';
          }
          // Address
          if (normalized.includes('آدرس') || normalized.includes('address')) {
            autoMapping[header] = 'address';
          }
          // Score
          if (normalized.includes('امتیاز') || normalized.includes('score')) {
            autoMapping[header] = 'score';
          }
          // Status
          if (normalized.includes('وضعیت') || normalized.includes('status')) {
            autoMapping[header] = 'status';
          }
          // Category
          if (normalized.includes('دسته') || normalized.includes('category')) {
            autoMapping[header] = 'category';
          }
          // Notes
          if (normalized.includes('یادداشت') || normalized.includes('notes') || normalized.includes('توضیحات')) {
            autoMapping[header] = 'notes';
          }
          // Product name
          if (normalized.includes('محصول') || normalized.includes('product')) {
            autoMapping[header] = 'product_name';
          }
          // Service cost
          if (normalized.includes('هزینه خدمات') || (normalized.includes('هزینه') && normalized.includes('خدمات'))) {
            autoMapping[header] = 'service_cost';
          } else if (normalized.includes('هزینه') || normalized.includes('cost') || normalized.includes('مبلغ') || normalized.includes('amount')) {
            autoMapping[header] = 'service_cost';
          }
          // Gender
          if (normalized.includes('جنسیت') || normalized.includes('gender')) {
            autoMapping[header] = 'gender';
          }
          // Site languages count
          if (normalized.includes('تعداد زبان') || normalized.includes('language') && normalized.includes('count')) {
            autoMapping[header] = 'site_languages_count';
          }
          // Service type
          if (normalized.includes('نوع خدمات') || (normalized.includes('نوع') && normalized.includes('خدمات'))) {
            autoMapping[header] = 'service_type';
          }
          // Delivery deadline
          if (normalized.includes('ددلاین') || normalized.includes('deadline')) {
            autoMapping[header] = 'delivery_deadline';
          }
          // Site costs
          if (normalized.includes('هزینه') && normalized.includes('سایت')) {
            autoMapping[header] = 'site_costs';
          }
          // Initial delivery date
          if (normalized.includes('تحویل اولیه') || normalized.includes('initial delivery')) {
            autoMapping[header] = 'initial_delivery_date';
          }
          // Languages added date
          if (normalized.includes('اضافه کردن زبان') || normalized.includes('adding language')) {
            autoMapping[header] = 'languages_added_date';
          }
          // Settlements
          if (normalized.includes('تسویه کمیل') || normalized.includes('kamil')) {
            autoMapping[header] = 'settlement_kamil';
          }
          if (normalized.includes('تسویه اسدان') || normalized.includes('asdan')) {
            autoMapping[header] = 'settlement_asdan';
          }
          if (normalized.includes('تسویه سلیمانی') || normalized.includes('soleimani')) {
            autoMapping[header] = 'settlement_soleimani';
          }
          // Payment stages (واریزی)
          if (normalized.includes('واریزی اول') || (normalized.includes('واریزی') && normalized.includes('1'))) {
            if (normalized.includes('تاریخ')) {
              autoMapping[header] = 'payment_stage_1_date';
            } else {
              autoMapping[header] = 'payment_stage_1';
            }
          }
          if (normalized.includes('واریزی دوم') || (normalized.includes('واریزی') && normalized.includes('2'))) {
            if (normalized.includes('تاریخ')) {
              autoMapping[header] = 'payment_stage_2_date';
            } else {
              autoMapping[header] = 'payment_stage_2';
            }
          }
          if (normalized.includes('واریزی سوم') || (normalized.includes('واریزی') && normalized.includes('3'))) {
            if (normalized.includes('تاریخ')) {
              autoMapping[header] = 'payment_stage_3_date';
            } else {
              autoMapping[header] = 'payment_stage_3';
            }
          }
          if (normalized.includes('واریزی چهارم') || (normalized.includes('واریزی') && normalized.includes('4'))) {
            if (normalized.includes('تاریخ')) {
              autoMapping[header] = 'payment_stage_4_date';
            } else {
              autoMapping[header] = 'payment_stage_4';
            }
          }
          // Payment stages (پرداخت)
          if (normalized.includes('پرداخت') && normalized.includes('1') || normalized.includes('payment') && normalized.includes('1') || normalized.includes('مرحله') && normalized.includes('1')) {
            if (normalized.includes('تاریخ') || normalized.includes('date')) {
              autoMapping[header] = 'payment_stage_1_date';
            } else {
              autoMapping[header] = 'payment_stage_1';
            }
          }
          if (normalized.includes('پرداخت') && normalized.includes('2') || normalized.includes('payment') && normalized.includes('2') || normalized.includes('مرحله') && normalized.includes('2')) {
            if (normalized.includes('تاریخ') || normalized.includes('date')) {
              autoMapping[header] = 'payment_stage_2_date';
            } else {
              autoMapping[header] = 'payment_stage_2';
            }
          }
          if (normalized.includes('پرداخت') && normalized.includes('3') || normalized.includes('payment') && normalized.includes('3') || normalized.includes('مرحله') && normalized.includes('3')) {
            if (normalized.includes('تاریخ') || normalized.includes('date')) {
              autoMapping[header] = 'payment_stage_3_date';
            } else {
              autoMapping[header] = 'payment_stage_3';
            }
          }
          if (normalized.includes('پرداخت') && normalized.includes('4') || normalized.includes('payment') && normalized.includes('4') || normalized.includes('مرحله') && normalized.includes('4')) {
            if (normalized.includes('تاریخ') || normalized.includes('date')) {
              autoMapping[header] = 'payment_stage_4_date';
            } else {
              autoMapping[header] = 'payment_stage_4';
            }
          }
        });
        
        console.log('Auto-mapping result:', autoMapping);
        console.log('Name field mapped:', Object.values(autoMapping).includes('name'));
        
        // Warn if name is not auto-mapped
        if (!Object.values(autoMapping).includes('name')) {
          console.warn('⚠️ ستون "نام و نام خانوادگی" به صورت خودکار شناسایی نشد. لطفاً به صورت دستی map کنید.');
          toast.showWarning('ستون "نام و نام خانوادگی" به صورت خودکار شناسایی نشد. لطفاً این ستون را به فیلد "نام و نام خانوادگی *" نگاشت کنید.');
        }
        
        setMapping(autoMapping);
      },
      onError: (error: any) => {
        console.error('Preview error:', error);
        const errorMessage = error.response?.data?.error || error.message || 'خطا در پیش‌نمایش فایل';
        toast.showError(`خطا در خواندن فایل: ${errorMessage}`);
      },
    }
  );

  const importMutation = useMutation(
    async () => {
      if (!importFile) throw new Error('فایلی انتخاب نشده است');

      const reader = new FileReader();
      const base64File = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(importFile);
      });

      const response = await api.post('/media/import/customers', {
        file: base64File,
        mapping,
        createDeals,
        createProjects,
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        console.log('Import response:', data);
        
        if (data.error) {
          console.error('Import error from backend:', data.error);
          toast.showError(`خطا در واردات: ${data.error}`);
          return;
        }
        
        // Check if there are any 404 errors in the errors array
        const has404Error = data.errors?.some((err: any) => 
          err.error?.includes('404') || err.error?.includes('یافت نشد') || err.error?.includes('not found')
        );
        
        let message = `واردات با موفقیت انجام شد.\n${data.successCount || 0} مشتری وارد شد.${data.dealsCreated ? `\n${data.dealsCreated} معامله ایجاد شد.` : ''}${data.projectsCreated ? `\n${data.projectsCreated} پروژه ایجاد شد (برای مشتریانی که مانده دارند).` : ''}`;
        
        if (data.errors?.length > 0) {
          message += `\n${data.errors.length} خطا رخ داد.`;
          // Show first few error messages
          const firstErrors = data.errors.slice(0, 3).map((err: any) => `  - سطر ${err.row}: ${err.error}`).join('\n');
          if (firstErrors) {
            message += `\n\nخطاهای اولیه:\n${firstErrors}`;
          }
          if (has404Error) {
            message += '\n\n⚠️ توجه: برخی خطاهای 404 در واردات رخ داده است. لطفاً لاگ‌های سرور را بررسی کنید.';
          }
          console.error('Import errors:', data.errors);
          // Show first few errors in console
          data.errors.slice(0, 5).forEach((err: any, idx: number) => {
            console.error(`Error ${idx + 1} (Row ${err.row}):`, err.error);
          });
        }
        
        toast.showSuccess(message.replace(/\n/g, ' - '));
        setImportFile(null);
        setPreviewData(null);
        setMapping({});
        setIsPreviewing(false);
        
        // Invalidate queries to refresh all lists automatically
        queryClient.invalidateQueries('customers');
        queryClient.invalidateQueries('projects');
        queryClient.invalidateQueries('deals');
        queryClient.invalidateQueries('accounts');
        
        onSuccess(data);
      },
      onError: (error: any) => {
        console.error('Import error:', error);
        console.error('Error response:', error.response);
        const errorMessage = error.response?.data?.error || error.message || 'خطا در واردات فایل';
        const statusCode = error.response?.status;
        if (statusCode === 404) {
          toast.showError(`خطا 404: مسیر API یافت نشد. لطفاً سرور را بررسی کنید. ${errorMessage}`);
        } else {
          toast.showError(`خطا در واردات: ${errorMessage}${statusCode ? ` (کد خطا: ${statusCode})` : ''}`);
        }
      },
    }
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setPreviewData(null);
      setMapping({});
      setIsPreviewing(false);
      // Don't auto-preview, wait for user to click preview button
    }
  };

  const handlePreview = () => {
    if (importFile) {
      previewMutation.mutate(importFile);
    } else {
      toast.showWarning('لطفاً ابتدا فایل Excel را انتخاب کنید');
    }
  };

  const fieldLabels: Record<string, string> = {
    name: 'نام و نام خانوادگی *',
    type: 'نوع فعالیت *',
    email: 'ایمیل',
    phone: 'تلفن همراه',
    company_name: 'نام شرکت / دامنه',
    address: 'آدرس',
    website: 'اسم سایت ( نام دامنه )',
    score: 'امتیاز',
    status: 'وضعیت',
    category: 'دسته‌بندی',
    notes: 'توضیحات',
    product_name: 'نام محصول',
    service_cost: 'هزینه خدمات (مبلغ)',
    balance: 'مانده',
    website_start_date: 'تاریخ شروع سایت',
    website_delivery_date: 'تاریخ تحویل سایت',
    code: 'Code',
    designer: 'طراح',
    gender: 'جنسیت',
    site_languages_count: 'تعداد زبان های سایت ها',
    service_type: 'نوع خدمات',
    delivery_deadline: 'ددلاین تحویل',
    site_costs: 'هزینه ها برای سایت ها',
    initial_delivery_date: 'تاریخ اتمام و تحویل اولیه سایت',
    languages_added_date: 'تاریخ اضافه کردن زبان های سایت',
    payment_stage_1: 'واریزی اول',
    payment_stage_1_date: 'تاریخ واریز اول',
    payment_stage_2: 'واریزی دوم',
    payment_stage_2_date: 'تاریخ واریز دوم',
    payment_stage_3: 'واریزی سوم',
    payment_stage_3_date: 'تاریخ واریز سوم',
    payment_stage_4: 'واریزی چهارم',
    payment_stage_4_date: 'تاریخ واریز چهارم',
    settlement_kamil: 'تسویه کمیل',
    settlement_asdan: 'تسویه اسدان',
    settlement_soleimani: 'تسویه سلیمانی',
  };

  const typeOptions = ['company', 'individual', 'export', 'import', 'coaching'];
  const statusOptions = ['active', 'inactive', 'lead', 'customer', 'partner'];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">راهنمای واردات مشتریان از Excel:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>فایل باید فرمت Excel (.xlsx) باشد</li>
              <li><strong>ستون "نام و نام خانوادگی" الزامی است</strong></li>
              <li>سیستم به صورت خودکار ستون‌های رایج را شناسایی می‌کند</li>
              <li>می‌توانید ستون‌ها را به صورت دستی به فیلدهای سیستم نگاشت کنید</li>
              <li>نوع فعالیت (صادرات/واردات) به صورت خودکار به نوع مشتری تبدیل می‌شود</li>
              <li>اگر گزینه "ایجاد معامله" فعال باشد، برای مشتریانی که هزینه سرویس دارند، Deal ایجاد می‌شود</li>
              <li><strong>پروژه‌هایی که مانده پرداخت دارند (Balance &gt; 0) به صورت خودکار در بخش Projects ایجاد می‌شوند</strong></li>
              <li><strong>اگر مشتری با همان نام و تلفن وجود داشته باشد، اطلاعات به‌روزرسانی می‌شود (رونوشت ایجاد نمی‌شود)</strong></li>
              <li>هر مشتری یک شناسه یکتا (unique_id) دارد که قابل تغییر نیست</li>
              <li>پس از واردات، مشتریان در لیست مشتریان قرار می‌گیرند</li>
              <li>پروژه‌های ایجاد شده در بخش Projects قابل مشاهده هستند</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-primary-600" size={24} />
          <h2 className="text-xl font-bold">واردات مشتریان از Excel</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">انتخاب فایل Excel</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="input"
              />
              {importFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet size={20} />
                  <span>{importFile.name}</span>
                </div>
              )}
            </div>
            {importFile && !isPreviewing && (
              <div className="mt-4">
                <button
                  onClick={handlePreview}
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={previewMutation.isLoading}
                >
                  <FileSpreadsheet size={20} />
                  {previewMutation.isLoading ? 'در حال خواندن فایل...' : 'پیش‌نمایش فایل'}
                </button>
              </div>
            )}
          </div>

          {previewMutation.isLoading && (
            <div className="text-center py-4 text-gray-600">در حال خواندن فایل...</div>
          )}

          {previewMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                خطا در خواندن فایل: {previewMutation.error instanceof Error ? previewMutation.error.message : 'خطای نامشخص'}
              </p>
            </div>
          )}

          {previewData && isPreviewing && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>تعداد ردیف‌ها:</strong> {previewData.totalRows}
                </p>
              </div>

              <div className="overflow-x-auto">
                <h3 className="font-bold mb-2">پیش‌نمایش داده‌ها:</h3>
                <table className="table text-sm">
                  <thead>
                    <tr>
                      {previewData.headers.map((header: string, idx: number) => (
                        <th key={idx}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview.slice(1, 6).map((row: any[], rowIdx: number) => (
                      <tr key={rowIdx}>
                        {row.map((cell: any, cellIdx: number) => (
                          <td key={cellIdx}>{String(cell || '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">نگاشت ستون‌ها به فیلدهای سیستم:</h3>
                  {!Object.values(mapping).includes('name') && (
                    <span className="text-red-600 text-sm font-medium">
                      ⚠️ ستون "نام و نام خانوادگی" باید map شود!
                    </span>
                  )}
                </div>
                {Object.entries(fieldLabels).map(([field, label]) => {
                  // Find which Excel column is mapped to this field
                  const mappedColumn = Object.keys(mapping).find(key => mapping[key] === field) || '';
                  
                  const isRequired = field === 'name';
                  const isMapped = !!mappedColumn;
                  
                  return (
                    <div key={field} className={`flex items-center gap-4 ${isRequired && !isMapped ? 'bg-red-50 p-2 rounded border border-red-200' : ''}`}>
                      <label className={`w-40 text-sm font-medium ${isRequired ? 'font-bold' : ''}`}>
                        {label} {isRequired && <span className="text-red-600">*</span>}
                      </label>
                      <select
                        value={mappedColumn}
                        onChange={(e) => {
                          const newMapping = { ...mapping };
                          // Remove old mapping for this field
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === field) {
                              delete newMapping[key];
                            }
                          });
                          // Remove mapping from the selected column if it was mapped to another field
                          if (e.target.value && newMapping[e.target.value]) {
                            delete newMapping[e.target.value];
                          }
                          // Add new mapping: excelColumn -> systemField
                          if (e.target.value) {
                            newMapping[e.target.value] = field;
                          }
                          setMapping(newMapping);
                        }}
                        className="input flex-1"
                      >
                        <option value="">-- انتخاب ستون --</option>
                        {previewData.headers.map((header: string) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    {field === 'type' && mappedColumn && (
                      <select
                        value={''}
                        onChange={() => {}}
                        className="input w-48"
                        disabled
                      >
                        <option>company, individual, export, import, coaching</option>
                      </select>
                    )}
                    {field === 'status' && mappedColumn && (
                      <select
                        value={''}
                        onChange={() => {}}
                        className="input w-48"
                        disabled
                      >
                        <option>active, inactive, lead, customer, partner</option>
                      </select>
                    )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createDeals"
                    checked={createDeals}
                    onChange={(e) => setCreateDeals(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="createDeals" className="text-sm font-medium">
                    ایجاد معامله (Deal) برای مشتریانی که هزینه سرویس دارند
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createProjects"
                    checked={createProjects}
                    onChange={(e) => setCreateProjects(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="createProjects" className="text-sm font-medium">
                    ایجاد پروژه برای مشتریانی که هزینه سرویس یا مانده حساب دارند
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      // Check if name field is mapped
                      const nameMapped = Object.keys(mapping).some(key => mapping[key] === 'name');
                      if (!nameMapped) {
                        toast.showWarning('لطفاً حداقل ستون "نام و نام خانوادگی" را نگاشت کنید');
                        return;
                      }
                      importMutation.mutate();
                    }}
                    className="btn btn-primary flex items-center gap-2"
                    disabled={importMutation.isLoading || !Object.keys(mapping).some(key => mapping[key] === 'name')}
                  >
                    <Upload size={20} />
                    {importMutation.isLoading ? 'در حال واردات...' : 'واردات مشتریان'}
                  </button>
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setPreviewData(null);
                      setMapping({});
                      setIsPreviewing(false);
                    }}
                    className="btn btn-secondary"
                  >
                    شروع مجدد
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Media;


