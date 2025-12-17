import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Edit, Trash2, Mail, Send } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';

const EmailTemplates = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showSendModal, setShowSendModal] = useState<any>(null);

  const { data: templates } = useQuery('email-templates', async () => {
    const response = await api.get('/email-templates');
    return response.data || [];
  });

  const createMutation = useMutation(
    (data: any) => api.post('/email-templates', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('email-templates');
        setShowModal(false);
        setEditingTemplate(null);
        alert('قالب با موفقیت ایجاد شد');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/email-templates/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('email-templates');
        setShowModal(false);
        setEditingTemplate(null);
        alert('قالب با موفقیت به‌روزرسانی شد');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/email-templates/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('email-templates');
        alert('قالب با موفقیت حذف شد');
      },
    }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center glass-card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">قالب‌های ایمیل</h1>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          قالب جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((template: any) => (
          <div key={template.id} className="glass-card hover:shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Mail className="text-primary-600" size={24} />
                <h3 className="font-bold">{template.name}</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                template.is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {template.is_active === 1 ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.subject}</p>
            <div className="text-xs text-gray-500 mb-3">
              {toJalali(template.created_at)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSendModal(template);
                }}
                className="flex-1 btn btn-secondary text-sm flex items-center justify-center gap-1"
              >
                <Send size={16} />
                ارسال
              </button>
              <button
                onClick={() => {
                  setEditingTemplate(template);
                  setShowModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 p-2"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => {
                  if (confirm('آیا مطمئن هستید؟')) {
                    deleteMutation.mutate(template.id);
                  }
                }}
                className="text-red-600 hover:text-red-700 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={(data) => {
            if (editingTemplate) {
              updateMutation.mutate({ id: editingTemplate.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}

      {showSendModal && (
        <SendEmailModal
          template={showSendModal}
          onClose={() => setShowSendModal(null)}
        />
      )}
      </div>
    </div>
  );
};

const TemplateModal = ({ template, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    template_type: template?.template_type || 'custom',
    is_active: template?.is_active !== undefined ? template.is_active === 1 : true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      is_active: formData.is_active ? 1 : 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">{template ? 'ویرایش' : 'ایجاد'} قالب ایمیل</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">نام قالب *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع</label>
              <select
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                className="input"
              >
                <option value="custom">سفارشی</option>
                <option value="invoice">فاکتور</option>
                <option value="estimate">پیش‌فاکتور</option>
                <option value="ticket">تیکت</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">موضوع *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input"
              placeholder="مثلاً: {{customer_name}} - فاکتور شما آماده است"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">متن ایمیل *</label>
            <textarea
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="input"
              rows={10}
              placeholder="استفاده از {{field_name}} برای merge fields"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm">فعال</label>
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

const SendEmailModal = ({ template, onClose }: any) => {
  const [recipient, setRecipient] = useState('');
  const [mergeData, setMergeData] = useState('{}');

  const sendMutation = useMutation(
    (data: any) => api.post(`/email-templates/${template.id}/send`, data),
    {
      onSuccess: () => {
        alert('ایمیل آماده ارسال است');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const merge = JSON.parse(mergeData);
      sendMutation.mutate({ recipient, merge_data: merge });
    } catch (error) {
      alert('فرمت JSON نامعتبر است');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold mb-4">ارسال ایمیل: {template.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ایمیل گیرنده *</label>
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Merge Fields (JSON)</label>
            <textarea
              value={mergeData}
              onChange={(e) => setMergeData(e.target.value)}
              className="input font-mono text-sm"
              rows={5}
              placeholder='{"customer_name": "علی احمدی", "invoice_number": "INV-001"}'
            />
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={sendMutation.isLoading}>
              {sendMutation.isLoading ? 'در حال ارسال...' : 'ارسال'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailTemplates;

