import dayjs from 'dayjs';
import jalaliday from 'jalaliday';
import 'dayjs/locale/fa';

dayjs.extend(jalaliday);

// Set locale to Persian
dayjs.locale('fa');

/**
 * Convert Gregorian date to Jalali (Persian) date string
 */
export const toJalali = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  try {
    // Format: DD/MM/YYYY (روز/ماه/سال) - بدون j
    const jalaliDate = dayjs(date).calendar('jalali');
    const day = String(jalaliDate.date()).padStart(2, '0');
    const month = String(jalaliDate.month() + 1).padStart(2, '0');
    const year = jalaliDate.year();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Convert Gregorian date to Jalali with time
 */
export const toJalaliDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  try {
    const jalaliDate = dayjs(date).calendar('jalali');
    const day = String(jalaliDate.date()).padStart(2, '0');
    const month = String(jalaliDate.month() + 1).padStart(2, '0');
    const year = jalaliDate.year();
    const time = jalaliDate.format('HH:mm');
    return `${day}/${month}/${year} ${time}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Convert Gregorian date to Jalali with full format
 */
export const toJalaliFull = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  try {
    const jalaliDate = dayjs(date).calendar('jalali');
    const day = jalaliDate.date();
    const monthName = jalaliMonthNames[jalaliDate.month()];
    const year = jalaliDate.year();
    const weekDay = jalaliWeekDays[jalaliDate.day()];
    return `${weekDay}، ${day} ${monthName} ${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Get current Jalali date
 */
export const getCurrentJalali = (): string => {
  const jalaliDate = dayjs().calendar('jalali');
  const day = String(jalaliDate.date()).padStart(2, '0');
  const month = String(jalaliDate.month() + 1).padStart(2, '0');
  const year = jalaliDate.year();
  return `${day}/${month}/${year}`;
};

/**
 * Format date for input (YYYY-MM-DD format - Gregorian date for API)
 * This function returns the Gregorian date string that will be converted to Jalali by JalaliDatePicker
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  try {
    // Return Gregorian date in YYYY-MM-DD format
    // JalaliDatePicker will convert it to Jalali for display
    return dayjs(date).format('YYYY-MM-DD');
  } catch (error) {
    return '';
  }
};

/**
 * Get Jalali dayjs object
 */
export const getJalaliDayjs = (date?: Date | string | null) => {
  if (!date) return dayjs().calendar('jalali');
  return dayjs(date).calendar('jalali');
};

/**
 * Get Jalali month name
 */
export const getJalaliMonthName = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  try {
    const jalaliDate = dayjs(date).calendar('jalali');
    return jalaliMonthNames[jalaliDate.month()];
  } catch (error) {
    return '';
  }
};

/**
 * Get Jalali day name
 */
export const getJalaliDayName = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  try {
    return dayjs(date).calendar('jalali').format('dddd');
  } catch (error) {
    return '';
  }
};

/**
 * Get Jalali year
 */
export const getJalaliYear = (date: Date | string | null | undefined): number => {
  if (!date) return dayjs().calendar('jalali').year();
  try {
    return dayjs(date).calendar('jalali').year();
  } catch (error) {
    return dayjs().calendar('jalali').year();
  }
};

/**
 * Get Jalali month (1-12)
 */
export const getJalaliMonth = (date: Date | string | null | undefined): number => {
  if (!date) return dayjs().calendar('jalali').month() + 1;
  try {
    return dayjs(date).calendar('jalali').month() + 1;
  } catch (error) {
    return dayjs().calendar('jalali').month() + 1;
  }
};

/**
 * Get Jalali day of month
 */
export const getJalaliDay = (date: Date | string | null | undefined): number => {
  if (!date) return dayjs().calendar('jalali').date();
  try {
    return dayjs(date).calendar('jalali').date();
  } catch (error) {
    return dayjs().calendar('jalali').date();
  }
};

/**
 * Get Jalali day of week (0 = شنبه, 6 = جمعه)
 */
export const getJalaliDayOfWeek = (date: Date | string | null | undefined): number => {
  if (!date) return dayjs().calendar('jalali').day();
  try {
    return dayjs(date).calendar('jalali').day();
  } catch (error) {
    return dayjs().calendar('jalali').day();
  }
};

/**
 * Get days in Jalali month
 */
export const getDaysInJalaliMonth = (year: number, month: number): number => {
  try {
    const jalali = dayjs().calendar('jalali').year(year).month(month - 1);
    return jalali.daysInMonth();
  } catch (error) {
    return 30;
  }
};

/**
 * Convert Jalali date string (YYYY-MM-DD format) to Gregorian Date
 */
export const jalaliToGregorian = (jalaliDate: string): Date => {
  try {
    // jalaliDate باید به صورت YYYY-MM-DD باشد (سال شمسی)
    const [year, month, day] = jalaliDate.split('-').map(Number);
    
    // بررسی معتبر بودن مقادیر
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Invalid Jalali date format:', jalaliDate);
      throw new Error('فرمت تاریخ شمسی نامعتبر است');
    }
    
    if (year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('Invalid Jalali date values:', { year, month, day });
      throw new Error('مقادیر تاریخ شمسی نامعتبر است');
    }
    
    // استفاده از روش صحیح jalaliday: ساخت تاریخ شمسی و سپس تبدیل به میلادی
    const jalaliDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const jalaliDayjs = dayjs(jalaliDateStr, { jalali: true });
    
    // بررسی معتبر بودن تاریخ تبدیل شده
    if (!jalaliDayjs.isValid()) {
      console.error('Invalid Jalali date after conversion:', { year, month, day, jalaliDateStr });
      throw new Error('تاریخ شمسی نامعتبر است');
    }
    
    // تبدیل به میلادی
    const gregorianDayjs = jalaliDayjs.calendar('gregory');
    
    // بررسی معتبر بودن تبدیل
    if (!gregorianDayjs.isValid()) {
      console.error('Invalid Gregorian conversion:', { jalali: jalaliDate, jalaliDateStr });
      throw new Error('خطا در تبدیل تاریخ شمسی به میلادی');
    }
    
    // تبدیل به Date object
    const gregorianDate = gregorianDayjs.toDate();
    
    // بررسی اینکه سال میلادی معقول است
    const gregorianYear = gregorianDate.getFullYear();
    if (gregorianYear < 1900 || gregorianYear > 2100) {
      console.error('Invalid Gregorian year conversion:', {
        jalali: jalaliDate,
        jalaliDateStr,
        gregorianYear,
        gregorianDate: gregorianDate.toISOString(),
        gregorianDayjsFormat: gregorianDayjs.format('YYYY-MM-DD')
      });
      throw new Error(`خطا در تبدیل تاریخ شمسی به میلادی: سال ${gregorianYear} نامعتبر است`);
    }
    
    console.log(`Converted Jalali ${jalaliDate} (${jalaliDateStr}) to Gregorian ${gregorianDate.toISOString().split('T')[0]}`);
    return gregorianDate;
  } catch (error) {
    console.error('Error converting Jalali to Gregorian:', error, 'Input:', jalaliDate);
    throw error; // Throw error instead of returning invalid date
  }
};

/**
 * Get first day of Jalali month
 */
export const getFirstDayOfJalaliMonth = (year: number, month: number): Date => {
  try {
    const jalali = dayjs().calendar('jalali').year(year).month(month - 1).date(1);
    return jalali.toDate();
  } catch (error) {
    return new Date();
  }
};

/**
 * Get last day of Jalali month
 */
export const getLastDayOfJalaliMonth = (year: number, month: number): Date => {
  try {
    const daysInMonth = getDaysInJalaliMonth(year, month);
    const jalali = dayjs().calendar('jalali').year(year).month(month - 1).date(daysInMonth);
    return jalali.toDate();
  } catch (error) {
    return new Date();
  }
};

/**
 * Jalali month names
 */
export const jalaliMonthNames = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

/**
 * Jalali week day names (starting from Saturday)
 */
export const jalaliWeekDays = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه'
];

/**
 * Jalali week day names short
 */
export const jalaliWeekDaysShort = [
  'ش',
  'ی',
  'د',
  'س',
  'چ',
  'پ',
  'ج'
];

