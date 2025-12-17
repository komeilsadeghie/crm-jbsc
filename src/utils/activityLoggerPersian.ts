/**
 * Helper functions for generating Persian descriptions for activity logs
 */

export const getPersianActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    create: 'ایجاد',
    update: 'ویرایش',
    delete: 'حذف',
    send: 'ارسال',
    accept: 'قبول',
    decline: 'رد',
    assign: 'اختصاص',
    unassign: 'حذف اختصاص',
    follow: 'دنبال کردن',
    unfollow: 'لغو دنبال کردن',
    comment: 'نظر',
    upload_attachment: 'آپلود ضمیمه',
    delete_attachment: 'حذف ضمیمه',
    generate: 'تولید',
    refund: 'بازگشت وجه',
    view: 'مشاهده',
    login: 'ورود',
    logout: 'خروج',
    export: 'خروجی',
    import: 'واردات',
    approve: 'تایید',
    reject: 'رد کردن',
    complete: 'تکمیل',
    cancel: 'لغو',
    renew: 'تمدید',
    archive: 'بایگانی',
    restore: 'بازیابی',
  };
  return labels[action] || action;
};

export const getPersianEntityLabel = (entityType: string): string => {
  const labels: Record<string, string> = {
    invoice: 'فاکتور',
    estimate: 'پیش‌فاکتور',
    proposal: 'پروپوزال',
    task: 'تسک',
    contract: 'قرارداد',
    ticket: 'تیکت',
    account: 'حساب',
    contact: 'مخاطب',
    deal: 'معامله',
    project: 'پروژه',
    payment_gateway: 'درگاه پرداخت',
    payment_transaction: 'تراکنش پرداخت',
    recurring_invoice: 'فاکتور تکراری',
    survey: 'نظرسنجی',
    user: 'کاربر',
    lead: 'سرنخ',
    customer: 'مشتری',
    expense: 'هزینه',
    calendar_event: 'رویداد تقویم',
    knowledge_base: 'پایگاه دانش',
    email_template: 'قالب ایمیل',
    coaching_session: 'جلسه کوچینگ',
  };
  return labels[entityType] || entityType;
};

/**
 * Generate Persian description for activity log
 */
export const generatePersianDescription = (
  action: string,
  entityType: string,
  entityTitle?: string,
  additionalInfo?: Record<string, any>
): string => {
  const actionLabel = getPersianActionLabel(action);
  const entityLabel = getPersianEntityLabel(entityType);
  
  let description = `${actionLabel} ${entityLabel}`;
  
  if (entityTitle) {
    description += ` "${entityTitle}"`;
  }
  
  if (additionalInfo) {
    const infoParts: string[] = [];
    
    if (additionalInfo.status) {
      const statusLabels: Record<string, string> = {
        todo: 'در انتظار',
        in_progress: 'در حال انجام',
        done: 'انجام شده',
        review: 'در حال بررسی',
        open: 'باز',
        closed: 'بسته',
        draft: 'پیش‌نویس',
        active: 'فعال',
        expired: 'منقضی شده',
        cancelled: 'لغو شده',
      };
      infoParts.push(`وضعیت: ${statusLabels[additionalInfo.status] || additionalInfo.status}`);
    }
    
    if (additionalInfo.amount) {
      infoParts.push(`مبلغ: ${additionalInfo.amount.toLocaleString('fa-IR')} ریال`);
    }
    
    if (additionalInfo.assignedTo) {
      infoParts.push(`اختصاص داده شده به: ${additionalInfo.assignedTo}`);
    }
    
    if (additionalInfo.priority) {
      const priorityLabels: Record<string, string> = {
        low: 'پایین',
        medium: 'متوسط',
        high: 'بالا',
      };
      infoParts.push(`اولویت: ${priorityLabels[additionalInfo.priority] || additionalInfo.priority}`);
    }
    
    if (infoParts.length > 0) {
      description += ` (${infoParts.join('، ')})`;
    }
  }
  
  return description;
};

