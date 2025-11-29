import dayjs from 'dayjs';
import JalaliDay from 'jalaliday';

// Extend dayjs with jalali plugin
dayjs.extend(JalaliDay);

export const toJalali = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = dayjs(date);
    return d.format('jYYYY/jMM/jDD');
  } catch (error) {
    return '-';
  }
};

export const toJalaliDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = dayjs(date);
    return d.format('jYYYY/jMM/jDD HH:mm');
  } catch (error) {
    return '-';
  }
};

