import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Edit, Trash2, FolderOpen, Calendar, Users, DollarSign, X, Tag } from 'lucide-react';
import { toJalali, formatDateForInput } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import Pagination from '../components/Pagination';

const Projects = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const { data: projects } = useQuery(['projects', filterStatus], async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    const response = await api.get(`/projects?${params.toString()}`);
    return Array.isArray(response.data) ? response.data : [];
  });

  // Pagination calculations - memoized for performance
  const { totalItems, totalPages, paginatedProjects } = useMemo(() => {
    const projectsArray = Array.isArray(projects) ? projects : [];
    const total = projectsArray.length;
    const pages = Math.ceil(total / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = projectsArray.slice(start, end);
    
    return {
      totalItems: total,
      totalPages: pages,
      paginatedProjects: paginated,
    };
  }, [projects, currentPage, itemsPerPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  const createMutation = useMutation(
    (data: any) => api.post('/projects', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        setShowModal(false);
        setEditingProject(null);
        alert('پروژه با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.error || error.message || 'خطای نامشخص';
        console.error('Error creating project:', error);
        alert('خطا در ایجاد پروژه: ' + errorMessage);
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/projects/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        setShowModal(false);
        setEditingProject(null);
        alert('پروژه با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/projects/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        alert('پروژه با موفقیت حذف شد');
      },
    }
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 border-green-300', // ✅ سبز → تکمیل شده
      'customer_following': 'bg-blue-600 text-white border-blue-700', // 🔵 آبی پررنگ (theme:4) → مشتری در حال پیگیری
      'in_progress': 'bg-blue-200 text-blue-800 border-blue-300', // 🔵 آبی کمرنگ (theme:9) → در حال رسیدگی
      'cooperation_ended': 'bg-red-500 text-white border-red-600', // 🔴 قرمز → اتمام همکاری
      'on_hold': 'bg-orange-100 text-orange-700 border-orange-300', // 🟠 نارنجی → هولد شده
      planning: 'bg-gray-100 text-gray-700 border-gray-300',
      active: 'bg-blue-100 text-blue-700 border-blue-300',
      cancelled: 'bg-red-100 text-red-700 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'تکمیل شده',
      'customer_following': 'مشتری در حال پیگیری',
      'in_progress': 'در حال رسیدگی',
      'cooperation_ended': 'اتمام همکاری',
      'on_hold': 'هولد شده',
      planning: 'در حال برنامه‌ریزی',
      active: 'انجام شده',
      cancelled: 'لغو شده',
    };
    return labels[status] || status;
  };

  const getStatusBorderColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'border-l-4 border-green-500',
      'customer_following': 'border-l-4 border-blue-600',
      'in_progress': 'border-l-4 border-blue-300',
      'cooperation_ended': 'border-l-4 border-red-500',
      'on_hold': 'border-l-4 border-orange-500',
      planning: 'border-l-4 border-gray-400',
      active: 'border-l-4 border-blue-400',
      cancelled: 'border-l-4 border-red-400',
    };
    return colors[status] || 'border-l-4 border-gray-400';
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card flex-shrink-0">
          <h1 className="page-heading-gradient text-xl sm:text-2xl">پروژه‌ها</h1>
          <button
            onClick={() => {
              setEditingProject(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">پروژه جدید</span>
            <span className="sm:hidden">جدید</span>
          </button>
        </div>

        {/* Filter */}
        <div className="glass-card flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <label className="text-sm font-medium whitespace-nowrap">فیلتر وضعیت:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input flex-1"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="completed">✅ تکمیل شده</option>
              <option value="customer_following">🔵 مشتری در حال پیگیری</option>
              <option value="in_progress">🔵 در حال رسیدگی</option>
              <option value="cooperation_ended">🔴 اتمام همکاری</option>
              <option value="on_hold">🟠 هولد شده</option>
              <option value="planning">در حال برنامه‌ریزی</option>
              <option value="active">انجام شده</option>
              <option value="cancelled">لغو شده</option>
            </select>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus('')}
                className="btn btn-secondary text-sm whitespace-nowrap"
              >
                پاک کردن فیلتر
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
        {paginatedProjects?.map((project: any) => (
          <div
            key={project.id}
            onClick={() => navigate(`/projects/${project.id}`)}
            className={`card-hover cursor-pointer ${getStatusBorderColor(project.status)} p-3 sm:p-4`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FolderOpen className="text-primary-600 flex-shrink-0 sm:w-6 sm:h-6" size={20} />
                <h3 className="font-bold text-base sm:text-lg break-words">{project.name}</h3>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
                {project.labels && project.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {project.labels.map((label: any) => (
                      <span
                        key={label.id}
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${label.label_color}20`,
                          color: label.label_color,
                          border: `1px solid ${label.label_color}40`
                        }}
                      >
                        {label.label_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {project.description && (
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mb-3 line-clamp-2 break-words">{project.description}</p>
            )}
            <div className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
              {project.account_name && (
                <div className="flex items-center gap-2">
                  <Users size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{project.account_name}</span>
                </div>
              )}
              {project.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">شروع: {toJalali(project.start_date)}</span>
                </div>
              )}
              {project.end_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">پایان: {toJalali(project.end_date)}</span>
                </div>
              )}
              {project.budget && (
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">بودجه: {toPersianNumber(new Intl.NumberFormat('fa-IR').format(project.budget))}</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingProject(project);
                  setShowModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                title="ویرایش"
              >
                <Edit size={14} className="sm:w-4 sm:h-4" />
                <span>ویرایش</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('آیا مطمئن هستید؟')) {
                    deleteMutation.mutate(project.id);
                  }
                }}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 hover:bg-danger-100 dark:hover:bg-danger-900/50 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                title="حذف"
              >
                <Trash2 size={14} className="sm:w-4 sm:h-4" />
                <span>حذف</span>
              </button>
            </div>
          </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
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

      {showModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowModal(false);
            setEditingProject(null);
          }}
          onSave={(data: any) => {
            if (editingProject) {
              updateMutation.mutate({ id: editingProject.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}

      </div>
    </div>
  );
};

const ProjectModal = ({ project, onClose, onSave }: any) => {
  const queryClient = useQueryClient();
  
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

  // Fetch project labels
  const { data: projectLabels = [] } = useQuery(
    ['project-labels', project?.id],
    async () => {
      if (!project?.id) return [];
      try {
        const response = await api.get(`/projects/${project.id}/labels`);
        return response.data || [];
      } catch {
        return [];
      }
    },
    { enabled: !!project?.id }
  );

  // Fetch available labels
  const { data: availableLabels = [] } = useQuery(
    'available-labels',
    async () => {
      try {
        const response = await api.get('/projects/labels/available');
        return response.data || [];
      } catch {
        return [];
      }
    }
  );

  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');

  const addLabelMutation = useMutation(
    ({ projectId, labelName, labelColor }: { projectId: number; labelName: string; labelColor: string }) =>
      api.post(`/projects/${projectId}/labels`, { label_name: labelName, label_color: labelColor }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-labels', project?.id]);
        setNewLabelName('');
        setNewLabelColor('#3B82F6');
      },
    }
  );

  const deleteLabelMutation = useMutation(
    ({ projectId, labelId }: { projectId: number; labelId: number }) =>
      api.delete(`/projects/${projectId}/labels/${labelId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-labels', project?.id]);
      },
    }
  );

  const [formData, setFormData] = useState({
    account_id: project?.account_id || '',
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'planning',
    start_date: project?.start_date ? formatDateForInput(project.start_date) : '',
    end_date: project?.end_date ? formatDateForInput(project.end_date) : '',
    budget: project?.budget || '',
    payment_stage_1: project?.payment_stage_1 || '',
    payment_stage_1_date: project?.payment_stage_1_date ? formatDateForInput(project.payment_stage_1_date) : '',
    payment_stage_2: project?.payment_stage_2 || '',
    payment_stage_2_date: project?.payment_stage_2_date ? formatDateForInput(project.payment_stage_2_date) : '',
    payment_stage_3: project?.payment_stage_3 || '',
    payment_stage_3_date: project?.payment_stage_3_date ? formatDateForInput(project.payment_stage_3_date) : '',
    payment_stage_4: project?.payment_stage_4 || '',
    payment_stage_4_date: project?.payment_stage_4_date ? formatDateForInput(project.payment_stage_4_date) : '',
    settlement_kamil: project?.settlement_kamil || '',
    settlement_asdan: project?.settlement_asdan || '',
    settlement_soleimani: project?.settlement_soleimani || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      alert('لطفاً نام پروژه را وارد کنید');
      return;
    }

    const submitData: any = {
      name: formData.name.trim(),
      description: formData.description ? formData.description.trim() : null,
      status: formData.status || 'planning',
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    // Only include account_id if it's selected and valid
    if (formData.account_id && formData.account_id !== '' && formData.account_id !== '0') {
      const accountId = parseInt(formData.account_id.toString());
      if (!isNaN(accountId) && accountId > 0) {
        submitData.account_id = accountId;
      }
    }

    // Only include budget if it's provided
    if (formData.budget && formData.budget !== '') {
      submitData.budget = parseFloat(formData.budget);
    }

    // Payment stages
    if (formData.payment_stage_1 && formData.payment_stage_1 !== '') {
      submitData.payment_stage_1 = parseFloat(formData.payment_stage_1);
    }
    if (formData.payment_stage_1_date) {
      submitData.payment_stage_1_date = formData.payment_stage_1_date;
    }
    if (formData.payment_stage_2 && formData.payment_stage_2 !== '') {
      submitData.payment_stage_2 = parseFloat(formData.payment_stage_2);
    }
    if (formData.payment_stage_2_date) {
      submitData.payment_stage_2_date = formData.payment_stage_2_date;
    }
    if (formData.payment_stage_3 && formData.payment_stage_3 !== '') {
      submitData.payment_stage_3 = parseFloat(formData.payment_stage_3);
    }
    if (formData.payment_stage_3_date) {
      submitData.payment_stage_3_date = formData.payment_stage_3_date;
    }
    if (formData.payment_stage_4 && formData.payment_stage_4 !== '') {
      submitData.payment_stage_4 = parseFloat(formData.payment_stage_4);
    }
    if (formData.payment_stage_4_date) {
      submitData.payment_stage_4_date = formData.payment_stage_4_date;
    }

    // Settlements
    if (formData.settlement_kamil) {
      submitData.settlement_kamil = formData.settlement_kamil === 'true' ? 'true' : formData.settlement_kamil;
    }
    if (formData.settlement_asdan) {
      submitData.settlement_asdan = formData.settlement_asdan === 'true' ? 'true' : formData.settlement_asdan;
    }
    if (formData.settlement_soleimani) {
      submitData.settlement_soleimani = formData.settlement_soleimani === 'true' ? 'true' : formData.settlement_soleimani;
    }

    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold mb-4">{project ? 'ویرایش' : 'ایجاد'} پروژه</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">نام پروژه *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
            />
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
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">وضعیت</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="planning">در حال برنامه‌ریزی</option>
                <option value="active">انجام شده</option>
                <option value="completed">✅ تکمیل شده</option>
                <option value="customer_following">🔵 مشتری در حال پیگیری</option>
                <option value="in_progress">🔵 در حال رسیدگی</option>
                <option value="cooperation_ended">🔴 اتمام همکاری</option>
                <option value="on_hold">🟠 هولد شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
            </div>
            <div>
              <label className="label">تاریخ شروع</label>
              <JalaliDatePicker
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                placeholder="تاریخ شروع را انتخاب کنید"
              />
            </div>
            <div>
              <label className="label">تاریخ پایان</label>
              <JalaliDatePicker
                value={formData.end_date}
                onChange={(value) => setFormData({ ...formData, end_date: value })}
                placeholder="تاریخ پایان را انتخاب کنید"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">بودجه</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="input"
              />
            </div>
          </div>
          
          {/* Payment Stages */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">پرداخت‌های مرحله‌ای</h3>
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4].map((stage) => (
                <div key={stage} className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">مرحله {stage} - مبلغ (تومان)</label>
                    <input
                      type="number"
                      value={formData[`payment_stage_${stage}` as keyof typeof formData] || ''}
                      onChange={(e) => setFormData({ ...formData, [`payment_stage_${stage}`]: e.target.value })}
                      className="input"
                      placeholder="مبلغ را وارد کنید"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">تاریخ</label>
                    <JalaliDatePicker
                      value={formData[`payment_stage_${stage}_date` as keyof typeof formData] as string || ''}
                      onChange={(value) => setFormData({ ...formData, [`payment_stage_${stage}_date`]: value })}
                      placeholder="تاریخ را انتخاب کنید"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Settlements */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">تسویه‌ها</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">تسویه کمیل</label>
                <select
                  value={formData.settlement_kamil}
                  onChange={(e) => setFormData({ ...formData, settlement_kamil: e.target.value })}
                  className="input"
                >
                  <option value="">--</option>
                  <option value="true">بله</option>
                  <option value="false">خیر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تسویه اسدان</label>
                <select
                  value={formData.settlement_asdan}
                  onChange={(e) => setFormData({ ...formData, settlement_asdan: e.target.value })}
                  className="input"
                >
                  <option value="">--</option>
                  <option value="true">بله</option>
                  <option value="false">خیر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تسویه سلیمانی</label>
                <select
                  value={formData.settlement_soleimani}
                  onChange={(e) => setFormData({ ...formData, settlement_soleimani: e.target.value })}
                  className="input"
                >
                  <option value="">--</option>
                  <option value="true">بله</option>
                  <option value="false">خیر</option>
                </select>
              </div>
            </div>
          </div>

          {/* Labels Section - Only show when editing existing project */}
          {project?.id && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Tag size={20} />
                لیبل‌ها
              </h3>
              
              {/* Existing Labels */}
              {projectLabels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {projectLabels.map((label: any) => (
                    <span
                      key={label.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${label.label_color}20`,
                        color: label.label_color,
                        border: `1px solid ${label.label_color}40`
                      }}
                    >
                      {label.label_name}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('آیا از حذف این لیبل اطمینان دارید؟')) {
                            deleteLabelMutation.mutate({ projectId: project.id, labelId: label.id });
                          }
                        }}
                        className="hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add New Label */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="نام لیبل جدید"
                  className="input flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newLabelName.trim() && project?.id) {
                      e.preventDefault();
                      addLabelMutation.mutate({
                        projectId: project.id,
                        labelName: newLabelName.trim(),
                        labelColor: newLabelColor
                      });
                    }
                  }}
                />
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                  title="انتخاب رنگ"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newLabelName.trim() && project?.id) {
                      addLabelMutation.mutate({
                        projectId: project.id,
                        labelName: newLabelName.trim(),
                        labelColor: newLabelColor
                      });
                    }
                  }}
                  disabled={!newLabelName.trim() || addLabelMutation.isLoading}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  افزودن
                </button>
              </div>

              {/* Available Labels */}
              {availableLabels.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">لیبل‌های موجود:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableLabels
                      .filter((label: any) => !projectLabels.some((pl: any) => pl.label_name === label.label_name))
                      .map((label: any) => (
                        <button
                          key={label.label_name}
                          type="button"
                          onClick={() => {
                            if (project?.id) {
                              addLabelMutation.mutate({
                                projectId: project.id,
                                labelName: label.label_name,
                                labelColor: label.label_color
                              });
                            }
                          }}
                          className="px-3 py-1 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${label.label_color}20`,
                            color: label.label_color,
                            border: `1px solid ${label.label_color}40`
                          }}
                        >
                          {label.label_name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
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


export default Projects;

