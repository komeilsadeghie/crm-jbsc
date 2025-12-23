import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CheckSquare, Clock, List, Kanban, GanttChart, Calendar, Filter, Tag, FolderOpen, Trash2, Edit, Edit2, X } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import { translateTaskStatus, translatePriority } from '../utils/translations';
import JalaliDatePicker from '../components/JalaliDatePicker';
import Pagination from '../components/Pagination';
import { isSuccessfulResponse, hasResponseError, getErrorMessage, getSuccessMessage } from '../utils/mutationHelper';
import { useToast } from '../contexts/ToastContext';

const Tasks = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const { data: projects } = useQuery('projects', async () => {
    const response = await api.get('/projects');
    return response.data || [];
  });

  const { data: kanbanData, isLoading, error: kanbanError } = useQuery(
    ['tasks-kanban', projectFilter],
    async () => {
      const params = projectFilter ? `?project_id=${projectFilter}` : '';
      const response = await api.get(`/tasks/kanban/board${params}`);
      return response.data;
    },
    {
      retry: 1,
      refetchInterval: 30 * 1000, // ✅ هر 30 ثانیه یکبار refresh (برای بورد Kanban)
      keepPreviousData: true, // ✅ نمایش داده قبلی
      onError: (error) => {
        console.error('Error fetching kanban board:', error);
      }
    }
  );

  const { data: kanbanColumns, error: columnsError } = useQuery(
    'tasks-kanban-columns',
    async () => {
      try {
        const response = await api.get('/tasks/kanban/columns');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching kanban columns:', error);
        return [];
      }
    },
    {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const kanbanBoard = kanbanData?.tasks || {};
  const columns = kanbanData?.columns || kanbanColumns || [
    { column_id: 'todo', title: 'انجام نشده', color: '#FEE2E2' },
    { column_id: 'in_progress', title: 'در حال انجام', color: '#DBEAFE' },
    { column_id: 'review', title: 'در حال بررسی', color: '#FEF3C7' },
    { column_id: 'done', title: 'انجام شده', color: '#D1FAE5' },
  ];

  const { data: tasksList } = useQuery(
    ['tasks-list', projectFilter],
    async () => {
      const params = projectFilter ? `?project_id=${projectFilter}` : '';
      const response = await api.get(`/tasks${params}`);
      return Array.isArray(response.data) ? response.data : [];
    },
    {
      refetchInterval: 60 * 1000, // ✅ هر 60 ثانیه یکبار refresh
      keepPreviousData: true, // ✅ نمایش داده قبلی
    }
  );

  // Pagination calculations for list view - memoized for performance
  const { totalItems, totalPages, paginatedTasks } = useMemo(() => {
    const tasksArray = Array.isArray(tasksList) ? tasksList : [];
    const total = tasksArray.length;
    const pages = Math.ceil(total / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = tasksArray.slice(start, end);
    
    return {
      totalItems: total,
      totalPages: pages,
      paginatedTasks: paginated,
    };
  }, [tasksList, currentPage, itemsPerPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  const createMutation = useMutation(
    (data: any) => api.post('/tasks', data),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('tasks-kanban');
        queryClient.invalidateQueries('tasks-list');
        queryClient.invalidateQueries('pending-tasks');
        window.dispatchEvent(new Event('task-updated'));
        setShowModal(false);
        setEditingTask(null);
        toast.showSuccess(getSuccessMessage(response, 'تسک با موفقیت ایجاد شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/tasks/${id}`, data),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          toast.showError('خطا: ' + response.data.error);
          return;
        }
        queryClient.invalidateQueries('tasks-kanban');
        queryClient.invalidateQueries('tasks-list');
        queryClient.invalidateQueries('pending-tasks'); // Update notifications
        // Dispatch custom event to notify Header component
        window.dispatchEvent(new Event('task-updated'));
        setShowModal(false);
        setEditingTask(null);
        toast.showSuccess(getSuccessMessage(response, 'تسک با موفقیت به‌روزرسانی شد'));
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const updatePositionMutation = useMutation(
    ({ id, position, kanban_column }: { id: number; position: number; kanban_column: string }) =>
      api.put(`/tasks/${id}/position`, { position, kanban_column }),
    {
      onSuccess: (response: any) => {
        // ✅ بررسی response - اگر error واقعی دارد، نشان بده
        if (hasResponseError(response)) {
          console.error('Server returned error in response:', response.data.error);
          return;
        }
        queryClient.invalidateQueries('tasks-kanban');
        queryClient.invalidateQueries('tasks-list');
        queryClient.invalidateQueries('pending-tasks'); // Update notifications when status changes
        // Force refetch of pending tasks
        setTimeout(() => {
          queryClient.refetchQueries('pending-tasks');
          window.dispatchEvent(new Event('task-updated'));
        }, 100);
      },
      onError: (error: any) => {
        const status = error.response?.status;
        if (status && status >= 400) {
          console.error('Error updating task position:', error);
          toast.showError('خطا: ' + getErrorMessage(error));
        }
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/tasks/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks-kanban');
        queryClient.invalidateQueries('tasks-list');
        queryClient.invalidateQueries('pending-tasks');
        window.dispatchEvent(new Event('task-updated'));
        setSelectedTask(null);
        toast.showSuccess('تسک با موفقیت حذف شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleDelete = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation(); // Prevent opening task detail modal
    if (window.confirm('آیا از حذف این تسک اطمینان دارید؟')) {
      deleteMutation.mutate(taskId);
    }
  };

  const getTaskCardColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:border-green-400';
      case 'in_progress':
        return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300 hover:border-gray-400';
      case 'review':
        return 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300 hover:border-orange-400';
      case 'todo':
      default:
        return 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300 hover:border-red-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'review':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'todo':
      default:
        return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  const handleDragStart = (e: React.DragEvent, task: any) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('task', JSON.stringify(task));
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
    console.log('Drag started for task:', task.id, 'to column:', task.kanban_column);
  };

  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const taskData = JSON.parse(e.dataTransfer.getData('task'));
      const tasksInColumn = kanbanBoard?.[column] || [];
      const oldStatus = taskData.kanban_column || taskData.status;
      const newStatus = column;
      
      console.log('Dropping task to column:', column, 'Task:', taskData.id, 'Old:', oldStatus, 'New:', newStatus);
      
      // If task moved from todo to done, log the time automatically
      if ((oldStatus === 'todo' || oldStatus === 'in_progress' || oldStatus === 'review') && newStatus === 'done') {
        // Calculate time difference if task has a start time
        const now = new Date();
        const startTime = taskData.start_time ? new Date(taskData.start_time) : now;
        const durationMinutes = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60)));
        
        // Log time automatically
        if (durationMinutes > 0) {
          api.post(`/tasks/${taskData.id}/time/log`, {
            start_time: taskData.start_time || startTime.toISOString(),
            end_time: now.toISOString(),
            duration_minutes: durationMinutes,
            note: 'زمان ثبت شده به صورت خودکار هنگام انتقال تسک به انجام شده',
          }).catch((error) => {
            console.error('Error logging time automatically:', error);
            // Continue with position update even if time logging fails
          });
        }
      }
      
      updatePositionMutation.mutate({
        id: taskData.id,
        position: tasksInColumn.length,
        kanban_column: column,
      });
    } catch (error) {
      console.error('Error in handleDrop:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    e.dataTransfer.effectAllowed = 'move';
  };

  const [editingColumn, setEditingColumn] = useState<{ id: number; title: string } | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const createColumnMutation = useMutation(
    (data: any) => api.post('/tasks/kanban/columns', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks-kanban');
        setShowAddColumn(false);
        setNewColumnTitle('');
        toast.showSuccess('ستون با موفقیت اضافه شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateColumnMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/tasks/kanban/columns/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks-kanban');
        setEditingColumn(null);
        toast.showSuccess('ستون با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteColumnMutation = useMutation(
    (id: number) => api.delete(`/tasks/kanban/columns/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks-kanban');
        toast.showSuccess('ستون با موفقیت حذف شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 md:pt-6">
        <div className="text-center py-12">در حال بارگذاری...</div>
      </div>
    );
  }

  if (kanbanError || columnsError) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 md:pt-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card p-6 text-center">
            <h2 className="text-xl font-bold mb-2 text-red-600">خطا در نمایش صفحه</h2>
            <p className="text-neutral-600 mb-4">متأسفانه مشکلی در بارگذاری داده‌ها رخ داده است.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              بارگذاری مجدد
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure columns is always an array
  const safeColumns = Array.isArray(columns) ? columns : [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center card">
          <h1 className="page-heading-gradient">وظایف</h1>
        <div className="flex gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input"
          >
            <option value="">همه پروژه‌ها</option>
            {projects?.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          >
            <Kanban size={20} />
          </button>
          <button
            onClick={() => {
              setEditingTask(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            تسک جدید
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max" style={{ minHeight: '600px' }}>
            {safeColumns.map((column: any) => {
              const columnId = column.column_id || column.id;
              const tasks = Array.isArray(kanbanBoard?.[columnId]) ? kanbanBoard[columnId] : [];
              const columnColor = column.color || '#E5E7EB';
              
              return (
                <div
                  key={columnId}
                  className="flex-shrink-0 w-80 rounded-lg p-4"
                  style={{ backgroundColor: columnColor }}
                  onDrop={(e) => handleDrop(e, columnId)}
                  onDragOver={handleDragOver}
                >
                  <div className="flex items-center justify-between mb-4 sticky top-0 bg-white/80 dark:bg-neutral-800/80 backdrop-blur p-2 rounded">
                    {editingColumn?.id === column.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingColumn.title}
                          onChange={(e) => setEditingColumn({ ...editingColumn, title: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border rounded dark:bg-neutral-700 dark:text-neutral-100"
                          onBlur={() => {
                            if (editingColumn.title.trim() && column.id) {
                              updateColumnMutation.mutate({
                                id: column.id,
                                data: { title: editingColumn.title.trim() }
                              });
                            }
                            setEditingColumn(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setEditingColumn(null);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-lg text-center flex-1 text-neutral-900 dark:text-neutral-100">
                          {column.title || column.label} ({toPersianNumber(tasks.length)})
                        </h3>
                        {isAdmin && column.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingColumn({ id: column.id, title: column.title || column.label })}
                              className="p-1 hover:bg-white/50 rounded transition-colors"
                              title="ویرایش نام"
                            >
                              <Edit2 size={14} />
                            </button>
                            {columns.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm('آیا مطمئن هستید که می‌خواهید این ستون را حذف کنید؟')) {
                                    deleteColumnMutation.mutate(column.id);
                                  }
                                }}
                                className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                                title="حذف ستون"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="space-y-3">
                    {tasks.map((task: any) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        onClick={() => setSelectedTask(task)}
                        className="bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-md cursor-move hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="font-medium text-gray-800 dark:text-neutral-100 mb-2">
                          {task.title}
                        </div>
                        {task.project_name && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs border border-blue-200">
                              <FolderOpen size={10} />
                              {task.project_name}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="text-sm text-gray-600 dark:text-neutral-300 mb-1">
                            📅 {toJalali(task.due_date)}
                          </div>
                        )}
                        {task.assigned_to_name && (
                          <div className="text-sm text-gray-600 dark:text-neutral-300 mb-1">
                            👤 {task.assigned_to_name}
                          </div>
                        )}
                        {task.description && (
                          <div className="text-xs text-gray-500 dark:text-neutral-400 mt-2 line-clamp-2">
                            {task.description}
                          </div>
                        )}
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-center text-gray-400 py-8 text-sm">
                        خالی
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isAdmin && safeColumns.length > 0 && (
              <div className="flex-shrink-0 w-80">
                {showAddColumn ? (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600">
                    <input
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      placeholder="نام ستون جدید"
                      className="w-full px-3 py-2 mb-2 border rounded dark:bg-neutral-700 dark:text-neutral-100"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newColumnTitle.trim()) {
                          const columnId = `column_${Date.now()}`;
                          createColumnMutation.mutate({
                            column_id: columnId,
                            title: newColumnTitle.trim(),
                            color: '#E5E7EB',
                            position: columns.length
                          });
                        } else if (e.key === 'Escape') {
                          setShowAddColumn(false);
                          setNewColumnTitle('');
                        }
                      }}
                      autoFocus
                    />
                    <input
                      type="color"
                      defaultValue="#E5E7EB"
                      onChange={(e) => {
                        // You can add color picker logic here
                      }}
                      className="w-full mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (newColumnTitle.trim()) {
                            const columnId = `column_${Date.now()}`;
                            createColumnMutation.mutate({
                              column_id: columnId,
                              title: newColumnTitle.trim(),
                              color: '#E5E7EB',
                              position: columns.length
                            });
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                      >
                        افزودن
                      </button>
                      <button
                        onClick={() => {
                          setShowAddColumn(false);
                          setNewColumnTitle('');
                        }}
                        className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddColumn(true)}
                    className="w-full h-full min-h-[600px] border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center text-neutral-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    <Plus size={24} className="ml-2" />
                    افزودن ستون
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card">
          <div className="space-y-3">
            {paginatedTasks?.map((task: any) => (
              <div
                key={task.id}
                data-task-id={task.id}
                onClick={() => setSelectedTask(task)}
                className={`${getTaskCardColor(task.status)} border-2 rounded-xl p-4 cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 group`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-medium text-neutral-800">{task.title}</span>
                      {task.project_name && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 text-blue-700 rounded text-xs border border-blue-200">
                          <FolderOpen size={12} />
                          {task.project_name}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusBadgeColor(task.status)}`}>
                        {translateTaskStatus(task.status)}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex gap-4 text-xs text-neutral-500">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {toJalali(task.due_date)}
                        </span>
                      )}
                      {task.assigned_to_name && (
                        <span>👤 {task.assigned_to_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                        setShowModal(true);
                      }}
                      className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                      title="ویرایش تسک"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, task.id)}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                      title="حذف تسک"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {totalItems > 0 && (
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
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

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSave={(data: any) => {
            if (editingTask) {
              updateMutation.mutate({ id: editingTask.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
      </div>
    </div>
  );
};

const TaskModal = ({ task, onClose, onSave }: any) => {
  const { data: projects } = useQuery('projects', async () => {
    const response = await api.get('/projects');
    return response.data || [];
  });

  const { data: users } = useQuery('assignable-users', async () => {
    try {
      const response = await api.get('/users/assignable');
      return response.data || [];
    } catch {
      return [];
    }
  });

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    assigned_to: task?.assigned_to || '',
    project_id: task?.project_id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      project_id: formData.project_id ? parseInt(formData.project_id.toString()) : null,
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to.toString()) : null,
    };
    onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-neutral-800">{task ? 'ویرایش' : 'ایجاد'} تسک</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">عنوان</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">وضعیت</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="todo">{translateTaskStatus('todo')}</option>
                <option value="in_progress">{translateTaskStatus('in_progress')}</option>
                <option value="review">در حال بررسی</option>
                <option value="done">{translateTaskStatus('done')}</option>
              </select>
            </div>
            <div>
              <label className="label">اولویت</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input"
              >
                <option value="low">{translatePriority('low')}</option>
                <option value="medium">{translatePriority('medium')}</option>
                <option value="high">{translatePriority('high')}</option>
              </select>
            </div>
            <div>
              <label className="label">تاریخ سررسید</label>
              <JalaliDatePicker
                value={formData.due_date}
                onChange={(value) => setFormData({ ...formData, due_date: value })}
                placeholder="تاریخ سررسید را انتخاب کنید"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">پروژه</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب پروژه</option>
                {projects?.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اختصاص داده شده به</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="input"
              >
                <option value="">انتخاب کاربر</option>
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
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

const TaskDetailModal = ({ task, onClose }: any) => {
  const queryClient = useQueryClient();
  const { data: taskDetail } = useQuery(
    ['task-detail', task.id],
    async () => {
      const response = await api.get(`/tasks/${task.id}`);
      return response.data;
    },
    { enabled: !!task }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/tasks/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks-kanban');
        queryClient.invalidateQueries('tasks-list');
        queryClient.invalidateQueries('pending-tasks');
        window.dispatchEvent(new Event('task-updated'));
        onClose();
        toast.showSuccess('تسک با موفقیت حذف شد');
      },
      onError: (error: any) => {
        toast.showError('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleDelete = () => {
    if (window.confirm('آیا از حذف این تسک اطمینان دارید؟')) {
      deleteMutation.mutate(task.id);
    }
  };

  const [timeLogId, setTimeLogId] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch active time log
  const { data: activeTimeLog } = useQuery(
    ['active-time-log', task.id],
    async () => {
      try {
        const response = await api.get(`/tasks/${task.id}/time/active`);
        return response.data;
      } catch {
        return null;
      }
    },
    {
      enabled: !!task,
      refetchInterval: 1000, // Refetch every second to update timer
      onSuccess: (data) => {
        if (data && data.id) {
          setTimeLogId(data.id);
          const startTime = new Date(data.start_time).getTime();
          const updateElapsed = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000); // seconds
            setElapsedTime(elapsed);
          };
          updateElapsed();
          if (timerInterval) clearInterval(timerInterval);
          const interval = setInterval(updateElapsed, 1000);
          setTimerInterval(interval);
        } else {
          setTimeLogId(null);
          setElapsedTime(0);
          if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
          }
        }
      },
    }
  );

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startTimeMutation = useMutation(
    () => api.post(`/tasks/${task.id}/time/start`),
    {
      onSuccess: (data) => {
        setTimeLogId(data.data.id);
        queryClient.invalidateQueries(['active-time-log', task.id]);
      },
    }
  );

  const stopTimeMutation = useMutation(
    ({ logId }: { logId: number }) => api.put(`/tasks/${task.id}/time/${logId}/stop`, {}),
    {
      onSuccess: () => {
        setTimeLogId(null);
        setElapsedTime(0);
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
        queryClient.invalidateQueries(['active-time-log', task.id]);
        queryClient.invalidateQueries(['task-detail', task.id]);
      },
    }
  );

  if (!taskDetail) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">{taskDetail.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
              title="حذف تسک"
              disabled={deleteMutation.isLoading}
            >
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2">توضیحات</h3>
            <p className="text-gray-700">{taskDetail.description || 'بدون توضیحات'}</p>
          </div>

          {taskDetail.project_name && (
            <div>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <FolderOpen size={20} />
                پروژه
              </h3>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                {taskDetail.project_name}
              </span>
            </div>
          )}

          {taskDetail.checklist && taskDetail.checklist.length > 0 && (
            <div>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <CheckSquare size={20} />
                چک‌لیست
              </h3>
              <div className="space-y-2">
                {taskDetail.checklist.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.is_completed === 1}
                      readOnly
                      className="w-4 h-4"
                    />
                    <span className={item.is_completed === 1 ? 'line-through text-gray-500' : ''}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {taskDetail.subtasks && taskDetail.subtasks.length > 0 && (
            <div>
              <h3 className="font-bold mb-2">زیرتسک‌ها</h3>
              <div className="space-y-2">
                {taskDetail.subtasks.map((subtask: any) => (
                  <div key={subtask.id} className="border rounded p-2">
                    <div className="font-medium">{subtask.title}</div>
                    <div className="text-sm text-gray-600">{subtask.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Clock size={20} />
              تایمر زمان
            </h3>
            <div className="flex items-center gap-4">
              {timeLogId ? (
                <>
                  <div className="flex-1 bg-gradient-to-r from-primary-50 to-info-50 border-2 border-primary-300 rounded-lg p-4">
                    <div className="text-sm text-neutral-600 mb-1">زمان سپری شده:</div>
                    <div className="text-3xl font-bold text-primary-700 font-mono">
                      {formatTime(elapsedTime)}
                    </div>
                  </div>
                  <button
                    onClick={() => stopTimeMutation.mutate({ logId: timeLogId })}
                    className="btn btn-danger whitespace-nowrap"
                  >
                    توقف تایمر
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startTimeMutation.mutate()}
                  className="btn btn-primary"
                >
                  شروع تایمر
                </button>
              )}
            </div>
          </div>

          {taskDetail.timeLogs && taskDetail.timeLogs.length > 0 && (
            <div>
              <h3 className="font-bold mb-2">لاگ‌های زمان</h3>
              <div className="space-y-2">
                {taskDetail.timeLogs.map((log: any) => (
                  <div key={log.id} className="border rounded p-2">
                    <div className="text-sm">
                      {log.duration_minutes ? `${log.duration_minutes} دقیقه` : 'در حال اجرا'}
                    </div>
                    {log.description && (
                      <div className="text-xs text-gray-600">{log.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tasks;

