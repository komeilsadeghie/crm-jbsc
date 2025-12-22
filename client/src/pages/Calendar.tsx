import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Calendar as CalendarIcon, Clock, Briefcase, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { 
  toJalali, 
  toJalaliFull, 
  getJalaliDayjs,
  getJalaliYear,
  getJalaliMonth,
  getJalaliDay,
  getJalaliDayOfWeek,
  getDaysInJalaliMonth,
  getFirstDayOfJalaliMonth,
  getLastDayOfJalaliMonth,
  jalaliMonthNames,
  jalaliWeekDays,
  formatDateForInput,
  jalaliToGregorian
} from '../utils/dateHelper';
import JalaliDatePicker from '../components/JalaliDatePicker';

const Calendar = () => {
  const queryClient = useQueryClient();
  // استفاده از تاریخ شمسی فعلی
  const currentJalali = getJalaliDayjs();
  const [currentJalaliYear, setCurrentJalaliYear] = useState(currentJalali.year());
  const [currentJalaliMonth, setCurrentJalaliMonth] = useState(currentJalali.month() + 1);
  // استفاده از تاریخ میلادی فعلی برای selectedDate (برای match کردن با رویدادهای دیتابیس)
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [clickedDate, setClickedDate] = useState<string | null>(null);

  // تبدیل تاریخ‌های شمسی به میلادی برای API
  const startOfMonthGregorian = getFirstDayOfJalaliMonth(currentJalaliYear, currentJalaliMonth);
  const endOfMonthGregorian = getLastDayOfJalaliMonth(currentJalaliYear, currentJalaliMonth);
  const startOfMonth = startOfMonthGregorian.toISOString().split('T')[0];
  const endOfMonth = endOfMonthGregorian.toISOString().split('T')[0];

  const { data: events, isLoading, error, refetch } = useQuery(
    ['calendar-events', startOfMonth, endOfMonth],
    async () => {
      try {
        // استفاده از endpoint مستقیم calendar/events برای اطمینان از دریافت رویدادها
        const response = await api.get(`/calendar/events?start_date=${startOfMonth}&end_date=${endOfMonth}`);
        const calendarEvents = Array.isArray(response.data) ? response.data : [];
        
        // تبدیل رویدادها به فرمت یکسان برای نمایش
        const formattedEvents = calendarEvents.map((event: any) => {
          // اطمینان از اینکه رنگ به درستی خوانده می‌شود
          const eventColor = event.color || '#6366F1';
          console.log('Event color:', eventColor, 'for event:', event.title);
          return {
            ...event,
            id: event.id,
            title: event.title,
            name: event.title,
            start: event.start_at,
            end: event.end_at,
            start_at: event.start_at,
            end_at: event.end_at,
            color: eventColor,
            type: 'event'
          };
        });
        
        console.log('Fetched calendar events:', formattedEvents);
        console.log('Number of events:', formattedEvents.length);
        console.log('Date range:', startOfMonth, 'to', endOfMonth);
        if (formattedEvents.length > 0) {
          console.log('Sample event structure:', formattedEvents[0]);
        }
        return formattedEvents;
      } catch (err: any) {
        console.error('Error fetching calendar events:', err);
        // در صورت خطا، سعی می‌کنیم از unified endpoint استفاده کنیم
        try {
          const unifiedResponse = await api.get(`/calendar/unified/events?start_date=${startOfMonth}&end_date=${endOfMonth}`);
          const unifiedEvents = Array.isArray(unifiedResponse.data) ? unifiedResponse.data : [];
          return unifiedEvents;
        } catch (unifiedErr: any) {
          console.error('Error fetching unified events:', unifiedErr);
          return [];
        }
      }
    },
    {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 0, // Always refetch
      cacheTime: 0, // Don't cache
      refetchInterval: false,
      onError: (error) => {
        console.error('Error fetching calendar events:', error);
      }
    }
  );

  const { data: customers, isLoading: customersLoading } = useQuery('customers', async () => {
    try {
    const response = await api.get('/customers');
    const data = response.data;
    return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  });

  const { data: deals } = useQuery('deals', async () => {
    const response = await api.get('/deals');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });

  const eventsArray = Array.isArray(events) ? events : [];
  
  // Debug: Log events when they change
  useEffect(() => {
    console.log('=== Calendar Events Debug ===');
    console.log('Total events:', eventsArray.length);
    console.log('Date range:', startOfMonth, 'to', endOfMonth);
    if (eventsArray.length > 0) {
      console.log('All events:', eventsArray);
      eventsArray.forEach((event: any, idx: number) => {
        console.log(`Event ${idx + 1}:`, {
          id: event.id,
          title: event.title || event.name,
          start: event.start || event.start_at,
          end: event.end || event.end_at,
          color: event.color,
          type: event.type
        });
      });
    } else {
      console.log('No events found in date range');
    }
  }, [eventsArray, startOfMonth, endOfMonth]);

  const getEventColor = (event: any) => {
    // اگر رویداد رنگ اختصاصی دارد، از آن استفاده کن
    if (event.color) {
      // تبدیل hex به RGB برای opacity
      const hex = event.color.replace('#', '');
      if (hex.length === 6) {
        try {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return {
              bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
              text: event.color,
              border: event.color,
            };
          }
        } catch (err) {
          console.error('Error parsing color:', event.color, err);
        }
      }
    }
    
    // در غیر این صورت از نوع رویداد استفاده کن
    switch (event.type) {
      case 'task': return { bg: 'bg-info-100', text: 'text-info-700', border: 'border-info-300' };
      case 'invoice': return { bg: 'bg-warning-100', text: 'text-warning-700', border: 'border-warning-300' };
      case 'contract': return { bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-300' };
      case 'milestone': return { bg: 'bg-success-100', text: 'text-success-700', border: 'border-success-300' };
      case 'event': return { bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-300' };
      default: return { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300' };
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task': return <Briefcase size={18} />;
      case 'invoice': return <CalendarIcon size={18} />;
      case 'contract': return <Briefcase size={18} />;
      case 'milestone': return <Clock size={18} />;
      case 'event': return <CalendarIcon size={18} />;
      default: return <CalendarIcon size={18} />;
    }
  };

  // Generate calendar days based on Jalali calendar
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInJalaliMonth(currentJalaliYear, currentJalaliMonth);
    const firstDayOfMonth = getFirstDayOfJalaliMonth(currentJalaliYear, currentJalaliMonth);
    const startingDayOfWeek = getJalaliDayOfWeek(firstDayOfMonth); // 0 = شنبه, 6 = جمعه
    
    const days = [];
    const todayJalali = getJalaliDayjs();
    const todayYear = todayJalali.year();
    const todayMonth = todayJalali.month() + 1;
    const todayDay = todayJalali.date();
    
    // Add previous month's trailing days
    const prevMonth = currentJalaliMonth === 1 ? 12 : currentJalaliMonth - 1;
    const prevYear = currentJalaliMonth === 1 ? currentJalaliYear - 1 : currentJalaliYear;
    const prevMonthDays = getDaysInJalaliMonth(prevYear, prevMonth);
    
    // در تقویم شمسی، هفته از شنبه شروع می‌شود (0)
    // باید روزهای قبل از اولین روز ماه را اضافه کنیم
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const jalaliDate = getJalaliDayjs().calendar('jalali').year(prevYear).month(prevMonth - 1).date(day);
      const gregorianDayjs = jalaliDate.calendar('gregory');
      days.push({
        date: gregorianDayjs.format('YYYY-MM-DD'),
        jalaliDay: day,
        jalaliMonth: prevMonth,
        jalaliYear: prevYear,
        isCurrentMonth: false,
        isToday: prevYear === todayYear && prevMonth === todayMonth && day === todayDay
      });
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const jalaliDate = getJalaliDayjs().calendar('jalali').year(currentJalaliYear).month(currentJalaliMonth - 1).date(day);
      const gregorianDayjs = jalaliDate.calendar('gregory');
      days.push({
        date: gregorianDayjs.format('YYYY-MM-DD'),
        jalaliDay: day,
        jalaliMonth: currentJalaliMonth,
        jalaliYear: currentJalaliYear,
        isCurrentMonth: true,
        isToday: currentJalaliYear === todayYear && currentJalaliMonth === todayMonth && day === todayDay
      });
    }
    
    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    const nextMonth = currentJalaliMonth === 12 ? 1 : currentJalaliMonth + 1;
    const nextYear = currentJalaliMonth === 12 ? currentJalaliYear + 1 : currentJalaliYear;
    
    for (let day = 1; day <= remainingDays; day++) {
      const jalaliDate = getJalaliDayjs().calendar('jalali').year(nextYear).month(nextMonth - 1).date(day);
      const gregorianDayjs = jalaliDate.calendar('gregory');
      days.push({
        date: gregorianDayjs.format('YYYY-MM-DD'),
        jalaliDay: day,
        jalaliMonth: nextMonth,
        jalaliYear: nextYear,
        isCurrentMonth: false,
        isToday: nextYear === todayYear && nextMonth === todayMonth && day === todayDay
      });
    }
    
    return days;
  }, [currentJalaliYear, currentJalaliMonth]);

  // Get events for a specific date
  const getEventsForDate = (date: string) => {
    if (!date) return [];
    
    const filteredEvents = eventsArray.filter((event: any) => {
      // Check multiple possible date fields
      const eventDate = event.start || event.start_at || event.end || event.end_at || event.date;
      if (!eventDate) {
        return false;
      }
      
      // Extract date part (YYYY-MM-DD) from datetime string
      let dateStr: string = '';
      try {
        if (typeof eventDate === 'string') {
          // Handle ISO format: "2024-12-01T09:00:00" or "2024-12-01"
          if (eventDate.includes('T')) {
            dateStr = eventDate.split('T')[0];
          } else if (eventDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateStr = eventDate;
          } else {
            // Try to parse as date
            const parsed = new Date(eventDate);
            if (!isNaN(parsed.getTime())) {
              dateStr = parsed.toISOString().split('T')[0];
            }
          }
        } else if (eventDate instanceof Date) {
          dateStr = eventDate.toISOString().split('T')[0];
        } else {
          dateStr = String(eventDate);
        }
      } catch (err) {
        console.error('Error parsing event date:', err, eventDate);
        return false;
      }
      
      // تاریخ‌ها باید match شوند (هر دو میلادی هستند)
      const matches = dateStr === date;
      
      // Debug log
      if (matches) {
        console.log('Event matched:', {
          eventTitle: event.title || event.name,
          eventDate: dateStr,
          calendarDate: date,
          jalaliDate: toJalali(date)
        });
      }
      
      return matches;
    });
    
    return filteredEvents;
  };

  const handlePrevMonth = () => {
    if (currentJalaliMonth === 1) {
      setCurrentJalaliMonth(12);
      setCurrentJalaliYear(currentJalaliYear - 1);
    } else {
      setCurrentJalaliMonth(currentJalaliMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentJalaliMonth === 12) {
      setCurrentJalaliMonth(1);
      setCurrentJalaliYear(currentJalaliYear + 1);
    } else {
      setCurrentJalaliMonth(currentJalaliMonth + 1);
    }
  };

  const handleToday = () => {
    const today = getJalaliDayjs();
    setCurrentJalaliYear(today.year());
    setCurrentJalaliMonth(today.month() + 1);
    // استفاده از تاریخ میلادی برای match کردن با رویدادهای دیتابیس
    setSelectedDate(formatDateForInput(today.toDate()));
  };

  const handleDayClick = (date: string) => {
    // date به صورت میلادی است (YYYY-MM-DD) - برای match کردن با رویدادهای دیتابیس
    setClickedDate(date);
    setSelectedDate(date);
    setEditingEvent(null);
    setShowModal(true);
  };

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">خطا در بارگذاری تقویم</div>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-info-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">تقویم رویدادها</h1>
        <button
          onClick={() => {
            setEditingEvent(null);
              setClickedDate(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن رویداد
        </button>
      </div>

        {/* Calendar Navigation */}
      <div className="card">
          <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-neutral-100 transition-all text-neutral-700 hover:text-neutral-900"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={handleToday}
                className="btn btn-secondary text-sm"
              >
                امروز
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-neutral-100 transition-all text-neutral-700 hover:text-neutral-900"
              >
                <ChevronLeft size={20} />
              </button>
          </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">
              {jalaliMonthNames[currentJalaliMonth - 1]} {currentJalaliYear}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">ماه</span>
        </div>
      </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Week day headers */}
            {jalaliWeekDays.map((day) => (
              <div key={day} className="text-center font-semibold text-neutral-700 py-2 text-sm">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day.date);
              const isSelected = day.date === selectedDate;
              
              // Debug log for first few days
              if (idx < 7 && dayEvents.length > 0) {
                console.log(`Day ${day.jalaliDay} (${day.date}) has ${dayEvents.length} events:`, dayEvents);
              }
              
              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day.date)}
                  className={`
                    min-h-[100px] p-2 rounded-lg cursor-pointer transition-all
                    ${day.isCurrentMonth ? 'bg-white/50' : 'bg-neutral-100/30'}
                    ${day.isToday ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                    ${isSelected ? 'ring-2 ring-info-500' : ''}
                    hover:bg-white/70 backdrop-blur-sm border border-white/30
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${day.isCurrentMonth ? 'text-neutral-700' : 'text-neutral-400'}`}>
                    {day.jalaliDay}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event: any, eventIdx: number) => {
                      const colorStyle = getEventColor(event);
                      return (
                        <div
                          key={event.id || eventIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEvent(event);
                            setShowModal(true);
                          }}
                          className={`
                            text-xs px-2 py-1 rounded truncate border
                            hover:opacity-80 transition-opacity cursor-pointer
                            ${typeof colorStyle === 'object' && !colorStyle.bg.includes('rgba') ? colorStyle.bg + ' ' + colorStyle.text + ' ' + colorStyle.border : ''}
                          `}
                          style={typeof colorStyle === 'object' && colorStyle.bg.includes('rgba') 
                            ? { 
                                backgroundColor: colorStyle.bg, 
                                borderColor: colorStyle.border || event.color || '#6366F1', 
                                borderWidth: '1px',
                                color: colorStyle.text || event.color || '#6366F1'
                              }
                            : event.color 
                              ? {
                                  backgroundColor: `${event.color}20`,
                                  borderColor: event.color,
                                  borderWidth: '1px',
                                  color: event.color
                                }
                              : {}
                          }
                          title={event.name || event.title || 'رویداد'}
                        >
                          {event.name || event.title || 'رویداد'}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-neutral-500 text-center">
                        +{dayEvents.length - 3} بیشتر
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events */}
      <div className="card">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-info-600 bg-clip-text text-transparent">
            رویدادهای {toJalali(selectedDate)}
          </h2>
          {getEventsForDate(selectedDate).length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
            رویدادی برای این تاریخ ثبت نشده است
          </div>
        ) : (
          <div className="space-y-3">
              {getEventsForDate(selectedDate).map((event: any) => {
                const colorStyle = getEventColor(event);
                return (
              <div
                key={event.id}
                  onClick={() => {
                    setEditingEvent(event);
                    setShowModal(true);
                  }}
                  className={`card-hover ${typeof colorStyle === 'object' && !colorStyle.bg.includes('rgba') ? colorStyle.bg : ''} cursor-pointer`}
                  style={{ 
                    borderLeftColor: event.color || (typeof colorStyle === 'object' ? colorStyle.border : '#6366F1'), 
                    borderLeftWidth: '4px',
                    backgroundColor: typeof colorStyle === 'object' && colorStyle.bg.includes('rgba') ? colorStyle.bg : undefined
                  }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {getEventIcon(event.type)}
                        <span className="font-bold text-lg">{event.name || event.title}</span>
                        <span className="text-xs px-2 py-1 bg-white/50 rounded">
                          {event.type === 'task' ? 'وظیفه' :
                           event.type === 'invoice' ? 'فاکتور' :
                           event.type === 'contract' ? 'قرارداد' :
                           event.type === 'milestone' ? 'نقطه عطف' : 'رویداد'}
                        </span>
                    </div>
                    {event.description && (
                        <p className="text-neutral-700 mb-2 text-sm">{event.description}</p>
                    )}
                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                        {event.start && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                            <span>{toJalali(event.start)}</span>
                        </div>
                      )}
                        {event.status && (
                          <span className="text-xs px-2 py-1 bg-white/50 rounded">
                            {event.status}
                          </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
              })}
          </div>
        )}
      </div>

      {/* Event Modal */}
      {showModal && (
        <EventModal
          event={editingEvent}
          customers={customers}
          customersLoading={customersLoading}
          deals={deals}
          selectedDate={selectedDate}
          clickedDate={clickedDate}
          startOfMonth={startOfMonth}
          endOfMonth={endOfMonth}
          refetch={refetch}
          onClose={() => {
            setShowModal(false);
            setEditingEvent(null);
            setClickedDate(null);
          }}
        />
      )}
      </div>
    </div>
  );
};

const EventModal = ({ event, customers, customersLoading, deals, selectedDate, clickedDate, startOfMonth, endOfMonth, refetch, onClose }: any) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/calendar/events/${id}`),
    {
      onSuccess: async () => {
        queryClient.invalidateQueries(['calendar-events']);
        onClose();
        setTimeout(() => {
          refetch().catch((err: unknown) => {
            console.error('Error refetching events:', err);
          });
        }, 300);
        setTimeout(() => {
          alert('رویداد با موفقیت حذف شد');
        }, 100);
      },
      onError: (error: any) => {
        console.error('Error deleting calendar event:', error);
        alert('خطا در حذف رویداد: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleDelete = () => {
    if (!event || !event.id) return;
    if (!confirm('آیا از حذف این رویداد اطمینان دارید؟')) return;
    deleteMutation.mutate(event.id);
  };
  
  // 7 رنگ برای انتخاب
  const eventColors = [
    { name: 'بنفش', value: '#6366F1', bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-300' },
    { name: 'آبی', value: '#3B82F6', bg: 'bg-info-100', text: 'text-info-700', border: 'border-info-300' },
    { name: 'سبز', value: '#10B981', bg: 'bg-success-100', text: 'text-success-700', border: 'border-success-300' },
    { name: 'زرد', value: '#F59E0B', bg: 'bg-warning-100', text: 'text-warning-700', border: 'border-warning-300' },
    { name: 'قرمز', value: '#EF4444', bg: 'bg-danger-100', text: 'text-danger-700', border: 'border-danger-300' },
    { name: 'نارنجی', value: '#F97316', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    { name: 'صورتی', value: '#EC4899', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  ];
  
  // تبدیل تاریخ میلادی به شمسی برای formData
  // selectedDate و clickedDate به صورت میلادی هستند (برای match کردن با رویدادهای دیتابیس)
  // اما باید آن را به شمسی تبدیل کنیم برای نمایش در form
  // استفاده از clickedDate در اولویت است (اگر وجود داشته باشد)
  const dateToUse = clickedDate || selectedDate;
  
  const getJalaliDateString = (dateStr: string | null | undefined): string => {
    if (!dateStr) {
      // تبدیل dateToUse میلادی به شمسی
      const jalaliDate = getJalaliDayjs(dateToUse);
      return `${jalaliDate.year()}-${String(jalaliDate.month() + 1).padStart(2, '0')}-${String(jalaliDate.date()).padStart(2, '0')}`;
    }
    try {
      // اگر تاریخ میلادی است (شامل T یا سال بین 1900-2100)
      const datePart = dateStr.split('T')[0];
      const year = parseInt(datePart.split('-')[0]);
      if (year >= 1900 && year <= 2100) {
        // تاریخ میلادی است - تبدیل به شمسی
        const jalaliDate = getJalaliDayjs(datePart);
        return `${jalaliDate.year()}-${String(jalaliDate.month() + 1).padStart(2, '0')}-${String(jalaliDate.date()).padStart(2, '0')}`;
      }
      // تاریخ شمسی است
      return datePart;
    } catch (err) {
      console.error('Error converting date:', err);
      // Fallback: تبدیل dateToUse میلادی به شمسی
      const jalaliDate = getJalaliDayjs(dateToUse);
      return `${jalaliDate.year()}-${String(jalaliDate.month() + 1).padStart(2, '0')}-${String(jalaliDate.date()).padStart(2, '0')}`;
    }
  };

  // Initialize formData with proper date conversion
  const initialFormData = useMemo(() => {
    const jalaliStartDate = event?.start_at 
      ? getJalaliDateString(event.start_at) 
      : getJalaliDateString(dateToUse);
    const jalaliEndDate = event?.end_at 
      ? getJalaliDateString(event.end_at) 
      : jalaliStartDate;
    
    return {
      title: event?.title || event?.name || '',
      description: event?.description || '',
      start_at: jalaliStartDate,
      start_time: event?.start_at ? (event.start_at.split('T')[1]?.slice(0, 5) || '09:00') : '09:00',
      end_at: jalaliEndDate,
      end_time: event?.end_at ? (event.end_at.split('T')[1]?.slice(0, 5) || '10:00') : '10:00',
      relation_type: event?.relation_type || 'CUSTOMER',
      customer_id: event?.customer_id || '',
      deal_id: event?.deal_id || '',
      color: event?.color || eventColors[0].value,
    };
  }, [event, selectedDate, clickedDate]);

  const [formData, setFormData] = useState(initialFormData);

  // Update formData when event or selectedDate changes
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const mutation = useMutation(
    (data: any) => {
      console.log('Mutation received data:', data);
      
      // بررسی معتبر بودن تاریخ‌ها
      if (!data.start_at || typeof data.start_at !== 'string') {
        throw new Error('تاریخ شروع نامعتبر است');
      }
      
      // بررسی فرمت تاریخ (باید YYYY-MM-DD باشد)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.start_at)) {
        console.error('Invalid start_at format:', data.start_at);
        throw new Error('فرمت تاریخ شروع نامعتبر است. لطفاً تاریخ را دوباره انتخاب کنید.');
      }
      
      if (data.end_at && !dateRegex.test(data.end_at)) {
        console.error('Invalid end_at format:', data.end_at);
        throw new Error('فرمت تاریخ پایان نامعتبر است. لطفاً تاریخ را دوباره انتخاب کنید.');
      }

      // ساخت payload مطابق با انتظارات API
      // API انتظار دارد: date, startTime, endTime, relationType, relationId
      // Backend خودش تاریخ شمسی را به میلادی تبدیل می‌کند
      const payload: any = {
        title: data.title,
        description: data.description || '',
        date: data.start_at, // تاریخ شمسی - backend آن را تبدیل می‌کند
        startTime: data.start_time || '09:00',
        relationType: data.relation_type || 'CUSTOMER',
        color: data.color || eventColors[0].value,
      };

      // اضافه کردن endTime اگر وجود دارد
      // توجه: API فقط یک 'date' می‌گیرد و زمان‌ها را با آن ترکیب می‌کند
      // پس اگر تاریخ پایان متفاوت از تاریخ شروع است، نمی‌توانیم آن را ارسال کنیم
      // در این صورت فقط زمان پایان را ارسال می‌کنیم
      if (data.end_time) {
        payload.endTime = data.end_time;
      } else if (data.end_at) {
        // اگر فقط تاریخ پایان وجود دارد اما زمان ندارد، زمان پیش‌فرض را اضافه می‌کنیم
        payload.endTime = '10:00';
      }

      // Add relationId based on relation_type
      if (data.relation_type === 'CUSTOMER' && data.customer_id) {
        payload.relationId = data.customer_id.toString();
      } else if (data.relation_type === 'DEAL' && data.deal_id) {
        payload.relationId = data.deal_id.toString();
      }

      console.log('Saving calendar event with payload:', payload);

      if (event && event.id) {
        return api.put(`/calendar/events/${event.id}`, payload);
      }
      return api.post('/calendar/events', payload);
    },
    {
      onSuccess: async (response) => {
        console.log('Calendar event saved successfully:', response.data);
        
        // Invalidate queries
        queryClient.invalidateQueries(['calendar-events']);
        
        // Close modal first
        onClose();
        
        // Then refetch after a short delay
        setTimeout(() => {
          refetch().catch((err: unknown) => {
            console.error('Error refetching events:', err);
          });
        }, 300);
        
        // Show success message
        setTimeout(() => {
        alert('رویداد با موفقیت ذخیره شد');
        }, 100);
      },
      onError: (error: any) => {
        console.error('Error saving calendar event:', error);
        const errorMessage = error.message || error.response?.data?.error || error.response?.data?.message || 'خطا در ذخیره رویداد';
        alert(errorMessage);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.title.trim()) {
      alert('لطفاً عنوان رویداد را وارد کنید');
      return;
    }
    
    if (!formData.start_at) {
      alert('لطفاً تاریخ شروع را انتخاب کنید');
      return;
    }
    
    // بررسی معتبر بودن تاریخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.start_at)) {
      alert('تاریخ شروع نامعتبر است. لطفاً تاریخ را دوباره انتخاب کنید.');
      return;
    }
    
    if (formData.end_at && !dateRegex.test(formData.end_at)) {
      alert('تاریخ پایان نامعتبر است. لطفاً تاریخ را دوباره انتخاب کنید.');
      return;
    }
    
    // بررسی اینکه تاریخ شروع قبل از تاریخ پایان باشد
    if (formData.end_at && formData.start_at > formData.end_at) {
      alert('تاریخ شروع باید قبل از تاریخ پایان باشد.');
      return;
    }
    
    // بررسی معتبر بودن تاریخ (شمسی یا میلادی)
    // تاریخ شمسی: سال بین 1300-1500
    // تاریخ میلادی: سال بین 1900-2100
    const startYear = parseInt(formData.start_at.split('-')[0]);
    if (startYear < 1300 || (startYear > 1500 && startYear < 1900) || startYear > 2100) {
      alert('تاریخ شروع نامعتبر است. لطفاً تاریخ را دوباره انتخاب کنید.');
      return;
    }
    
    if (formData.end_at) {
      const endYear = parseInt(formData.end_at.split('-')[0]);
      if (endYear < 1300 || (endYear > 1500 && endYear < 1900) || endYear > 2100) {
        alert('تاریخ پایان نامعتبر است. لطفاً تاریخ را دوباره انتخاب کنید.');
        return;
      }
    }
    
    console.log('Submitting calendar event form:', formData);
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral-800">
            {event ? 'ویرایش رویداد' : 'افزودن رویداد جدید'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 transition-colors">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label label-required">عنوان</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label label-required">تاریخ و زمان شروع</label>
              <JalaliDatePicker
                value={formData.start_at}
                onChange={(value) => setFormData({ ...formData, start_at: value })}
                placeholder="تاریخ و زمان شروع را انتخاب کنید"
                required
                showTime={true}
              />
            </div>
            <div>
              <label className="label">تاریخ و زمان پایان</label>
              <JalaliDatePicker
                value={formData.end_at}
                onChange={(value) => setFormData({ ...formData, end_at: value })}
                placeholder="تاریخ و زمان پایان را انتخاب کنید"
                showTime={true}
              />
            </div>
            <div>
              <label className="label">زمان پایان</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">نوع ارتباط</label>
            <select
              value={formData.relation_type}
              onChange={(e) => setFormData({ ...formData, relation_type: e.target.value })}
              className="input"
            >
              <option value="CUSTOMER">مشتری</option>
              <option value="DEAL">پروژه</option>
              <option value="COACHING_PROGRAM">برنامه کوچینگ</option>
              <option value="CONTENT_ITEM">محتوا</option>
            </select>
          </div>
          {formData.relation_type === 'CUSTOMER' && (
            <div>
              <label className="label">مشتری</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب مشتری</option>
                {customersLoading ? (
                  <option disabled>در حال بارگذاری...</option>
                ) : customers && customers.length > 0 ? (
                  customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                      {customer.name || customer.company_name || `مشتری #${customer.id}`}
                  </option>
                  ))
                ) : (
                  <option disabled>مشتری‌ای یافت نشد</option>
                )}
              </select>
            </div>
          )}
          {formData.relation_type === 'DEAL' && (
            <div>
              <label className="label">پروژه</label>
              <select
                value={formData.deal_id}
                onChange={(e) => setFormData({ ...formData, deal_id: e.target.value })}
                className="input"
              >
                <option value="">انتخاب پروژه</option>
                {Array.isArray(deals) && deals.map((deal: any) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">رنگ لیبل</label>
            <div className="flex gap-2 flex-wrap">
              {eventColors.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: colorOption.value })}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                    ${formData.color === colorOption.value 
                      ? `${colorOption.border} border-2 shadow-md` 
                      : 'border-neutral-200 hover:border-neutral-300'
                    }
                  `}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-neutral-300"
                    style={{ backgroundColor: colorOption.value }}
                  />
                  <span className={`text-sm ${formData.color === colorOption.value ? 'font-bold' : ''}`}>
                    {colorOption.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center pt-4">
            {event && event.id && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="btn btn-danger flex items-center gap-2"
                disabled={deleteMutation.isLoading}
              >
                <Trash2 size={18} />
                حذف رویداد
              </button>
            )}
            <div className="flex gap-4 ml-auto">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Calendar;

