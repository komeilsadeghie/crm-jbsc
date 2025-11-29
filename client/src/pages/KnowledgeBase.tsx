import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, BookOpen, FileText } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';

const KnowledgeBase = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      return response.data || [];
    }
  );

  const createMutation = useMutation(
    (data: any) => api.post('/knowledge-base/articles', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-articles');
        setShowModal(false);
        setEditingArticle(null);
        alert('مقاله با موفقیت ایجاد شد');
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
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/knowledge-base/articles/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kb-articles');
        alert('مقاله با موفقیت حذف شد');
      },
    }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center glass-card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">پایگاه دانش</h1>
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
      </div>

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

      {showModal && (
        <ArticleModal
          article={editingArticle}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingArticle(null);
          }}
          onSave={(data) => {
            if (editingArticle) {
              updateMutation.mutate({ id: editingArticle.id, data });
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

const ArticleModal = ({ article, categories, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    category_id: article?.category_id || '',
    title: article?.title || '',
    content: article?.content || '',
    tags: article?.tags || '',
    is_published: article?.is_published !== undefined ? article.is_published : true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      is_published: formData.is_published ? 1 : 0,
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
                className="w-full px-4 py-2 border rounded-lg"
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
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">محتوای مقاله *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">برچسب‌ها</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="مثلاً: سئو، طراحی، توسعه"
            />
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

