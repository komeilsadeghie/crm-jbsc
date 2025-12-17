import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Users, Clock, BarChart3, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { toJalali, toJalaliFull } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';

const VoipMonitoring = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [callType, setCallType] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Fetch VOIP configuration
  const { data: config } = useQuery('voip-config', async () => {
    try {
      const response = await api.get('/voip/config');
      return response.data;
    } catch {
      return null;
    }
  });

  // Fetch call logs
  const { data: callLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery(
    ['voip-logs', dateFrom, dateTo, selectedUser, callType],
    async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (selectedUser) params.append('user', selectedUser);
      if (callType !== 'all') params.append('type', callType);
      
      const response = await api.get(`/voip/logs?${params.toString()}`);
      return response.data?.logs || [];
    },
    {
      enabled: !!config?.connected,
      refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    }
  );

  // Fetch call statistics
  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useQuery(
    ['voip-statistics', dateFrom, dateTo],
    async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const response = await api.get(`/voip/statistics?${params.toString()}`);
      return response.data || {};
    },
    {
      enabled: !!config?.connected,
      refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    }
  );

  // Fetch users
  const { data: users } = useQuery('assignable-users', async () => {
    try {
      const response = await api.get('/users/assignable');
      return response.data || [];
    } catch {
      return [];
    }
  });

  // Fetch real-time monitoring
  const { data: realTimeData } = useQuery(
    'voip-realtime',
    async () => {
      const response = await api.get('/voip/realtime');
      return response.data || { activeCalls: [], channels: [] };
    },
    {
      enabled: !!config?.connected && autoRefresh,
      refetchInterval: 5000, // Refresh every 5 seconds for real-time
    }
  );

  const getCallTypeIcon = (type: string) => {
    return type === 'incoming' ? <PhoneIncoming size={16} /> : <PhoneOutgoing size={16} />;
  };

  const getCallTypeColor = (type: string) => {
    return type === 'incoming' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-blue-600 dark:text-blue-400';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center glass-card">
          <div className="flex items-center gap-3">
            <PhoneCall className="text-primary-600" size={32} />
            <div>
              <h1 className="page-heading-gradient">مانیتورینگ VOIP</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                مانیتورینگ تماس‌های ورودی و خروجی از طریق AGI Isabel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.connected ? (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                متصل
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                غیرفعال
              </span>
            )}
            <button
              onClick={() => {
                refetchLogs();
                refetchStats();
              }}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={18} />
              به‌روزرسانی
            </button>
          </div>
        </div>

        {/* Configuration Alert */}
        {!config?.connected && (
          <div className="glass-card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  اتصال به AGI Isabel تنظیم نشده است
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  برای استفاده از مانیتورینگ VOIP، لطفاً تنظیمات اتصال به AGI Isabel را در بخش تنظیمات پیکربندی کنید.
                </p>
                <button
                  onClick={() => window.location.href = '/settings'}
                  className="mt-3 btn btn-primary text-sm"
                >
                  <Settings size={16} className="ml-2" />
                  رفتن به تنظیمات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {config?.connected && statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">کل تماس‌ها</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {toPersianNumber(statistics.totalCalls || 0)}
                  </p>
                </div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <PhoneCall className="text-primary-600 dark:text-primary-400" size={24} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">تماس‌های ورودی</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {toPersianNumber(statistics.incomingCalls || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <PhoneIncoming className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">تماس‌های خروجی</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {toPersianNumber(statistics.outgoingCalls || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <PhoneOutgoing className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">میانگین مدت تماس</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                    {statistics.avgDuration ? formatDuration(statistics.avgDuration) : '0:00'}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Clock className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Active Calls */}
        {config?.connected && realTimeData?.activeCalls && realTimeData.activeCalls.length > 0 && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PhoneCall size={20} />
              تماس‌های فعال (زنده)
            </h2>
            <div className="space-y-2">
              {realTimeData.activeCalls.map((call: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium">{call.from} → {call.to}</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {call.user || 'نامشخص'} • مدت: {formatDuration(call.duration || 0)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCallTypeColor(call.type)}`}>
                    {call.type === 'incoming' ? 'ورودی' : 'خروجی'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">از تاریخ</label>
              <JalaliDatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تا تاریخ</label>
              <JalaliDatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">کاربر</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input"
              >
                <option value="">همه کاربران</option>
                {users?.filter((user: any) => user.voip_extension).map((user: any) => (
                  <option key={user.id} value={user.voip_extension}>
                    {user.full_name || user.username} ({user.voip_extension})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع تماس</label>
              <select
                value={callType}
                onChange={(e) => setCallType(e.target.value as any)}
                className="input"
              >
                <option value="all">همه</option>
                <option value="incoming">ورودی</option>
                <option value="outgoing">خروجی</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">به‌روزرسانی خودکار</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">فعال</span>
                {autoRefresh && (
                  <input
                    type="number"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                    className="input w-20 text-sm"
                    min="5"
                    max="300"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Statistics */}
        {config?.connected && statistics?.userStats && statistics.userStats.length > 0 && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users size={20} />
              آمار تماس هر کاربر
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-right p-3 text-sm font-medium">کاربر</th>
                    <th className="text-right p-3 text-sm font-medium">کل تماس‌ها</th>
                    <th className="text-right p-3 text-sm font-medium">ورودی</th>
                    <th className="text-right p-3 text-sm font-medium">خروجی</th>
                    <th className="text-right p-3 text-sm font-medium">مدت کل</th>
                    <th className="text-right p-3 text-sm font-medium">میانگین مدت</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.userStats.map((stat: any, index: number) => (
                    <tr key={index} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="p-3 font-medium">{stat.userName || 'نامشخص'}</td>
                      <td className="p-3">{toPersianNumber(stat.totalCalls || 0)}</td>
                      <td className="p-3 text-green-600 dark:text-green-400">{toPersianNumber(stat.incoming || 0)}</td>
                      <td className="p-3 text-blue-600 dark:text-blue-400">{toPersianNumber(stat.outgoing || 0)}</td>
                      <td className="p-3">{formatDuration(stat.totalDuration || 0)}</td>
                      <td className="p-3">{formatDuration(stat.avgDuration || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Call Logs */}
        {config?.connected && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              لاگ تماس‌ها
            </h2>
            {logsLoading ? (
              <div className="text-center py-12">در حال بارگذاری...</div>
            ) : callLogs && callLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="text-right p-3 text-sm font-medium">تاریخ و زمان</th>
                      <th className="text-right p-3 text-sm font-medium">از</th>
                      <th className="text-right p-3 text-sm font-medium">به</th>
                      <th className="text-right p-3 text-sm font-medium">کاربر</th>
                      <th className="text-right p-3 text-sm font-medium">شماره داخلی</th>
                      <th className="text-right p-3 text-sm font-medium">نوع</th>
                      <th className="text-right p-3 text-sm font-medium">مدت</th>
                      <th className="text-right p-3 text-sm font-medium">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callLogs.map((log: any, index: number) => (
                      <tr key={index} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="p-3 text-sm">
                          {log.date ? toJalaliFull(log.date) : '-'}
                        </td>
                        <td className="p-3 font-medium">{log.from || '-'}</td>
                        <td className="p-3 font-medium">{log.to || '-'}</td>
                        <td className="p-3">{log.userName || '-'}</td>
                        <td className="p-3">
                          {log.userExtension ? (
                            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs font-medium">
                              {log.userExtension}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className={`p-3 flex items-center gap-2 ${getCallTypeColor(log.type)}`}>
                          {getCallTypeIcon(log.type)}
                          <span>{log.type === 'incoming' ? 'ورودی' : 'خروجی'}</span>
                        </td>
                        <td className="p-3">{formatDuration(log.duration || 0)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.status === 'ANSWERED' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : log.status === 'NO ANSWER'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {log.status === 'ANSWERED' ? 'پاسخ داده شده' : 
                             log.status === 'NO ANSWER' ? 'بدون پاسخ' : 
                             log.status === 'BUSY' ? 'مشغول' : 
                             log.status || 'نامشخص'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                هیچ لاگ تماسی یافت نشد
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoipMonitoring;

