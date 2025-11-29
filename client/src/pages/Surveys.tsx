import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Edit, Trash2, ClipboardList, Eye, BarChart3, Users } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';

const Surveys = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<any>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    survey_type: 'staff',
    is_active: true,
    is_anonymous: false,
    allow_multiple_responses: false,
    start_date: '',
    end_date: '',
    questions: [] as any[],
  });

  const { data: surveys, isLoading } = useQuery('surveys', async () => {
    const response = await api.get('/surveys');
    return response.data || [];
  });

  const createMutation = useMutation(
    (data: any) => api.post('/surveys', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('surveys');
        setShowModal(false);
        setEditingSurvey(null);
        resetForm();
        alert('نظرسنجی با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateMutation = useMutation(
    (data: any) => api.put(`/surveys/${editingSurvey?.id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('surveys');
        setShowModal(false);
        setEditingSurvey(null);
        resetForm();
        alert('نظرسنجی با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/surveys/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('surveys');
        alert('نظرسنجی با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      survey_type: 'staff',
      is_active: true,
      is_anonymous: false,
      allow_multiple_responses: false,
      start_date: '',
      end_date: '',
      questions: [],
    });
  };

  const handleEdit = (survey: any) => {
    setEditingSurvey(survey);
    setFormData({
      title: survey.title || '',
      description: survey.description || '',
      survey_type: survey.survey_type || 'staff',
      is_active: survey.is_active === 1,
      is_anonymous: survey.is_anonymous === 1,
      allow_multiple_responses: survey.allow_multiple_responses === 1,
      start_date: survey.start_date ? survey.start_date.split('T')[0] : '',
      end_date: survey.end_date ? survey.end_date.split('T')[0] : '',
      questions: survey.questions || [],
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.survey_type) {
      alert('لطفاً عنوان و نوع نظرسنجی را وارد کنید');
      return;
    }

    const submitData = {
      ...formData,
      questions: formData.questions.map((q: any) => ({
        ...q,
        options: q.options && typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })),
    };

    if (editingSurvey) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, {
        question_text: '',
        question_type: 'text',
        options: [],
        is_required: false,
      }],
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      staff: 'کارکنان',
      leads: 'سرنخ‌ها',
      clients: 'مشتریان',
      mailing_list: 'لیست ایمیل',
      public: 'عمومی',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-600">نظرسنجی‌ها</h1>
        <button
          onClick={() => {
            setEditingSurvey(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          نظرسنجی جدید
        </button>
      </div>

      {/* Surveys List */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-right">عنوان</th>
              <th className="p-3 text-right">نوع</th>
              <th className="p-3 text-right">وضعیت</th>
              <th className="p-3 text-right">تعداد پاسخ</th>
              <th className="p-3 text-right">تاریخ شروع</th>
              <th className="p-3 text-right">تاریخ پایان</th>
              <th className="p-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center">در حال بارگذاری...</td>
              </tr>
            ) : surveys?.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center">نظرسنجی‌ای یافت نشد</td>
              </tr>
            ) : (
              surveys?.map((survey: any) => (
                <tr key={survey.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{survey.title}</td>
                  <td className="p-3">{getTypeLabel(survey.survey_type)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${survey.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {survey.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="p-3">{survey.response_count || 0}</td>
                  <td className="p-3">{survey.start_date ? toJalali(survey.start_date) : '-'}</td>
                  <td className="p-3">{survey.end_date ? toJalali(survey.end_date) : '-'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSurvey(survey)}
                        className="text-blue-600 hover:text-blue-800"
                        title="مشاهده پاسخ‌ها"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(survey)}
                        className="text-green-600 hover:text-green-800"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('آیا از حذف این نظرسنجی اطمینان دارید؟')) {
                            deleteMutation.mutate(survey.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <SurveyModal
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowModal(false);
            setEditingSurvey(null);
            resetForm();
          }}
          onSubmit={handleSubmit}
          onAddQuestion={handleAddQuestion}
          onRemoveQuestion={handleRemoveQuestion}
          onQuestionChange={handleQuestionChange}
          isSubmitting={createMutation.isLoading || updateMutation.isLoading}
        />
      )}

      {/* Responses Modal */}
      {selectedSurvey && (
        <ResponsesModal
          survey={selectedSurvey}
          onClose={() => setSelectedSurvey(null)}
        />
      )}
    </div>
  );
};

const SurveyModal = ({
  formData,
  setFormData,
  onClose,
  onSubmit,
  onAddQuestion,
  onRemoveQuestion,
  onQuestionChange,
  isSubmitting,
}: any) => {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">نظرسنجی جدید</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">عنوان *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
                placeholder="عنوان نظرسنجی"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع نظرسنجی *</label>
              <select
                required
                value={formData.survey_type}
                onChange={(e) => setFormData({ ...formData, survey_type: e.target.value })}
                className="input w-full"
              >
                <option value="staff">کارکنان</option>
                <option value="leads">سرنخ‌ها</option>
                <option value="clients">مشتریان</option>
                <option value="mailing_list">لیست ایمیل</option>
                <option value="public">عمومی</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              rows={3}
              placeholder="توضیحات نظرسنجی..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm">فعال</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm">ناشناس</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allow_multiple_responses}
                onChange={(e) => setFormData({ ...formData, allow_multiple_responses: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm">اجازه پاسخ چندگانه</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Questions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">سوالات</label>
              <button
                type="button"
                onClick={onAddQuestion}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                + افزودن سوال
              </button>
            </div>
            {formData.questions.map((question: any, index: number) => (
              <div key={index} className="mb-4 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <input
                    type="text"
                    placeholder="متن سوال"
                    value={question.question_text}
                    onChange={(e) => onQuestionChange(index, 'question_text', e.target.value)}
                    className="input text-sm"
                  />
                  <select
                    value={question.question_type}
                    onChange={(e) => onQuestionChange(index, 'question_type', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="text">متن</option>
                    <option value="textarea">متن چندخطی</option>
                    <option value="radio">انتخاب تکی</option>
                    <option value="checkbox">انتخاب چندگانه</option>
                    <option value="select">لیست کشویی</option>
                    <option value="rating">امتیاز</option>
                    <option value="date">تاریخ</option>
                  </select>
                </div>
                {(question.question_type === 'radio' || question.question_type === 'checkbox' || question.question_type === 'select') && (
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="گزینه‌ها (با کاما جدا کنید)"
                      value={Array.isArray(question.options) ? question.options.join(', ') : ''}
                      onChange={(e) => {
                        const options = e.target.value.split(',').map((o: string) => o.trim()).filter((o: string) => o);
                        onQuestionChange(index, 'options', options);
                      }}
                      className="input text-sm w-full"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={question.is_required}
                      onChange={(e) => onQuestionChange(index, 'is_required', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">الزامی</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveQuestion(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    حذف سوال
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ResponsesModal = ({ survey, onClose }: any) => {
  const { data: responses, isLoading } = useQuery(
    ['survey-responses', survey.id],
    async () => {
      const response = await api.get(`/surveys/${survey.id}/responses`);
      return response.data || [];
    }
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">پاسخ‌های نظرسنجی: {survey.title}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            ✕
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : responses?.length === 0 ? (
          <div className="text-center py-8">پاسخی یافت نشد</div>
        ) : (
          <div className="space-y-4">
            {responses?.map((response: any, index: number) => (
              <div key={response.id} className="p-4 bg-gray-50 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">پاسخ #{index + 1}</span>
                    {response.user_name && <span className="text-sm text-gray-600 mr-2">- {response.user_name}</span>}
                    {response.contact_name && <span className="text-sm text-gray-600 mr-2">- {response.contact_name}</span>}
                  </div>
                  <span className="text-xs text-gray-500">{toJalali(response.submitted_at)}</span>
                </div>
                <pre className="text-sm bg-white p-2 rounded overflow-x-auto">
                  {JSON.stringify(JSON.parse(response.response_data), null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Surveys;

