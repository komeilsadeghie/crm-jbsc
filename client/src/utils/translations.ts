// ترجمه مقادیر انگلیسی به فارسی

export const translateCustomerType = (type: string): string => {
  const translations: Record<string, string> = {
    individual: 'شخص',
    company: 'شرکت',
    export: 'صادرات',
    import: 'واردات',
    coaching: 'کوچینگ',
  };
  return translations[type] || type;
};

export const translateCustomerStatus = (status: string): string => {
  const translations: Record<string, string> = {
    active: 'فعال',
    inactive: 'غیرفعال',
    lead: 'لید',
    customer: 'مشتری',
    partner: 'شریک',
  };
  return translations[status] || status;
};

export const translateLeadStatus = (status: string): string => {
  const translations: Record<string, string> = {
    new: 'جدید',
    contacted: 'تماس گرفته شده',
    qualified: 'کوالیفای شده',
    disqualified: 'رد شده',
    converted: 'تبدیل شده',
  };
  return translations[status] || status;
};

export const translateContractStatus = (status: string): string => {
  const translations: Record<string, string> = {
    draft: 'پیش‌نویس',
    active: 'فعال',
    expired: 'منقضی شده',
    cancelled: 'لغو شده',
  };
  return translations[status] || status;
};

export const translateDealStage = (stage: string): string => {
  const translations: Record<string, string> = {
    discovery: 'کشف نیاز',
    proposal: 'پروپوزال',
    contract: 'قرارداد',
    design: 'طراحی',
    development: 'توسعه',
    qa: 'تست و QA',
    delivery: 'تحویل',
    support: 'پشتیبانی',
  };
  return translations[stage] || stage;
};

export const translateTaskStatus = (status: string): string => {
  const translations: Record<string, string> = {
    todo: 'انجام نشده',
    in_progress: 'در حال انجام',
    done: 'انجام شده',
  };
  return translations[status] || status;
};

export const translateTicketStatus = (status: string): string => {
  const translations: Record<string, string> = {
    open: 'باز',
    pending: 'در انتظار',
    resolved: 'حل شده',
    closed: 'بسته',
  };
  return translations[status] || status;
};

export const translatePriority = (priority: string): string => {
  const translations: Record<string, string> = {
    low: 'پایین',
    medium: 'متوسط',
    high: 'بالا',
    urgent: 'فوری',
  };
  return translations[priority] || priority;
};

export const translateSource = (source: string): string => {
  const translations: Record<string, string> = {
    website: 'وب‌سایت',
    social: 'شبکه‌های اجتماعی',
    referral: 'معرفی',
    advertising: 'تبلیغات',
    other: 'سایر',
  };
  return translations[source] || source;
};

export const translateCurrency = (currency: string): string => {
  const translations: Record<string, string> = {
    IRR: 'ریال',
    USD: 'دلار',
    EUR: 'یورو',
  };
  return translations[currency] || currency;
};

export const translateUserRole = (role: string): string => {
  const translations: Record<string, string> = {
    admin: 'مدیر سیستم',
    sales: 'فروش',
    sales_manager: 'مدیر فروش',
    coach: 'کوچ',
    media: 'مدیا',
    finance: 'مالی',
    user: 'کاربر',
  };
  return translations[role] || role;
};

