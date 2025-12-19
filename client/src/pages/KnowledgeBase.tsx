import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, BookOpen, FileText, FileVideo, FileAudio, File, Settings } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { useAuth } from '../contexts/AuthContext';
import SOPModal from '../components/SOPModal';

const KnowledgeBase = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'articles' | 'sops'>('articles');
  const [showSOPModal, setShowSOPModal] = useState(false);
  const [editingSOP, setEditingSOP] = useState<any>(null);

  const { data: categories } = useQuery('kb-categories', async () => {
    const response = await api.get('/knowledge-base/categories');
    return response.data || [];
  });

  const { data: articles } = useQuery(
    ['kb-articles', selectedCategory, searchTerm],
    async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory.toString());
      if (searchTerm) params.append('search', searchTerm);
      const response = await api.get(`/knowledge-base/articles?${params.toString()}`);
      const data = response.data || [];
      // Parse attachments if they exist
      return data.map((article: any) => {
        if (article.attachments) {
          try {
            article.attachments = JSON.parse(article.attachments);
          } catch {
            article.attachments = [];
          }
        }
        return article;
      });
    }
  );

  const { data: sops } = useQuery(
    ['kb-sops'],
    async () => {
      const response = await api.get('/knowledge-base/sops');
      return response.data || [];
    },
    {
      enabled: activeTab === 'sops',
    }
  );

  const { data: users } = useQuery('assignable-users', async () => {
    try {
      const response = await api.get('/users/assignable');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  });

  const createMutation = useMutation(
    (data: any) => api.post('/knowledge-base/articles', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-articles');
        setShowModal(false);
        setEditingArticle(null);
        alert('مقاله با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/knowledge-base/articles/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-articles');
        setShowModal(false);
        setEditingArticle(null);
        alert('مقاله با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/knowledge-base/articles/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-articles');
        alert('مقاله با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  // SOP mutations
  const createSOPMutation = useMutation(
    (data: any) => api.post('/knowledge-base/sops', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-sops');
        setShowSOPModal(false);
        setEditingSOP(null);
        alert('SOP با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateSOPMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/knowledge-base/sops/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-sops');
        setShowSOPModal(false);
        setEditingSOP(null);
        alert('SOP با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteSOPMutation = useMutation(
    (id: number) => api.delete(`/knowledge-base/sops/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-sops');
        alert('SOP با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 glass-card p-3 sm:p-4">
          <h1 className="page-heading-gradient text-xl sm:text-2xl md:text-3xl">پایگاه دانش</h1>
        <div className="flex gap-2">
          {isAdmin && activeTab === 'articles' && (
            <button
              onClick={() => {
                setEditingArticle(null);
                setShowModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              مقاله جدید
            </button>
          )}
          {isAdmin && activeTab === 'sops' && (
            <button
              onClick={() => {
                setEditingSOP(null);
                setShowSOPModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              SOP جدید
            </button>
          )}
        </div>
        </div>

        {/* Tabs */}
        <div className="glass-card">
          <div className="flex gap-4 border-b">
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'articles'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              مقالات
            </button>
            <button
              onClick={() => setActiveTab('sops')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'sops'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              SOP (رویه‌های استاندارد)
            </button>
          </div>
        </div>

        {activeTab === 'articles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="glass-card">
            <h2 className="font-bold mb-4">دسته‌بندی‌ها</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-right p-2 rounded ${
                  selectedCategory === null ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                }`}
              >
                همه مقالات
              </button>
              {categories?.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-right p-2 rounded ${
                    selectedCategory === cat.id ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Articles List */}
          <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="جستجو در مقالات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10 w-full"
            />
          </div>

          <div className="space-y-3">
            {articles?.map((article: any) => (
              <div
                key={article.id}
                className="glass-card hover:shadow-xl cursor-pointer"
                onClick={() => {
                  setEditingArticle(article);
                  setShowModal(true);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-primary-600" size={20} />
                      <h3 className="font-bold text-lg">{article.title}</h3>
                    </div>
                    {article.category_name && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 mb-2 inline-block">
                        {article.category_name}
                      </span>
                    )}
                    {article.content && (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {article.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {toJalali(article.created_at)}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingArticle(article);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('آیا مطمئن هستید؟')) {
                            deleteMutation.mutate(article.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!articles || articles.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                مقاله‌ای یافت نشد
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {activeTab === 'sops' && (
        <div className="space-y-4">
          {sops?.map((sop: any) => (
            <div
              key={sop.id}
              className="glass-card hover:shadow-xl cursor-pointer"
              onClick={() => {
                if (isAdmin) {
                  setEditingSOP(sop);
                  setShowSOPModal(true);
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <FileText className="text-primary-600" size={20} />
                    <h3 className="font-bold text-lg">{sop.title}</h3>
                    {sop.department && (
                      <span className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-700">
                        بخش: {sop.department}
                      </span>
                    )}
                    {sop.unit && (
                      <span className="text-xs px-2 py-1 bg-green-100 rounded text-green-700">
                        واحد: {sop.unit}
                      </span>
                    )}
                    {sop.person_name && (
                      <span className="text-xs px-2 py-1 bg-purple-100 rounded text-purple-700">
                        شخص: {sop.person_name}
                      </span>
                    )}
                  </div>
                  {sop.description && (
                    <p className="text-gray-600 text-sm mb-2">{sop.description}</p>
                  )}
                  {sop.content && (
                    <p className="text-gray-700 text-sm line-clamp-2 mb-2">
                      {sop.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                  )}
                  {sop.attachments && Array.isArray(sop.attachments) && sop.attachments.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {sop.attachments.map((att: any, idx: number) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 rounded flex items-center gap-1">
                          {att.type === 'video' ? <FileVideo size={14} /> :
                           att.type === 'audio' ? <FileAudio size={14} /> :
                           <File size={14} />}
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {toJalali(sop.created_at)}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSOP(sop);
                        setShowSOPModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('آیا مطمئن هستید؟')) {
                          deleteSOPMutation.mutate(sop.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!sops || sops.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              SOPای ثبت نشده است
            </div>
          )}
        </div>
        )}

        {showModal && (
        <ArticleModal
          article={editingArticle}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingArticle(null);
          }}
          onSave={(data: any) => {
            if (editingArticle) {
              updateMutation.mutate({ id: editingArticle.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}

        {showSOPModal && isAdmin && (
          <SOPModal
            sop={editingSOP}
            users={users || []}
            onClose={() => {
              setShowSOPModal(false);
              setEditingSOP(null);
            }}
            onSave={(data: any) => {
              if (editingSOP) {
                updateSOPMutation.mutate({ id: editingSOP.id, data });
              } else {
                createSOPMutation.mutate(data);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

const ArticleModal = ({ article, categories, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    category_id: article?.category_id || '',
    title: article?.title || '',
    content: article?.content || '',
    tags: article?.tags || '',
    is_published: article?.is_published !== undefined ? article.is_published : true,
    attachments: article?.attachments || [],
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
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      is_published: formData.is_published ? 1 : 0,
      attachments: formData.attachments,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">{article ? 'ویرایش' : 'ایجاد'} مقاله</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">دسته‌بندی</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب دسته</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm">منتشر شده</label>
            </div>
          </div>
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
            <label className="block text-sm font-medium mb-1">محتوای مقاله *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input"
              rows={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">برچسب‌ها</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="input"
              placeholder="مثلاً: سئو، طراحی، توسعه"
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
                <File size={16} />
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
                      <File size={18} className="text-gray-500" />
                      <span className="text-sm">{att.name}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {att.type === 'video' ? 'ویدیو' : att.type === 'audio' ? 'صدا' : 'فایل'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
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

export default KnowledgeBase;

