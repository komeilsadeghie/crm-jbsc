import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, MessageSquare, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';
import { toPersianNumber } from '../utils/numberHelper';
import { translateTicketStatus, translatePriority } from '../utils/translations';
import { useToast } from '../contexts/ToastContext';

const Tickets = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: tickets } = useQuery(
    ['tickets', filterStatus],
    async () => {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const response = await api.get(`/tickets${params}`);
      return response.data || [];
    }
  );

  const { data: departments, isLoading: departmentsLoading } = useQuery('ticket-departments', async () => {
    try {
      const response = await api.get('/tickets/departments');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }, {
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const createMutation = useMutation(
    (data: any) => api.post('/tickets', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tickets');
        setShowModal(false);
        toast.showSuccess('تیکت با موفقیت ایجاد شد');
      },
    }
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="text-info-600" size={20} />;
      case 'in_progress':
        return <Clock className="text-warning-600" size={20} />;
      case 'resolved':
        return <CheckCircle className="text-success-600" size={20} />;
      case 'closed':
        return <XCircle className="text-neutral-600" size={20} />;
      default:
        return <AlertCircle size={20} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'badge badge-neutral',
      medium: 'badge badge-warning',
      high: 'badge badge-warning',
      urgent: 'badge badge-danger',
    };
    return colors[priority] || 'badge badge-neutral';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-info-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">تیکت‌های پشتیبانی</h1>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="open">باز</option>
            <option value="in_progress">در حال انجام</option>
            <option value="resolved">حل شده</option>
            <option value="closed">بسته</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            تیکت جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets?.map((ticket: any) => (
          <div
            key={ticket.id}
            data-ticket-id={ticket.id}
            onClick={() => setSelectedTicket(ticket)}
            className="card-hover cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(ticket.status)}
                <span className="font-medium text-center">{toPersianNumber(ticket.ticket_number)}</span>
              </div>
              <span className={getPriorityColor(ticket.priority)}>
                {translatePriority(ticket.priority)}
              </span>
            </div>
            <h3 className="font-bold mb-2 text-neutral-800">{ticket.subject}</h3>
            {ticket.account_name && (
              <p className="text-sm text-neutral-600 mb-2">{ticket.account_name}</p>
            )}
            {ticket.department_name && (
              <p className="text-xs text-neutral-500 mb-2">دپارتمان: {ticket.department_name}</p>
            )}
            <div className="text-xs text-neutral-500">
              {toJalali(ticket.created_at)}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <TicketModal
          departments={departments || []}
          departmentsLoading={departmentsLoading}
          onClose={() => setShowModal(false)}
          onSave={(data: any) => createMutation.mutate(data)}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
      </div>
    </div>
  );
};

const TicketModal = ({ departments, departmentsLoading, onClose, onSave }: any) => {
  const { data: accounts, isLoading: accountsLoading } = useQuery('accounts', async () => {
    try {
      const response = await api.get('/accounts');
      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
  });

  const [formData, setFormData] = useState({
    account_id: '',
    department_id: '',
    subject: '',
    priority: 'medium',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      account_id: formData.account_id ? parseInt(formData.account_id) : null,
      department_id: formData.department_id ? parseInt(formData.department_id) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-neutral-800">تیکت جدید</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">موضوع</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">مشتری</label>
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب مشتری</option>
                {accountsLoading ? (
                  <option disabled>در حال بارگذاری...</option>
                ) : accounts && accounts.length > 0 ? (
                  accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.name || acc.company_name || `حساب #${acc.id}`}</option>
                  ))
                ) : (
                  <option disabled>مشتری‌ای یافت نشد</option>
                )}
              </select>
            </div>
            <div>
              <label className="label label-required">دپارتمان</label>
              <select
                required
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب دپارتمان</option>
                {departmentsLoading ? (
                  <option disabled>در حال بارگذاری...</option>
                ) : departments && departments.length > 0 ? (
                  departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))
                ) : (
                  <option disabled>دپارتمانی یافت نشد</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">اولویت</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input"
              >
                <option value="low">{translatePriority('low')}</option>
                <option value="medium">{translatePriority('medium')}</option>
                <option value="high">{translatePriority('high')}</option>
                <option value="urgent">{translatePriority('urgent')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary">
              ایجاد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TicketDetailModal = ({ ticket, onClose }: any) => {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticketDetail } = useQuery(
    ['ticket-detail', ticket.id],
    async () => {
      const response = await api.get(`/tickets/${ticket.id}`);
      return response.data;
    },
    { enabled: !!ticket }
  );

  const { data: cannedReplies } = useQuery(
    ['canned-replies', ticketDetail?.department_id],
    async () => {
      const params = ticketDetail?.department_id ? `?department_id=${ticketDetail.department_id}` : '';
      const response = await api.get(`/tickets/canned-replies/list${params}`);
      return response.data || [];
    },
    { enabled: !!ticketDetail }
  );

  const replyMutation = useMutation(
    (data: any) => api.post(`/tickets/${ticket.id}/replies`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ticket-detail', ticket.id]);
        setReplyText('');
        toast.showSuccess('پاسخ با موفقیت ارسال شد');
      },
    }
  );

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    replyMutation.mutate({
      message: replyText,
      is_internal: isInternal,
    });
  };

  const insertCannedReply = (content: string) => {
    setReplyText(content);
  };

  if (!ticketDetail) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-800">{ticketDetail.subject}</h2>
            <p className="text-sm text-neutral-600 mt-1">شماره: {ticketDetail.ticket_number}</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 transition-colors">
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-neutral-700">وضعیت:</span> <span className="text-neutral-600">{translateTicketStatus(ticketDetail.status)}</span>
            </div>
            <div>
              <span className="font-medium text-neutral-700">اولویت:</span> <span className="text-neutral-600">{translatePriority(ticketDetail.priority)}</span>
            </div>
            <div>
              <span className="font-medium text-neutral-700">دپارتمان:</span> <span className="text-neutral-600">{ticketDetail.department_name || '-'}</span>
            </div>
            <div>
              <span className="font-medium text-neutral-700">تاریخ:</span> <span className="text-neutral-600">{toJalali(ticketDetail.created_at)}</span>
            </div>
          </div>
        </div>

        {cannedReplies && cannedReplies.length > 0 && (
          <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
            <h3 className="font-bold mb-2 text-neutral-800">پاسخ‌های آماده:</h3>
            <div className="flex flex-wrap gap-2">
              {cannedReplies.map((reply: any) => (
                <button
                  key={reply.id}
                  onClick={() => insertCannedReply(reply.content)}
                  className="px-3 py-1 bg-white border border-neutral-300 rounded text-sm hover:bg-neutral-50 transition-colors"
                >
                  {reply.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <h3 className="font-bold text-neutral-800 dark:text-neutral-200">مکالمات:</h3>
          {ticketDetail.replies?.map((reply: any) => {
            const isAdmin = reply.user_role === 'admin';
            const isInternal = reply.is_internal;
            return (
              <div
                key={reply.id}
                className={`p-4 rounded-lg border-r-4 ${
                  isInternal 
                    ? 'bg-warning-50 dark:bg-warning-900/20 border-warning-400 dark:border-warning-600' 
                    : isAdmin
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <span className="text-primary-600 dark:text-primary-400" title="ادمین">
                        👑
                      </span>
                    )}
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {reply.user_full_name || reply.contact_name || 'نامشخص'}
                    </span>
                    {isInternal && (
                      <span className="text-xs px-2 py-0.5 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 rounded">
                        یادداشت داخلی
                      </span>
                    )}
                    {isAdmin && !isInternal && (
                      <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
                        ادمین
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{toJalali(reply.created_at)}</span>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{reply.message}</p>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleReply} className="border-t pt-4">
          <div className="mb-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">یادداشت داخلی</span>
            </label>
          </div>
          <textarea
            required
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="input mb-4"
            rows={4}
            placeholder="پاسخ خود را بنویسید..."
          />
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={replyMutation.isLoading}>
              {replyMutation.isLoading ? 'در حال ارسال...' : 'ارسال پاسخ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Tickets;

