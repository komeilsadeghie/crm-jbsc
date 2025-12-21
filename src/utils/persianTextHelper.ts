/**
 * Helper functions for Persian/Arabic text processing in PDF
 * Handles RTL text direction and character shaping
 */

// Try to import the libraries, but handle gracefully if not available
let ArabicPersianReshaper: any;
let bidi: any;

try {
  ArabicPersianReshaper = require('arabic-persian-reshaper');
  bidi = require('bidi-js');
} catch (error) {
  console.warn('Persian text processing libraries not available. Install: npm install arabic-persian-reshaper bidi-js');
}

/**
 * Process Persian/Arabic text for proper display in PDF
 * Applies character reshaping and RTL direction
 */
export function processPersianText(text: string): string {
  if (!text) return '';
  
  // If libraries are not available, return text as-is
  if (!ArabicPersianReshaper || !bidi) {
    return text;
  }

  try {
    // Reshape Arabic/Persian characters
    const reshaped = ArabicPersianReshaper.reshape(text);
    // Apply bidirectional text algorithm
    const bidiResult = bidi.fromString(reshaped);
    return bidiResult.toString();
  } catch (error) {
    console.error('Error processing Persian text:', error);
    return text; // Fallback to original text
  }
}

/**
 * Check if text contains Persian/Arabic characters
 */
export function containsPersian(text: string): boolean {
  if (!text) return false;
  // Persian/Arabic Unicode range
  const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return persianRegex.test(text);
}

/**
 * Process text - apply Persian processing if needed, otherwise return as-is
 */
export function processText(text: string): string {
  if (!text) return '';
  if (containsPersian(text)) {
    return processPersianText(text);
  }
  return text;
}

/**
 * Format number in Persian digits
 */
export function formatPersianNumber(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let str = num.toString();
  for (let i = 0; i < englishDigits.length; i++) {
    str = str.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i]);
  }
  return str;
}

