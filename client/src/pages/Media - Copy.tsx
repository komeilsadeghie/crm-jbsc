import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Calendar, FileText, Image, Video, CheckCircle, XCircle, Clock } from 'lucide-react';

const Media = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'briefs' | 'items' | 'calendar' | 'assets'>('briefs');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'brief' | 'item' | 'asset'>('brief');
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: briefs } = useQuery('media-briefs', async () => {
    const response = await api.get('/media/briefs');
    return response.data;
  });

  const { data: items } = useQuery('media-items', async () => {
    const response = await api.get('/media/items');
    return response.data;
  });

  const { data: calendar } = useQuery('media-calendar', async () => {
    const response = await api.get('/media/calendar');
    return response.data;
  });

  const { data: assets } = useQuery('media-assets', async () => {
    const response = await api.get('/media/assets');
    return response.data;
  });

  const tabs = [
    { id: 'briefs', label: 'بریف‌های محتوا', icon: FileText },
    { id: 'items', label: 'آیتم‌های محتوا', icon: Image },
    { id: 'calendar', label: 'تقویم انتشار', icon: Calendar },
    { id: 'assets', label: 'دارایی‌ها', icon: Video },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      approved: 'bg-green-100 text-green-700',
      in_production: 'bg-blue-100 text-blue-700',
      completed: 'bg-purple-100 text-purple-700',
      briefed: 'bg-yellow-100 text-yellow-700',
      producing: 'bg-blue-100 text-blue-700',
      review: 'bg-orange-100 text-orange-700',
      scheduled: 'bg-indigo-100 text-indigo-700',
      published: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">مدیریت محتوا و مدیا</h1>
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

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setModalType(tab.id === 'briefs' ? 'brief' : tab.id === 'assets' ? 'asset' : 'item');
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
        {activeTab === 'briefs' && (
          <BriefsList
            briefs={briefs}
            onEdit={(brief) => {
              setEditingItem(brief);
              setModalType('brief');
              setShowModal(true);
            }}
          />
        )}

        {activeTab === 'items' && (
          <ItemsList
            items={items}
            onEdit={(item) => {
              setEditingItem(item);
              setModalType('item');
              setShowModal(true);
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView calendar={calendar} />
        )}

        {activeTab === 'assets' && (
          <AssetsList
            assets={assets}
            onEdit={(asset) => {
              setEditingItem(asset);
              setModalType('asset');
              setShowModal(true);
            }}
          />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <MediaModal
          type={modalType}
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

const BriefsList = ({ briefs, onEdit }: any) => {
  return (
    <div className="space-y-4">
      {briefs?.map((brief: any) => (
        <div key={brief.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(brief.status)}`}>
                  {brief.status}
                </span>
                <span className="text-sm text-gray-600">
                  {brief.platform && `پلتفرم: ${brief.platform}`}
                </span>
              </div>
              {brief.objective && (
                <p className="font-medium mb-2">{brief.objective}</p>
              )}
              {brief.message && (
                <p className="text-gray-700 mb-2">{brief.message}</p>
              )}
              {brief.keywords && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {brief.keywords.split(',').map((keyword: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => onEdit(brief)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
            >
              ویرایش
            </button>
          </div>
        </div>
      ))}
      {(!briefs || briefs.length === 0) && (
        <div className="text-center py-12 text-gray-500">بریفی ثبت نشده است</div>
      )}
    </div>
  );
};

const ItemsList = ({ items, onEdit }: any) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={20} />;
      case 'image': return <Image size={20} />;
      default: return <FileText size={20} />;
    }
  };

  return (
    <div className="space-y-4">
      {items?.map((item: any) => (
        <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getTypeIcon(item.content_type)}
                <span className="font-medium">{item.title || item.content_type}</span>
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {item.platform && <div>پلتفرم: {item.platform}</div>}
                {item.publish_date && (
                  <div>تاریخ انتشار: {new Date(item.publish_date).toLocaleDateString('fa-IR')}</div>
                )}
                {item.links && (
                  <div>
                    <a href={item.links} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      مشاهده لینک
                    </a>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onEdit(item)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
            >
              ویرایش
            </button>
          </div>
        </div>
      ))}
      {(!items || items.length === 0) && (
        <div className="text-center py-12 text-gray-500">آیتمی ثبت نشده است</div>
      )}
    </div>
  );
};

const CalendarView = ({ calendar }: any) => {
  const groupedByDate = calendar?.reduce((acc: any, item: any) => {
    const date = item.publish_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, items]: [string, any]) => (
        <div key={date} className="border rounded-lg p-4">
          <h3 className="font-bold mb-3">{new Date(date).toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{item.content_title}</span>
                <span className={`px-2 py-1 rounded text-sm ${getStatusColor(item.content_status)}`}>
                  {item.content_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(groupedByDate).length === 0 && (
        <div className="text-center py-12 text-gray-500">رویدادی در تقویم ثبت نشده است</div>
      )}
    </div>
  );
};

const AssetsList = ({ assets, onEdit }: any) => {
  const getApprovalIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="text-green-600" size={20} />;
      case 'rejected': return <XCircle className="text-red-600" size={20} />;
      case 'revision_requested': return <Clock className="text-yellow-600" size={20} />;
      default: return <Clock className="text-gray-400" size={20} />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets?.map((asset: any) => (
        <div key={asset.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{asset.file_name}</span>
            {getApprovalIcon(asset.approval_status)}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>نوع: {asset.asset_type}</div>
            <div>نسخه: {asset.version}</div>
            {asset.file_size && (
              <div>حجم: {(asset.file_size / 1024 / 1024).toFixed(2)} MB</div>
            )}
            <div className={`mt-2 px-2 py-1 rounded text-xs inline-block ${getStatusColor(asset.approval_status)}`}>
              {asset.approval_status}
            </div>
          </div>
          <button
            onClick={() => onEdit(asset)}
            className="mt-2 text-sm text-primary-600 hover:underline"
          >
            مشاهده جزئیات
          </button>
        </div>
      ))}
      {(!assets || assets.length === 0) && (
        <div className="col-span-full text-center py-12 text-gray-500">دارایی‌ای ثبت نشده است</div>
      )}
    </div>
  );
};

const MediaModal = ({ type, item, onClose }: any) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(() => {
    if (type === 'brief') {
      return {
        deal_id: item?.deal_id || '',
        account_id: item?.account_id || '',
        objective: item?.objective || '',
        message: item?.message || '',
        persona: item?.persona || '',
        keywords: item?.keywords || '',
        cta: item?.cta || '',
        platform: item?.platform || '',
        status: item?.status || 'draft',
      };
    } else if (type === 'item') {
      return {
        brief_id: item?.brief_id || '',
        deal_id: item?.deal_id || '',
        content_type: item?.content_type || 'post',
        title: item?.title || '',
        status: item?.status || 'briefed',
        platform: item?.platform || '',
        publish_date: item?.publish_date || '',
        links: item?.links || '',
        notes: item?.notes || '',
      };
    } else {
      return {
        deal_id: item?.deal_id || '',
        brief_id: item?.brief_id || '',
        asset_type: item?.asset_type || 'image',
        file_name: item?.file_name || '',
        file_path: item?.file_path || '',
        approval_status: item?.approval_status || 'pending',
        notes: item?.notes || '',
      };
    }
  });

  const mutation = useMutation(
    (data: any) => {
      if (item) {
        if (type === 'brief') {
          return api.put(`/media/briefs/${item.id}`, data);
        } else if (type === 'item') {
          return api.put(`/media/items/${item.id}`, data);
        }
      } else {
        if (type === 'brief') {
          return api.post('/media/briefs', data);
        } else if (type === 'item') {
          return api.post('/media/items', data);
        } else {
          return api.post('/media/assets', data);
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('media-briefs');
        queryClient.invalidateQueries('media-items');
        queryClient.invalidateQueries('media-assets');
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
            {item ? 'ویرایش' : 'افزودن'} {type === 'brief' ? 'بریف' : type === 'item' ? 'آیتم' : 'دارایی'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'brief' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">هدف</label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">پیام</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">پرسونا</label>
                  <input
                    type="text"
                    value={formData.persona}
                    onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">پلتفرم</label>
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">کلمات کلیدی</label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="input"
                    placeholder="مثلاً: واردات، صادرات، تجارت"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CTA</label>
                  <input
                    type="text"
                    value={formData.cta}
                    onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </>
          )}

          {type === 'item' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نوع محتوا *</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="post">پست</option>
                    <option value="video">ویدیو</option>
                    <option value="reels">ریلز</option>
                    <option value="blog">بلاگ</option>
                    <option value="page">صفحه</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="briefed">بریف شده</option>
                    <option value="producing">در حال تولید</option>
                    <option value="review">در حال بررسی</option>
                    <option value="scheduled">زمان‌بندی شده</option>
                    <option value="published">منتشر شده</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">عنوان</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">پلتفرم</label>
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">تاریخ انتشار</label>
                  <input
                    type="date"
                    value={formData.publish_date}
                    onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">لینک</label>
                  <input
                    type="url"
                    value={formData.links}
                    onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">یادداشت‌ها</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
            </>
          )}

          {type === 'asset' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نوع دارایی *</label>
                  <select
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="logo">لوگو</option>
                    <option value="raw_video">ویدیو خام</option>
                    <option value="edited_video">ویدیو ادیت شده</option>
                    <option value="image">تصویر</option>
                    <option value="document">سند</option>
                    <option value="other">سایر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">نام فایل *</label>
                  <input
                    type="text"
                    value={formData.file_name}
                    onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">مسیر فایل *</label>
                  <input
                    type="text"
                    value={formData.file_path}
                    onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">وضعیت تایید</label>
                  <select
                    value={formData.approval_status}
                    onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                    className="input"
                  >
                    <option value="pending">در انتظار</option>
                    <option value="approved">تایید شده</option>
                    <option value="rejected">رد شده</option>
                    <option value="revision_requested">نیاز به بازبینی</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">یادداشت‌ها</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
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

export default Media;

