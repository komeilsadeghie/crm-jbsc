/**
 * Helper functions for handling mutation responses
 * Fixes the issue where mutations succeed but show errors
 */

/**
 * Check if a response is successful based on status code
 */
export function isSuccessfulResponse(response: any): boolean {
  if (!response) return false;
  
  const status = response?.status || response?.response?.status;
  
  // Status codes 200-299 are successful
  if (status && status >= 200 && status < 300) {
    return true;
  }
  
  // If no status but response exists, assume success (axios handles this)
  if (response && !status) {
    return true;
  }
  
  return false;
}

/**
 * Check if response has an error message (even with success status)
 * فقط اگر error وجود داشته باشد و هیچ نشانه‌ای از موفقیت نباشد
 */
export function hasResponseError(response: any): boolean {
  if (!response) return false;
  
  // اگر status code >= 400 است، خطا است
  const status = response?.status || response?.response?.status;
  if (status && status >= 400) {
    return true;
  }
  
  // اگر status 200-299 است ولی response.data.error وجود دارد
  // و هیچ نشانه‌ای از موفقیت (message, id, project_id) وجود ندارد
  if (status && status >= 200 && status < 300) {
    const hasError = response?.data?.error && 
                     !response?.data?.message && 
                     !response?.data?.project_id &&
                     !response?.data?.id &&
                     !response?.data?.success;
    
    return hasError;
  }
  
  return false;
}

/**
 * Get error message from response or error object
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'خطای نامشخص';
  
  // Check response.data.error first
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Check response.data.message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Check error.message
  if (error.message) {
    return error.message;
  }
  
  return 'خطای نامشخص';
}

/**
 * Get success message from response
 */
export function getSuccessMessage(response: any, defaultMessage: string = 'عملیات با موفقیت انجام شد'): string {
  if (!response) return defaultMessage;
  
  return response?.data?.message || defaultMessage;
}

