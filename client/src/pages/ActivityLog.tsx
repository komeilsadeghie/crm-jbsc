import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { Activity, Filter, Search, Calendar } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';

const ActivityLog = () => {
  const [filters, setFilters] = useState({
    user_id: '',
    entity_type: '',
    entity_id: '',
    action: '',
    start_date: '',
    end_date: '',
  });

  const { data: logs, isLoading } = useQuery(
    ['activity-log', filters],
    async () => {
      const params = new URLSearchParams();
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.entity_id) params.append('entity_id', filters.entity_id);
      if (filters.action) params.append('action', filters.action);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      const response = await api.get(`/activity-log?${params.toString()}`);
      return response.data || [];
    }
  );

  const { data: statistics } = useQuery(
    ['activity-log-statistics', filters.start_date, filters.end_date],
    async () => {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      const response = await api.get(`/activity-log/statistics?${params.toString()}`);
      return response.data || {};
    }
  );

  const { data: users } = useQuery('assignable-users', async () => {
    try {
      const response = await api.get('/users/assignable');
      return response.data || [];
    } catch {
      return [];
    }
  });

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'ایجاد',
      update: 'ویرایش',
      delete: 'حذف',
      send: 'ارسال',
      accept: 'قبول',
      decline: 'رد',
      assign: 'اختصاص',
      unassign: 'حذف اختصاص',
      follow: 'دنبال کردن',
      unfollow: 'لغو دنبال کردن',
      comment: 'نظر',
      upload_attachment: 'آپلود ضمیمه',
      delete_attachment: 'حذف ضمیمه',
      generate: 'تولید',
      refund: 'بازگشت وجه',
    };
    return labels[action] || action;
  };

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      invoice: 'فاکتور',
      estimate: 'پیش‌فاکتور',
      proposal: 'پروپوزال',
      task: 'تسک',
      contract: 'قرارداد',
      ticket: 'تیکت',
      account: 'حساب',
      contact: 'مخاطب',
      deal: 'معامله',
      project: 'پروژه',
      payment_gateway: 'درگاه پرداخت',
      payment_transaction: 'تراکنش پرداخت',
      recurring_invoice: 'فاکتور تکراری',
      survey: 'نظرسنجی',
    };
    return labels[entityType] || entityType;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-600">لاگ فعالیت‌ها</h1>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">آمار اقدامات</h3>
            <div className="space-y-1">
              {statistics.action_statistics?.slice(0, 5).map((stat: any) => (
                <div key={stat.action} className="flex justify-between text-sm">
                  <span>{getActionLabel(stat.action)}</span>
                  <span className="font-medium">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">آمار موجودیت‌ها</h3>
            <div className="space-y-1">
              {statistics.entity_statistics?.slice(0, 5).map((stat: any) => (
                <div key={stat.entity_type} className="flex justify-between text-sm">
                  <span>{getEntityLabel(stat.entity_type)}</span>
                  <span className="font-medium">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">فعال‌ترین کاربران</h3>
            <div className="space-y-1">
              {statistics.user_statistics?.slice(0, 5).map((stat: any) => (
                <div key={stat.user_id} className="flex justify-between text-sm">
                  <span>{stat.full_name || stat.username}</span>
                  <span className="font-medium">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card relative z-10 p-4 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">کاربر</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="input w-full"
            >
              <option value="">همه کاربران</option>
              {users?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نوع موجودیت</label>
            <select
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              className="input w-full"
            >
              <option value="">همه</option>
              <option value="invoice">فاکتور</option>
              <option value="estimate">پیش‌فاکتور</option>
              <option value="proposal">پروپوزال</option>
              <option value="task">تسک</option>
              <option value="contract">قرارداد</option>
              <option value="ticket">تیکت</option>
              <option value="account">حساب</option>
              <option value="contact">مخاطب</option>
              <option value="deal">معامله</option>
              <option value="project">پروژه</option>
              <option value="payment_gateway">درگاه پرداخت</option>
              <option value="payment_transaction">تراکنش پرداخت</option>
              <option value="recurring_invoice">فاکتور تکراری</option>
              <option value="survey">نظرسنجی</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اقدام</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="input w-full"
            >
              <option value="">همه</option>
              <option value="create">ایجاد</option>
              <option value="update">ویرایش</option>
              <option value="delete">حذف</option>
              <option value="send">ارسال</option>
              <option value="accept">قبول</option>
              <option value="decline">رد</option>
              <option value="assign">اختصاص</option>
              <option value="unassign">حذف اختصاص</option>
              <option value="follow">دنبال کردن</option>
              <option value="unfollow">لغو دنبال کردن</option>
              <option value="comment">نظر</option>
              <option value="upload_attachment">آپلود ضمیمه</option>
              <option value="delete_attachment">حذف ضمیمه</option>
              <option value="generate">تولید</option>
              <option value="refund">بازگشت وجه</option>
            </select>
          </div>
          <div>
            <label className="label">تاریخ شروع</label>
            <JalaliDatePicker
              value={filters.start_date}
              onChange={(value) => setFilters({ ...filters, start_date: value })}
              placeholder="تاریخ شروع را انتخاب کنید"
            />
          </div>
          <div>
            <label className="label">تاریخ پایان</label>
            <JalaliDatePicker
              value={filters.end_date}
              onChange={(value) => setFilters({ ...filters, end_date: value })}
              placeholder="تاریخ پایان را انتخاب کنید"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-right">کاربر</th>
              <th className="p-3 text-right">اقدام</th>
              <th className="p-3 text-right">موجودیت</th>
              <th className="p-3 text-right">توضیحات</th>
              <th className="p-3 text-right">IP</th>
              <th className="p-3 text-right">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">در حال بارگذاری...</td>
              </tr>
            ) : logs?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">لاگی یافت نشد</td>
              </tr>
            ) : (
              logs?.map((log: any) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{log.full_name || log.username || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {getEntityLabel(log.entity_type)}
                    </span>
                    {log.entity_id && <span className="mr-2 text-gray-600">#{log.entity_id}</span>}
                  </td>
                  <td className="p-3">{log.description || '-'}</td>
                  <td className="p-3 text-xs text-gray-500">{log.ip_address || '-'}</td>
                  <td className="p-3 text-sm">{toJalali(log.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLog;

