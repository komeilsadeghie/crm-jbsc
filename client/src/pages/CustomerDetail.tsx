import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ArrowRight, Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toJalali } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { useToast } from '../contexts/ToastContext';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<any>(null);

  const { data: customer, isLoading } = useQuery(
    ['customer', id],
    async () => {
      const response = await api.get(`/customers/${id}`);
      return response.data;
    }
  );

  const { data: interactions } = useQuery(
    ['interactions', id],
    async () => {
      const response = await api.get(`/interactions?customer_id=${id}`);
      const data = response.data;
      return Array.isArray(data) ? data : [];
    }
  );

  const deleteInteractionMutation = useMutation(
    (interactionId: number) => api.delete(`/interactions/${interactionId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['interactions', id]);
      },
    }
  );

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  if (!customer) {
    return <div className="text-center py-12">مشتری یافت نشد</div>;
  }

  return (
    <div className="space-y-6 pt-20 sm:pt-24 md:pt-6">
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
      >
        <ArrowRight size={20} />
        بازگشت به لیست مشتریان
      </button>

      {/* Customer Info */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{customer.name}</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded">{customer.type}</span>
              <span className={`px-3 py-1 rounded ${
                customer.status === 'active' ? 'bg-green-100 text-green-700' :
                customer.status === 'inactive' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {customer.status}
              </span>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded">
                نمره: {customer.score}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {customer.email && (
            <div>
              <p className="text-sm text-gray-600 mb-1">ایمیل</p>
              <p className="font-medium">{customer.email}</p>
            </div>
          )}
          {customer.phone && (
            <div>
              <p className="text-sm text-gray-600 mb-1">تلفن</p>
              <p className="font-medium">{customer.phone}</p>
            </div>
          )}
          {customer.company_name && (
            <div>
              <p className="text-sm text-gray-600 mb-1">نام شرکت</p>
              <p className="font-medium">{customer.company_name}</p>
            </div>
          )}
          {customer.website && (
            <div>
              <p className="text-sm text-gray-600 mb-1">وب‌سایت</p>
              <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                {customer.website}
              </a>
            </div>
          )}
          {customer.category && (
            <div>
              <p className="text-sm text-gray-600 mb-1">دسته‌بندی</p>
              <p className="font-medium">{customer.category}</p>
            </div>
          )}
        </div>

        {customer.notes && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 mb-2">یادداشت‌ها</p>
            <p className="text-gray-800">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Interactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">تاریخچه تعاملات</h2>
          <button
            onClick={() => {
              setEditingInteraction(null);
              setShowInteractionModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            افزودن تعامل
          </button>
        </div>

        <div className="space-y-4">
          {Array.isArray(interactions) && interactions.map((interaction: any) => (
            <div key={interaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                      {interaction.type}
                    </span>
                    {interaction.subject && (
                      <span className="font-medium">{interaction.subject}</span>
                    )}
                    <span className="text-sm text-gray-500">
                      {toJalali(interaction.created_at)}
                    </span>
                  </div>
                  
                  {interaction.description && (
                    <p className="text-gray-700 mb-2">{interaction.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {interaction.amount && (
                      <div>
                        <span className="text-gray-600">مبلغ: </span>
                        <span className="font-medium">{new Intl.NumberFormat('fa-IR').format(interaction.amount)} تومان</span>
                      </div>
                    )}
                    {interaction.deposit_date && (
                      <div>
                        <span className="text-gray-600">تاریخ واریز: </span>
                        <span className="font-medium">{interaction.deposit_date}</span>
                      </div>
                    )}
                    {interaction.deposit_stage && (
                      <div>
                        <span className="text-gray-600">مرحله: </span>
                        <span className="font-medium">{interaction.deposit_stage}</span>
                      </div>
                    )}
                    {interaction.website_model && (
                      <div>
                        <span className="text-gray-600">مدل سایت: </span>
                        <span className="font-medium">{interaction.website_model}</span>
                      </div>
                    )}
                    {interaction.website_designer && (
                      <div>
                        <span className="text-gray-600">طراح: </span>
                        <span className="font-medium">{interaction.website_designer}</span>
                      </div>
                    )}
                    {interaction.services && (
                      <div>
                        <span className="text-gray-600">خدمات: </span>
                        <span className="font-medium">{interaction.services}</span>
                      </div>
                    )}
                  </div>

                  {interaction.additional_notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600">{interaction.additional_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mr-4">
                  <button
                    onClick={() => {
                      setEditingInteraction(interaction);
                      setShowInteractionModal(true);
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('آیا از حذف این تعامل اطمینان دارید؟')) {
                        deleteInteractionMutation.mutate(interaction.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!interactions || interactions.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              تعاملی ثبت نشده است
            </div>
          )}
        </div>
      </div>

      {/* Interaction Modal */}
      {showInteractionModal && (
        <InteractionModal
          customerId={parseInt(id!)}
          interaction={editingInteraction}
          onClose={() => {
            setShowInteractionModal(false);
            setEditingInteraction(null);
          }}
        />
      )}
    </div>
  );
};

const InteractionModal = ({ customerId, interaction, onClose }: { customerId: number; interaction: any; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: interaction?.type || 'call',
    subject: interaction?.subject || '',
    description: interaction?.description || '',
    amount: interaction?.amount || '',
    deposit_date: interaction?.deposit_date || '',
    deposit_stage: interaction?.deposit_stage || '',
    website_model: interaction?.website_model || '',
    website_designer: interaction?.website_designer || '',
    services: interaction?.services || '',
    additional_notes: interaction?.additional_notes || '',
  });

  const mutation = useMutation(
    (data: any) => {
      if (interaction) {
        return api.put(`/interactions/${interaction.id}`, { ...data, customer_id: customerId });
      }
      return api.post('/interactions', { ...data, customer_id: customerId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['interactions', customerId]);
        toast.showSuccess('تعامل با موفقیت ذخیره شد');
        onClose();
      },
      onError: (error: any) => {
        console.error('Error saving interaction:', error);
        toast.showError(error.response?.data?.error || 'خطا در ذخیره تعامل');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting interaction form:', formData);
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {interaction ? 'ویرایش تعامل' : 'افزودن تعامل جدید'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">نوع تعامل *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
                required
              >
                <option value="call">تماس</option>
                <option value="email">ایمیل</option>
                <option value="meeting">جلسه</option>
                <option value="whatsapp">واتساپ</option>
                <option value="sms">پیامک</option>
                <option value="deposit">واریزی</option>
                <option value="service">خدمات</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">موضوع</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">توضیحات</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
              />
            </div>
            {formData.type === 'deposit' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">مبلغ (تومان)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">تاریخ واریزی</label>
                  <JalaliDatePicker
                    value={formData.deposit_date}
                    onChange={(value) => setFormData({ ...formData, deposit_date: value })}
                    placeholder="تاریخ واریزی را انتخاب کنید"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مرحله واریزی</label>
                  <input
                    type="text"
                    value={formData.deposit_stage}
                    onChange={(e) => setFormData({ ...formData, deposit_stage: e.target.value })}
                    className="input"
                    placeholder="مثلاً: پیش‌پرداخت، پرداخت نهایی"
                  />
                </div>
              </>
            )}
            {formData.type === 'service' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">مدل سایت</label>
                  <input
                    type="text"
                    value={formData.website_model}
                    onChange={(e) => setFormData({ ...formData, website_model: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">طراح سایت</label>
                  <input
                    type="text"
                    value={formData.website_designer}
                    onChange={(e) => setFormData({ ...formData, website_designer: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">خدمات</label>
                  <input
                    type="text"
                    value={formData.services}
                    onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                    className="input"
                    placeholder="مثلاً: طراحی سایت، سئو، بازاریابی"
                  />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">یادداشت‌های اضافی</label>
              <textarea
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                className="input"
                rows={3}
              />
            </div>
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

export default CustomerDetail;



