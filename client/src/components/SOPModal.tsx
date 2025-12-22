import { useState } from 'react';
import { File, X, Upload } from 'lucide-react';

interface SOPModalProps {
  sop: any;
  users: any[];
  articles?: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const SOPModal = ({ sop, users, articles = [], onClose, onSave }: SOPModalProps) => {
  const [formData, setFormData] = useState({
    title: sop?.title || '',
    description: sop?.description || '',
    department: sop?.department || '',
    unit: sop?.unit || '',
    person_id: sop?.person_id || '',
    content: sop?.content || '',
    tags: sop?.tags || '',
    is_published: sop?.is_published || false,
    attachments: sop?.attachments || [],
    article_id: sop?.article_id || null,
  });

  const [newAttachment, setNewAttachment] = useState({
    name: '',
    type: 'file',
    url: '',
  });

  const handleAddAttachment = () => {
    if (newAttachment.name && newAttachment.url) {
      setFormData({
        ...formData,
        attachments: [...formData.attachments, newAttachment],
      });
      setNewAttachment({ name: '', type: 'file', url: '' });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_: any, i: number) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      person_id: formData.person_id ? parseInt(formData.person_id) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-neumorphic">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">{sop ? 'ویرایش SOP' : 'ایجاد SOP جدید'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">عنوان *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">بخش</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="input"
                placeholder="مثلاً: فنی، فروش، مالی"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">واحد</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input"
                placeholder="مثلاً: پشتیبانی، توسعه"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">شخص</label>
              <select
                value={formData.person_id}
                onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب شخص</option>
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.username || user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">مقاله مرتبط (اختیاری)</label>
              <select
                value={formData.article_id || ''}
                onChange={(e) => setFormData({ ...formData, article_id: e.target.value ? parseInt(e.target.value) : null })}
                className="input"
              >
                <option value="">بدون مقاله مرتبط</option>
                {articles?.map((article: any) => (
                  <option key={article.id} value={article.id}>
                    {article.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">محتوای SOP *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input"
              rows={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">تگ‌ها</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="input"
              placeholder="مثلاً: SOP، رویه، آموزش"
            />
          </div>

          {/* Attachments */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">پیوست‌ها (فایل، صدا، ویدیو)</label>
            
            {/* Add new attachment */}
            <div className="bg-gray-50 p-4 rounded-lg mb-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="نام فایل"
                  value={newAttachment.name}
                  onChange={(e) => setNewAttachment({ ...newAttachment, name: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
                <select
                  value={newAttachment.type}
                  onChange={(e) => setNewAttachment({ ...newAttachment, type: e.target.value })}
                  className="px-3 py-2 border rounded"
                >
                  <option value="file">فایل</option>
                  <option value="audio">صدا</option>
                  <option value="video">ویدیو</option>
                </select>
                <input
                  type="text"
                  placeholder="URL یا مسیر فایل"
                  value={newAttachment.url}
                  onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                  className="px-3 py-2 border rounded"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAttachment}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <Upload size={16} />
                افزودن پیوست
              </button>
            </div>

            {/* Existing attachments */}
            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                {formData.attachments.map((att: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <File size={18} className="text-gray-500 dark:text-neutral-400" />
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">{att.name}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-neutral-700 rounded text-neutral-700 dark:text-neutral-300">
                        {att.type === 'video' ? 'ویدیو' : att.type === 'audio' ? 'صدا' : 'فایل'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm">منتشر شده</label>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
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

export default SOPModal;









