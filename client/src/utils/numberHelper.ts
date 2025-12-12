/**
 * Utility functions for number formatting and Persian number conversion
 */

/**
 * Converts numbers to Persian digits
 * @param num - The number or string to convert
 * @param options - Optional formatting options
 * @returns String with Persian digits
 */
export const toPersianNumber = (
  num: string | number,
  options?: { decimals?: number }
): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  if (num === null || num === undefined) {
    return '';
  }
  
  let numStr = String(num);
  
  // Handle decimal numbers
  if (options?.decimals !== undefined) {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (!isNaN(numValue)) {
      numStr = numValue.toFixed(options.decimals);
    }
  }
  
  // Replace all digits with Persian digits
  return numStr.replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
};

/**
 * Formats a number with locale-specific formatting
 * @param num - The number to format
 * @param locale - The locale to use (default: 'fa-IR')
 * @returns Formatted number string
 */
export const formatNumber = (
  num: number | string,
  locale: string = 'fa-IR'
): string => {
  if (typeof num === 'string') {
    num = parseFloat(num);
  }
  
  if (isNaN(num)) {
    return '';
  }
  
  return num.toLocaleString(locale);
};

/**
 * Combines formatting and Persian conversion
 * @param num - The number to format
 * @param options - Optional formatting options
 * @returns Formatted Persian number string
 */
export const formatPersianNumber = (
  num: number | string,
  options?: { decimals?: number; locale?: string }
): string => {
  if (typeof num === 'string') {
    num = parseFloat(num);
  }
  
  if (isNaN(num)) {
    return '';
  }
  
  const locale = options?.locale || 'fa-IR';
  let formatted = num.toLocaleString(locale);
  
  if (options?.decimals !== undefined) {
    formatted = num.toFixed(options.decimals).toLocaleString(locale);
  }
  
  // Convert to Persian digits
  return toPersianNumber(formatted);
};




