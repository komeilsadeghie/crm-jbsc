import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Target, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';

const Coaching = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sessions' | 'goals' | 'exercises' | 'reports'>('sessions');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'session' | 'goal' | 'exercise' | 'report'>('session');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);

  const { data: customers } = useQuery('customers', async () => {
    const response = await api.get('/customers?type=coaching');
    return response.data;
  });

  const { data: sessions } = useQuery(
    ['coaching-sessions', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/sessions${params}`);
      return response.data;
    }
  );

  const { data: goals } = useQuery(
    ['coaching-goals', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/goals${params}`);
      return response.data;
    }
  );

  const { data: exercises } = useQuery(
    ['coaching-exercises', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/exercises${params}`);
      return response.data;
    }
  );

  const { data: reports } = useQuery(
    ['coaching-reports', selectedCustomer],
    async () => {
      const params = selectedCustomer ? `?customer_id=${selectedCustomer}` : '';
      const response = await api.get(`/coaching/reports${params}`);
      return response.data;
    }
  );

  const tabs = [
    { id: 'sessions', label: 'جلسات کوچینگ', icon: Clock },
    { id: 'goals', label: 'اهداف (KPI/OKR)', icon: Target },
    { id: 'exercises', label: 'تمرین‌ها', icon: CheckCircle },
    { id: 'reports', label: 'گزارش رشد', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">ماژول کوچینگ</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedCustomer || ''}
            onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
            className="input w-64"
          >
            <option value="">همه مشتریان</option>
            {customers?.map((customer: any) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            افزودن {tabs.find(t => t.id === activeTab)?.label}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setModalType(tab.id === 'sessions' ? 'session' : tab.id === 'goals' ? 'goal' : tab.id === 'exercises' ? 'exercise' : 'report');
              }}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === 'sessions' && (
          <SessionsList
            sessions={sessions}
            customers={customers}
            onEdit={(session) => {
              setEditingItem(session);
              setModalType('session');
              setShowModal(true);
            }}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsList
            goals={goals}
            customers={customers}
            onEdit={(goal) => {
              setEditingItem(goal);
              setModalType('goal');
              setShowModal(true);
            }}
          />
        )}

        {activeTab === 'exercises' && (
          <ExercisesList
            exercises={exercises}
            goals={goals}
            customers={customers}
            onEdit={(exercise) => {
              setEditingItem(exercise);
              setModalType('exercise');
              setShowModal(true);
            }}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsList
            reports={reports}
            customers={customers}
            onEdit={(report) => {
              setEditingItem(report);
              setModalType('report');
              setShowModal(true);
            }}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CoachingModal
          type={modalType}
          item={editingItem}
          customers={customers}
          goals={goals}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

const SessionsList = ({ sessions, customers, onEdit }: any) => {
  const getCustomerName = (id: number) => {
    return customers?.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="space-y-4">
      {sessions?.map((session: any) => (
        <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium">{getCustomerName(session.customer_id)}</span>
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(session.status)}`}>
                  {session.status}
                </span>
                <span className="text-sm text-gray-600">
                  {new Date(session.session_date).toLocaleDateString('fa-IR')}
                </span>
                {session.duration && (
                  <span className="text-sm text-gray-600">{session.duration} دقیقه</span>
                )}
              </div>
              {session.notes && (
                <p className="text-gray-700">{session.notes}</p>
              )}
            </div>
            <button
              onClick={() => onEdit(session)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
            >
              ویرایش
            </button>
          </div>
        </div>
      ))}
      {(!sessions || sessions.length === 0) && (
        <div className="text-center py-12 text-gray-500">جلسه‌ای ثبت نشده است</div>
      )}
    </div>
  );
};

const GoalsList = ({ goals, customers, onEdit }: any) => {
  const getCustomerName = (id: number) => {
    return customers?.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getProgress = (goal: any) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  return (
    <div className="space-y-4">
      {goals?.map((goal: any) => {
        const progress = getProgress(goal);
        return (
          <div key={goal.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-lg">{goal.title}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    goal.type === 'kpi' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {goal.type.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {getCustomerName(goal.customer_id)}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-gray-700 mb-2">{goal.description}</p>
                )}
                {goal.target_value && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        {goal.current_value} / {goal.target_value} {goal.unit || ''}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => onEdit(goal)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded"
              >
                ویرایش
              </button>
            </div>
          </div>
        );
      })}
      {(!goals || goals.length === 0) && (
        <div className="text-center py-12 text-gray-500">هدفی ثبت نشده است</div>
      )}
    </div>
  );
};

const ExercisesList = ({ exercises, goals, customers, onEdit }: any) => {
  const getCustomerName = (id: number) => {
    return customers?.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  const getGoalTitle = (id: number) => {
    return goals?.find((g: any) => g.id === id)?.title || 'بدون هدف';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="space-y-4">
      {exercises?.map((exercise: any) => (
        <div key={exercise.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium">{exercise.title}</span>
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(exercise.status)}`}>
                  {exercise.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <span>مشتری: {getCustomerName(exercise.customer_id)}</span>
                {exercise.goal_id && (
                  <span className="mr-4">هدف: {getGoalTitle(exercise.goal_id)}</span>
                )}
                {exercise.due_date && (
                  <span>مهلت: {new Date(exercise.due_date).toLocaleDateString('fa-IR')}</span>
                )}
              </div>
              {exercise.description && (
                <p className="text-gray-700 mb-2">{exercise.description}</p>
              )}
              {exercise.instructions && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium mb-1">دستورالعمل:</p>
                  <p className="text-sm text-gray-700">{exercise.instructions}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => onEdit(exercise)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
            >
              ویرایش
            </button>
          </div>
        </div>
      ))}
      {(!exercises || exercises.length === 0) && (
        <div className="text-center py-12 text-gray-500">تمرینی ثبت نشده است</div>
      )}
    </div>
  );
};

const ReportsList = ({ reports, customers, onEdit }: any) => {
  const getCustomerName = (id: number) => {
    return customers?.find((c: any) => c.id === id)?.name || 'نامشخص';
  };

  return (
    <div className="space-y-4">
      {reports?.map((report: any) => (
        <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium">{getCustomerName(report.customer_id)}</span>
                <span className="text-sm text-gray-600">
                  {new Date(report.report_date).toLocaleDateString('fa-IR')}
                </span>
                {report.overall_score && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded">
                    نمره کلی: {report.overall_score}
                  </span>
                )}
              </div>
              {report.achievements && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-green-700 mb-1">دستاوردها:</p>
                  <p className="text-gray-700">{report.achievements}</p>
                </div>
              )}
              {report.challenges && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-yellow-700 mb-1">چالش‌ها:</p>
                  <p className="text-gray-700">{report.challenges}</p>
                </div>
              )}
              {report.next_steps && (
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">مراحل بعدی:</p>
                  <p className="text-gray-700">{report.next_steps}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => onEdit(report)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
            >
              ویرایش
            </button>
          </div>
        </div>
      ))}
      {(!reports || reports.length === 0) && (
        <div className="text-center py-12 text-gray-500">گزارشی ثبت نشده است</div>
      )}
    </div>
  );
};

const CoachingModal = ({ type, item, customers, goals, onClose }: any) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState<any>(() => {
    if (type === 'session') {
      return {
        customer_id: item?.customer_id || '',
        coach_id: item?.coach_id || user?.id || '',
        session_date: item?.session_date || '',
        duration: item?.duration || '',
        notes: item?.notes || '',
        status: item?.status || 'scheduled',
      };
    } else if (type === 'goal') {
      return {
        customer_id: item?.customer_id || '',
        title: item?.title || '',
        description: item?.description || '',
        type: item?.type || 'kpi',
        target_value: item?.target_value || '',
        current_value: item?.current_value || 0,
        unit: item?.unit || '',
        deadline: item?.deadline || '',
        status: item?.status || 'active',
      };
    } else if (type === 'exercise') {
      return {
        customer_id: item?.customer_id || '',
        goal_id: item?.goal_id || '',
        title: item?.title || '',
        description: item?.description || '',
        instructions: item?.instructions || '',
        due_date: item?.due_date || '',
        status: item?.status || 'pending',
      };
    } else {
      return {
        customer_id: item?.customer_id || '',
        report_date: item?.report_date || new Date().toISOString().split('T')[0],
        achievements: item?.achievements || '',
        challenges: item?.challenges || '',
        next_steps: item?.next_steps || '',
        overall_score: item?.overall_score || '',
      };
    }
  });

  const mutation = useMutation(
    (data: any) => {
      if (item) {
        if (type === 'session') {
          return api.put(`/coaching/sessions/${item.id}`, data);
        } else if (type === 'goal') {
          return api.put(`/coaching/goals/${item.id}`, data);
        } else if (type === 'exercise') {
          return api.put(`/coaching/exercises/${item.id}`, data);
        } else {
          return api.put(`/coaching/reports/${item.id}`, data);
        }
      } else {
        if (type === 'session') {
          return api.post('/coaching/sessions', data);
        } else if (type === 'goal') {
          return api.post('/coaching/goals', data);
        } else if (type === 'exercise') {
          return api.post('/coaching/exercises', data);
        } else {
          return api.post('/coaching/reports', data);
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('coaching-sessions');
        queryClient.invalidateQueries('coaching-goals');
        queryClient.invalidateQueries('coaching-exercises');
        queryClient.invalidateQueries('coaching-reports');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {item ? 'ویرایش' : 'افزودن'} {type === 'session' ? 'جلسه' : type === 'goal' ? 'هدف' : type === 'exercise' ? 'تمرین' : 'گزارش'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'session' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">تاریخ جلسه *</label>
                  <input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مدت زمان (دقیقه)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || null })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="scheduled">زمان‌بندی شده</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="cancelled">لغو شده</option>
                    <option value="rescheduled">زمان‌بندی مجدد</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">یادداشت‌ها</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={4}
                />
              </div>
            </>
          )}

          {type === 'goal' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">عنوان *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نوع *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="kpi">KPI</option>
                    <option value="okr">OKR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مقدار هدف</label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || null })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مقدار فعلی</label>
                  <input
                    type="number"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">واحد</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input"
                    placeholder="مثلاً: درصد، تومان، تعداد"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مهلت</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">فعال</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="cancelled">لغو شده</option>
                    <option value="on_hold">در انتظار</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
            </>
          )}

          {type === 'exercise' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">هدف (اختیاری)</label>
                <select
                  value={formData.goal_id || ''}
                  onChange={(e) => setFormData({ ...formData, goal_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="input"
                >
                  <option value="">بدون هدف</option>
                  {goals?.map((goal: any) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">عنوان *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">مهلت</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="pending">در انتظار</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="overdue">منقضی شده</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">دستورالعمل</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="input"
                  rows={4}
                />
              </div>
            </>
          )}

          {type === 'report' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">مشتری *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                  className="input"
                  required
                >
                  <option value="">انتخاب مشتری</option>
                  {customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">تاریخ گزارش *</label>
                  <input
                    type="date"
                    value={formData.report_date}
                    onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نمره کلی</label>
                  <input
                    type="number"
                    value={formData.overall_score}
                    onChange={(e) => setFormData({ ...formData, overall_score: parseFloat(e.target.value) || null })}
                    className="input"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">دستاوردها</label>
                <textarea
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">چالش‌ها</label>
                <textarea
                  value={formData.challenges}
                  onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">مراحل بعدی</label>
                <textarea
                  value={formData.next_steps}
                  onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                  className="input"
                  rows={3}
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

export default Coaching;

