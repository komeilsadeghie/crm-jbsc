import { useState, useRef, useEffect } from 'react';
import { getJalaliDayjs, formatDateForInput, jalaliToGregorian, toJalali } from '../utils/dateHelper';
import { Calendar as CalendarIcon } from 'lucide-react';

interface JalaliDatePickerProps {
  value: string; // می‌تواند میلادی یا شمسی باشد
  onChange: (value: string) => void; // تاریخ شمسی را برمی‌گرداند (YYYY-MM-DD format یا YYYY-MM-DD HH:mm format)
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  showTime?: boolean; // افزودن امکان انتخاب ساعت
}

const JalaliDatePicker = ({ 
  value, 
  onChange, 
  placeholder = 'تاریخ را انتخاب کنید',
  required = false,
  className = '',
  disabled = false,
  showTime = false
}: JalaliDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [currentYear, setCurrentYear] = useState(() => {
    const year = getJalaliDayjs().year();
    // Limit year between 1404 and 1430
    if (year < 1404) return 1404;
    if (year > 1430) return 1430;
    return year;
  });
  const [currentMonth, setCurrentMonth] = useState(getJalaliDayjs().month() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      // بررسی اینکه آیا value تاریخ شمسی است یا میلادی
      const dateParts = value.split('-');
      let jalaliDate;
      
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        // اگر سال بین 1300 تا 1500 باشد، تاریخ شمسی است
        if (year >= 1300 && year <= 1500) {
          // تاریخ شمسی است
          jalaliDate = getJalaliDayjs().calendar('jalali').year(year).month(parseInt(dateParts[1]) - 1).date(parseInt(dateParts[2]));
          setDisplayValue(value); // نمایش همان تاریخ شمسی
        } else {
          // تاریخ میلادی است - تبدیل به شمسی برای نمایش
          jalaliDate = getJalaliDayjs(value);
          const jalali = toJalali(value);
          setDisplayValue(jalali);
        }
      } else {
        // تلاش برای تبدیل به شمسی
        jalaliDate = getJalaliDayjs(value);
        const jalali = toJalali(value);
        setDisplayValue(jalali);
      }
      
      const year = jalaliDate.year();
      // Limit year between 1404 and 1430
      const limitedYear = year < 1404 ? 1404 : year > 1430 ? 1430 : year;
      setCurrentYear(limitedYear);
      setCurrentMonth(jalaliDate.month() + 1);
      setSelectedDay(jalaliDate.date());
    } else {
      setDisplayValue('');
      setSelectedDay(null);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const jalaliMonthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const jalaliWeekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  const getDaysInMonth = (year: number, month: number): number => {
    const jalali = getJalaliDayjs().calendar('jalali').year(year).month(month - 1);
    return jalali.daysInMonth();
  };

  const getFirstDayOfWeek = (year: number, month: number): number => {
    const firstDay = getJalaliDayjs().calendar('jalali').year(year).month(month - 1).date(1);
    return firstDay.day();
  };

  const handleDayClick = (day: number) => {
    try {
      setSelectedDay(day);
      let jalaliDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      if (showTime) {
        // اگر انتخاب ساعت فعال است، تاریخ را با ساعت برگردان
        jalaliDateStr += ` ${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
        onChange(jalaliDateStr);
      } else {
        // تبدیل به میلادی برای backward compatibility
        console.log('Converting Jalali date to Gregorian:', jalaliDateStr);
        const gregorianDate = jalaliToGregorian(jalaliDateStr);
        const gregorianDateStr = gregorianDate.toISOString().split('T')[0];
        console.log('Converted to Gregorian:', gregorianDateStr);
        onChange(gregorianDateStr);
      }
      
      if (!showTime) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error in handleDayClick:', error);
      alert('خطا در تبدیل تاریخ امروز. لطفاً دوباره تلاش کنید.');
    }
  };
  
  const handleTimeChange = () => {
    if (selectedDay) {
      const jalaliDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')} ${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
      onChange(jalaliDateStr);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      if (currentYear > 1404) {
        setCurrentYear(currentYear - 1);
      }
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      if (currentYear < 1430) {
        setCurrentYear(currentYear + 1);
      }
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    if (newYear >= 1404 && newYear <= 1430) {
      setCurrentYear(newYear);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    if (newMonth >= 1 && newMonth <= 12) {
      setCurrentMonth(newMonth);
    }
  };

  const handleToday = () => {
    try {
      const today = getJalaliDayjs();
      const year = today.year();
      // Limit year between 1404 and 1430
      const limitedYear = year < 1404 ? 1404 : year > 1430 ? 1430 : year;
      setCurrentYear(limitedYear);
      setCurrentMonth(today.month() + 1);
      setSelectedDay(today.date());
      // برگرداندن تاریخ شمسی امروز
      let todayStr = `${limitedYear}-${String(today.month() + 1).padStart(2, '0')}-${String(today.date()).padStart(2, '0')}`;
      
      if (showTime) {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        setSelectedHour(hour);
        setSelectedMinute(minute);
        todayStr += ` ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onChange(todayStr);
      } else {
        console.log('Selected today Jalali date:', todayStr);
        // تبدیل به میلادی برای backward compatibility
        const gregorianDate = jalaliToGregorian(todayStr);
        const gregorianDateStr = gregorianDate.toISOString().split('T')[0];
        onChange(gregorianDateStr);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error in handleToday:', error);
      alert('خطا در انتخاب تاریخ امروز. لطفاً دوباره تلاش کنید.');
    }
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);
  const days = [];

  // Previous month days
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const prevMonthDays = getDaysInMonth(prevYear, prevMonth);
  
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      month: prevMonth,
      year: prevYear
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      isCurrentMonth: true,
      month: currentMonth,
      year: currentYear
    });
  }

  // Next month days to fill the grid
  const remainingDays = 42 - days.length;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      day,
      isCurrentMonth: false,
      month: nextMonth,
      year: nextYear
    });
  }

  return (
    <div className="relative z-50" ref={pickerRef}>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          readOnly
          onClick={() => !disabled && setIsOpen(!isOpen)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`input pr-10 cursor-pointer ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <CalendarIcon 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none" 
          size={20} 
        />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-[9999] mt-2 bg-white dark:bg-neutral-800 rounded-xl shadow-large border border-neutral-200 dark:border-neutral-700 p-4 w-80">
          {/* Header with Year and Month Selectors */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={currentYear === 1404 && currentMonth === 1}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-300"
            >
              <span className="text-neutral-600">‹</span>
            </button>
            <div className="flex items-center gap-2 flex-1 justify-center">
              <select
                value={currentYear}
                onChange={handleYearChange}
                className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-bold text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Array.from({ length: 27 }, (_, i) => 1404 + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span className="text-neutral-600 font-bold">/</span>
              <select
                value={currentMonth}
                onChange={handleMonthChange}
                className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-bold text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {jalaliMonthNames.map((monthName, index) => (
                  <option key={index + 1} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={currentYear === 1430 && currentMonth === 12}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-300"
            >
              <span className="text-neutral-600">›</span>
            </button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {jalaliWeekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-neutral-600 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              const isSelected = d.isCurrentMonth && d.day === selectedDay && d.month === currentMonth && d.year === currentYear;
              const today = getJalaliDayjs();
              const isToday = d.isCurrentMonth && 
                today.year() === d.year && 
                today.month() + 1 === d.month && 
                today.date() === d.day;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => d.isCurrentMonth && handleDayClick(d.day)}
                  disabled={!d.isCurrentMonth}
                  className={`
                    aspect-square p-1 rounded-lg text-sm transition-colors
                    ${!d.isCurrentMonth ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-700 hover:bg-neutral-100'}
                    ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : ''}
                    ${isToday && !isSelected ? 'ring-2 ring-primary-300' : ''}
                  `}
                >
                  {d.day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={handleToday}
              className="w-full btn btn-secondary btn-sm"
            >
              امروز
            </button>
          </div>
          
          {/* Time Picker (if showTime is true) */}
          {showTime && selectedDay && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">ساعت:</label>
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      setSelectedHour(parseInt(e.target.value));
                      handleTimeChange();
                    }}
                    className="input text-center w-20"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <span className="text-lg">:</span>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">دقیقه:</label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => {
                      setSelectedMinute(parseInt(e.target.value));
                      handleTimeChange();
                    }}
                    className="input text-center w-20"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const jalaliDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')} ${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
                    onChange(jalaliDateStr);
                    setIsOpen(false);
                  }}
                  className="btn btn-primary text-sm px-4 py-2"
                >
                  تأیید
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JalaliDatePicker;

