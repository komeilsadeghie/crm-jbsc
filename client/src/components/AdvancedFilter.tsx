import { useState } from 'react';
import { Filter, X, Calendar, User, Tag, DollarSign } from 'lucide-react';
import JalaliDatePicker from './JalaliDatePicker';

interface AdvancedFilterProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  filterConfig: {
    dateRange?: boolean;
    status?: { label: string; options: { value: string; label: string }[] };
    type?: { label: string; options: { value: string; label: string }[] };
    user?: { label: string; options: { value: number; label: string }[] };
    category?: { label: string; options: { value: string; label: string }[] };
    amountRange?: { label: string };
    searchFields?: { label: string; fields: string[] };
    customFields?: { label: string; field: string; type: 'text' | 'number' | 'select'; options?: { value: string; label: string }[] }[];
  };
}

const AdvancedFilter = ({ filters, onFiltersChange, filterConfig }: AdvancedFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters || {});

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters: any = {};
    if (filterConfig.dateRange) {
      resetFilters.dateFrom = '';
      resetFilters.dateTo = '';
    }
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    setIsOpen(false);
  };

  const activeFiltersCount = Object.values(localFilters).filter(v => v !== '' && v !== null && v !== undefined).length;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary flex items-center gap-2 relative"
      >
        <Filter size={18} />
        فیلتر پیشرفته
        {activeFiltersCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-4 sm:p-6">
          {/* نیم‌لایه تیره پشت مودال */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />

          {/* پنل فیلتر، وسط ناحیه محتوا و انعطاف‌پذیر */}
          <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 max-h-[85vh] overflow-y-auto scrollbar-neumorphic">
            <div className="flex justify-between items-center mb-4 px-6 pt-4 pb-4 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Filter size={20} />
                فیلتر پیشرفته
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 pb-6">
              {/* Date Range */}
              {filterConfig.dateRange && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium flex items-center gap-2">
                    <Calendar size={16} />
                    بازه تاریخ
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">از تاریخ</label>
                      <JalaliDatePicker
                        value={localFilters.dateFrom || ''}
                        onChange={(value) => setLocalFilters({ ...localFilters, dateFrom: value })}
                        placeholder="از تاریخ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">تا تاریخ</label>
                      <JalaliDatePicker
                        value={localFilters.dateTo || ''}
                        onChange={(value) => setLocalFilters({ ...localFilters, dateTo: value })}
                        placeholder="تا تاریخ"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status Filter */}
              {filterConfig.status && (
                <div>
                  <label className="block text-sm font-medium mb-2">{filterConfig.status.label}</label>
                  <select
                    value={localFilters.status || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
                    className="input"
                  >
                    <option value="">همه</option>
                    {filterConfig.status.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type Filter */}
              {filterConfig.type && (
                <div>
                  <label className="block text-sm font-medium mb-2">{filterConfig.type.label}</label>
                  <select
                    value={localFilters.type || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
                    className="input"
                  >
                    <option value="">همه</option>
                    {filterConfig.type.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* User Filter */}
              {filterConfig.user && (
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <User size={16} />
                    {filterConfig.user.label}
                  </label>
                  <select
                    value={localFilters.userId || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, userId: e.target.value ? parseInt(e.target.value) : '' })}
                    className="input"
                  >
                    <option value="">همه</option>
                    {filterConfig.user.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Filter */}
              {filterConfig.category && (
                <div>
                  <label className="block text-sm font-medium mb-2">{filterConfig.category.label}</label>
                  <select
                    value={localFilters.category || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                    className="input"
                  >
                    <option value="">همه</option>
                    {filterConfig.category.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount Range */}
              {filterConfig.amountRange && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium flex items-center gap-2">
                    <DollarSign size={16} />
                    {filterConfig.amountRange.label}
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">حداقل</label>
                      <input
                        type="number"
                        value={localFilters.amountMin || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, amountMin: e.target.value })}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">حداکثر</label>
                      <input
                        type="number"
                        value={localFilters.amountMax || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, amountMax: e.target.value })}
                        className="input"
                        placeholder="∞"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {filterConfig.customFields && filterConfig.customFields.map((field, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium mb-2">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={localFilters[field.field] || ''}
                      onChange={(e) => setLocalFilters({ ...localFilters, [field.field]: e.target.value })}
                      className="input"
                    >
                      <option value="">همه</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      value={localFilters[field.field] || ''}
                      onChange={(e) => setLocalFilters({ ...localFilters, [field.field]: e.target.value })}
                      className="input"
                    />
                  ) : (
                    <input
                      type="text"
                      value={localFilters[field.field] || ''}
                      onChange={(e) => setLocalFilters({ ...localFilters, [field.field]: e.target.value })}
                      className="input"
                      placeholder={`جستجو در ${field.label}`}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-between gap-2 mt-6 pt-4 border-t">
                <button
                  onClick={handleReset}
                  className="btn btn-secondary flex-1"
                >
                  پاک کردن
                </button>
                <button
                  onClick={handleApply}
                  className="btn btn-primary flex-1"
                >
                  اعمال فیلتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;








