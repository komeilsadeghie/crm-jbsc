import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckSquare, Clock, X, Ticket } from 'lucide-react';
import api from '../services/api';
import { toJalali } from '../utils/dateHelper';
import { translateTaskStatus } from '../utils/translations';

const Header = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTicketNotifications, setShowTicketNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ticketDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pending and in-progress tasks (exclude done and review)
  const { data: tasks, refetch } = useQuery(
    'pending-tasks',
    async () => {
      try {
        const response = await api.get('/tasks');
        const allTasks = response.data || [];
        // Filter tasks that are pending (todo) or in progress
        // Exclude done and review statuses
        const filtered = allTasks.filter((task: any) => 
          task.status === 'todo' || task.status === 'in_progress'
        );
        console.log('Filtered pending tasks:', filtered.length, 'out of', allTasks.length);
        return filtered;
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  // Listen for task updates and refetch notifications
  useEffect(() => {
    const handleTaskUpdate = () => {
      queryClient.invalidateQueries('pending-tasks');
    };

    // Listen for custom event when tasks are updated
    window.addEventListener('task-updated', handleTaskUpdate);
    
    return () => {
      window.removeEventListener('task-updated', handleTaskUpdate);
    };
  }, [queryClient]);

  const pendingTasks = tasks || [];
  const notificationCount = pendingTasks.length;

  // Fetch pending tickets (open or in_progress)
  const { data: tickets, refetch: refetchTickets } = useQuery(
    'pending-tickets',
    async () => {
      try {
        const response = await api.get('/tickets');
        const allTickets = response.data || [];
        // Filter tickets that are open or in_progress
        const filtered = allTickets.filter((ticket: any) => 
          ticket.status === 'open' || ticket.status === 'in_progress'
        );
        console.log('Filtered pending tickets:', filtered.length, 'out of', allTickets.length);
        return filtered;
      } catch (error) {
        console.error('Error fetching tickets:', error);
        return [];
      }
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  const pendingTickets = tickets || [];
  const ticketNotificationCount = pendingTickets.length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (ticketDropdownRef.current && !ticketDropdownRef.current.contains(event.target as Node)) {
        setShowTicketNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTaskClick = (taskId: number) => {
    setShowNotifications(false);
    navigate(`/tasks`);
    // Scroll to task after navigation (optional)
    setTimeout(() => {
      const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleTicketClick = (ticketId: number) => {
    setShowTicketNotifications(false);
    navigate(`/tickets`);
    // Scroll to ticket after navigation (optional)
    setTimeout(() => {
      const ticketElement = document.querySelector(`[data-ticket-id="${ticketId}"]`);
      if (ticketElement) {
        ticketElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <CheckSquare size={16} className="text-neutral-600" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-600" />;
      default:
        return <CheckSquare size={16} className="text-neutral-600" />;
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:right-64 h-16 bg-white shadow-medium border-b border-neutral-200 z-40" dir="rtl">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left side - can be used for breadcrumbs or title */}
        <div className="flex-1"></div>

        {/* Right side - Notifications */}
        <div className="flex items-center gap-4">
          {/* Tickets Notifications */}
          <div className="relative" ref={ticketDropdownRef}>
            <button
              onClick={() => {
                setShowTicketNotifications(!showTicketNotifications);
                refetchTickets();
              }}
              className={`relative p-2 rounded-lg transition-colors ${
                showTicketNotifications 
                  ? 'bg-info-50 text-info-600' 
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-info-600'
              }`}
              aria-label="اعلان‌های تیکت"
            >
              <Ticket size={22} />
              {ticketNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-info-500 to-info-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md ring-2 ring-white">
                  {ticketNotificationCount > 9 ? '9+' : ticketNotificationCount}
                </span>
              )}
            </button>

            {/* Tickets Dropdown */}
            {showTicketNotifications && (
              <div className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] lg:w-96 max-w-[calc(100vw-2rem)] lg:max-w-none bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-info-200/50 overflow-hidden z-50">
                <div className="p-4 border-b border-info-200/50 bg-gradient-to-r from-info-50 via-info-50/80 to-primary-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-info-700 flex items-center gap-2">
                      <Ticket size={20} className="text-info-600" />
                      اعلان‌های تیکت
                    </h3>
                    <button
                      onClick={() => setShowTicketNotifications(false)}
                      className="p-1 rounded-lg hover:bg-white/70 transition-colors text-neutral-600 hover:text-neutral-800"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {ticketNotificationCount > 0 && (
                    <p className="text-sm text-info-600 mt-1 font-medium">
                      {ticketNotificationCount} تیکت باز یا در حال بررسی
                    </p>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {pendingTickets.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">
                      <Ticket size={48} className="mx-auto mb-3 text-neutral-300" />
                      <p className="text-sm">هیچ تیکت در انتظاری وجود ندارد</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {pendingTickets.map((ticket: any) => (
                        <div
                          key={ticket.id}
                          onClick={() => handleTicketClick(ticket.id)}
                          className="p-4 hover:bg-info-50/50 cursor-pointer transition-colors group border-l-2 border-transparent hover:border-info-400"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              ticket.status === 'open' 
                                ? 'bg-info-100 text-info-700 border border-info-200'
                                : 'bg-warning-100 text-warning-700 border border-warning-200'
                            }`}>
                              <Ticket size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium text-neutral-800 group-hover:text-info-600 transition-colors line-clamp-2">
                                  {ticket.subject}
                                </h4>
                                <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                  ticket.status === 'open' 
                                    ? 'bg-info-100 text-info-700 border border-info-200'
                                    : 'bg-warning-100 text-warning-700 border border-warning-200'
                                }`}>
                                  {ticket.status === 'open' ? 'باز' : 'در حال بررسی'}
                                </span>
                              </div>
                              {ticket.description && (
                                <p className="text-sm text-neutral-600 line-clamp-2 mb-2">
                                  {ticket.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-neutral-500">
                                {ticket.ticket_number && (
                                  <span>🎫 {ticket.ticket_number}</span>
                                )}
                                {ticket.department_name && (
                                  <span>📁 {ticket.department_name}</span>
                                )}
                                {ticket.priority && (
                                  <span className={`${
                                    ticket.priority === 'high' ? 'text-red-600' :
                                    ticket.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    ⚡ {ticket.priority === 'high' ? 'بالا' : ticket.priority === 'medium' ? 'متوسط' : 'پایین'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {pendingTickets.length > 0 && (
                  <div className="p-3 border-t border-info-200/50 bg-gradient-to-r from-info-50/50 to-transparent">
                    <button
                      onClick={() => {
                        setShowTicketNotifications(false);
                        navigate('/tickets');
                      }}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-info-600 to-info-700 text-white rounded-lg hover:from-info-700 hover:to-info-800 transition-all font-medium text-sm shadow-md hover:shadow-lg"
                    >
                      مشاهده همه تیکت‌ها
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tasks Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                refetch();
              }}
              className={`relative p-2 rounded-lg transition-colors ${
                showNotifications 
                  ? 'bg-primary-50 text-primary-600' 
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-primary-600'
              }`}
              aria-label="اعلان‌ها"
            >
              <Bell size={22} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-danger-500 to-danger-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md ring-2 ring-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] lg:w-96 max-w-[calc(100vw-2rem)] lg:max-w-none bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-primary-200/50 overflow-hidden z-50">
                <div className="p-4 border-b border-primary-200/50 bg-gradient-to-r from-primary-50 via-primary-50/80 to-info-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-primary-700 flex items-center gap-2">
                      <Bell size={20} className="text-primary-600" />
                      اعلان‌ها
                    </h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg hover:bg-white/70 transition-colors text-neutral-600 hover:text-neutral-800"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {notificationCount > 0 && (
                    <p className="text-sm text-primary-600 mt-1 font-medium">
                      {notificationCount} تسک انجام نشده یا در حال انجام
                    </p>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {pendingTasks.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">
                      <Bell size={48} className="mx-auto mb-3 text-neutral-300" />
                      <p className="text-sm">هیچ تسک در انتظاری وجود ندارد</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {pendingTasks.map((task: any) => (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task.id)}
                          className="p-4 hover:bg-primary-50/50 cursor-pointer transition-colors group border-l-2 border-transparent hover:border-primary-400"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${getStatusColor(task.status)}`}>
                              {getStatusIcon(task.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium text-neutral-800 group-hover:text-primary-600 transition-colors line-clamp-2">
                                  {task.title}
                                </h4>
                                <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${getStatusColor(task.status)}`}>
                                  {translateTaskStatus(task.status)}
                                </span>
                              </div>
                              {task.description && (
                                <p className="text-sm text-neutral-600 line-clamp-2 mb-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-neutral-500">
                                {task.due_date && (
                                  <span>📅 {toJalali(task.due_date)}</span>
                                )}
                                {task.project_name && (
                                  <span>📁 {task.project_name}</span>
                                )}
                                {task.assigned_to_name && (
                                  <span>👤 {task.assigned_to_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {pendingTasks.length > 0 && (
                  <div className="p-3 border-t border-primary-200/50 bg-gradient-to-r from-primary-50/50 to-transparent">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/tasks');
                      }}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium text-sm shadow-md hover:shadow-lg"
                    >
                      مشاهده همه تسک‌ها
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

