/**
 * Contract Template Configuration
 * This file contains the configurable template structure for contracts
 * All text content can be customized here
 */

export interface ContractTemplateConfig {
  // Header
  header: {
    companyName: string;
    companyLogo?: string;
    phone: string;
    address: string;
  };

  // Contract Title
  title: {
    main: string; // e.g., "قرارداد طراحی سایت"
    subtitle?: string;
  };

  // Article 1 - Contract Title
  article1: {
    title: string;
    content: (data: ContractTemplateData) => string;
  };

  // Article 2 - Contract Subject
  article2: {
    title: string;
    packageName?: string;
    projectTitle?: string;
    items: (data: ContractTemplateData) => string[];
  };

  // Article 3 - Contract Duration
  article3: {
    title: string;
    executionDays: number;
    validityMonths: number;
    content: (data: ContractTemplateData) => string;
  };

  // Article 4 - Contractor Obligations
  article4: {
    title: string;
    obligations: string[];
  };

  // Article 5 - Client Obligations
  article5: {
    title: string;
    obligations: string[];
  };

  // Article 6 - Contract Amount
  article6: {
    title: string;
    content: (data: ContractTemplateData) => string;
  };

  // Article 7 - Dispute Resolution
  article7: {
    title: string;
    content: string;
  };

  // Article 8 - Contract Termination
  article8: {
    title: string;
    terminationCompensation: string;
    content: string;
  };

  // Article 9 - Support
  article9: {
    title: string;
    supportMonths: number;
    content: (data: ContractTemplateData) => string;
  };

  // Signatures
  signatures: {
    contractor: {
      label: string;
      name: string;
    };
    client: {
      label: string;
      name: (data: ContractTemplateData) => string;
    };
  };

  // Footer
  footer: {
    phone: string;
    address: string;
  };
}

export interface ContractTemplateData {
  contractNumber: string;
  contractDate: string;
  clientName: string;
  clientNationalId?: string;
  contractorName: string;
  contractType?: string;
  packageName?: string;
  projectTitle?: string;
  totalAmount: number;
  currency: string;
  firstPayment?: number;
  remainingPayments?: number[];
  paymentTerms?: string;
  executionDays?: number;
  validityMonths?: number;
  supportMonths?: number;
  deliveryDays?: number;
  websiteLanguages?: string;
  domainName?: string;
  hostingType?: string;
  sslCertificate?: boolean;
  seoPackage?: string;
  websitePages?: number;
  warrantyMonths?: number;
  [key: string]: any; // Allow additional custom fields
}

/**
 * Default contract template configuration
 * This can be customized or loaded from database/settings
 */
export const defaultContractTemplate: ContractTemplateConfig = {
  header: {
    companyName: 'BEHET',
    phone: '۰۲۱۹۱۰۹۰۰۰۵',
    address: 'تهران، بزرگراه مدرس، الهیه، خیابان بیدار، برج جم، پلاک ۵ واحد ۲',
  },

  title: {
    main: 'قرارداد طراحی سایت',
  },

  article1: {
    title: 'ماده اول - عنوان تنظیم قرارداد طراحی سایت',
    content: (data) => {
      const date = data.contractDate || 'تاریخ قرارداد';
      const clientName = data.clientName || 'کارفرما';
      const clientId = data.clientNationalId ? `با کد ملی ${data.clientNationalId}` : '';
      const contractorName = data.contractorName || 'تیم واحد مدیا (بهت)';
      
      return `در تاریخ ${date} قرارداد طراحی سایت ${data.projectTitle || 'طراحی وب‌سایت'} بین ${clientName} ${clientId} (که در این قرارداد کارفرما نامیده می‌شود) و ${contractorName} (که در این قرارداد مجری نامیده می‌شود) منعقد گردید. طرفین متعهد به اجرای مفاد این قرارداد می‌باشند.`;
    },
  },

  article2: {
    title: 'ماده دوم - موضوع تنظیم قرارداد',
    packageName: 'پکیج پلن پلاتینیوم',
    projectTitle: 'سایت فروشگاهی پیشرفته واردات قطعات الکترونیک',
    items: (data) => {
      const items = [
        'طراحی صفحه اصلی مطابق با هویت سازمانی و تجارت بین‌الملل',
        'طراحی صفحات درباره ما، تماس با ما و همکاری با ما جهت اخذ نمایندگی',
        'طراحی صفحات بلاگ و FAQ (سوالات متداول)',
        `طراحی صفحات تخصصی محصول (آنالیز محصول و درخواست محصول) - ده (۱۰) محصول به عنوان نمونه بارگذاری می‌شود مابقی به عهده کارفرما می‌باشد. لذا آموزش‌های لازمه برای کارفرما ارسال خواهد شد.`,
        'طراحی فرم پاپ آپ مشاوره و درخواست پشتیبانی (CTA)',
        'ایجاد ۶ مقاله سئو شده',
        `${data.supportMonths || 6} ماه پشتیبانی از زمان تحویل پروژه (پشتیبانی فنی مشکلات سایت، سایر موارد جداگانه می‌باشد)`,
        `${data.websiteLanguages || '۲ زبان اضافه + ۱ زبان انگلیسی پیش‌فرض'}`,
      ];

      // Add custom items if provided
      if (data.customItems && Array.isArray(data.customItems)) {
        items.push(...data.customItems);
      }

      return items;
    },
  },

  article3: {
    title: 'ماده سوم - مدت انجام قرارداد',
    executionDays: 20,
    validityMonths: 6,
    content: (data) => {
      const days = data.executionDays || 20;
      const months = data.validityMonths || 6;
      return `مدت زمان اولیه اجرا و تحویل پروژه ${days} روز کاری از تاریخ شروع می‌باشد، مشروط بر اینکه محتوای لازمه توسط کارفرما تامین شده باشد. تاریخ شروع پروژه منوط به پرداخت اولیه کارفرما می‌باشد.\n\nاعتبار این قرارداد ${months} ماه از تاریخ امضا می‌باشد. در صورت عدم تامین محتوای لازمه و شروع پروژه توسط کارفرما در این مدت و در صورت افزایش قیمت خدمات طراحی، کارفرما موظف به پرداخت مابه‌التفاوت بر اساس مبلغ کل قرارداد می‌باشد.`;
    },
  },

  article4: {
    title: 'ماده چهارم - تعهدات مجری',
    obligations: [
      'انجام کلیه فعالیت‌های طراحی مربوط به موضوع قرارداد و پذیرش مسئولیت کیفیت و کمیت و اجرای به موقع پروژه',
      'حفظ امانت و نگهداری اموال و اسناد ارائه شده توسط کارفرما و استفاده بهینه از آن‌ها برای موضوع قرارداد',
      'مجری حق ارائه اسناد، اطلاعات و داده‌های در اختیار خود را به اشخاص حقیقی یا حقوقی دیگر ندارد',
      'آدرس سایت به صورت مستقیم توسط کارفرما انتخاب می‌شود و پس از تایید قابل ویرایش نیست',
      'مجری در خصوص دامنه‌های مشابه یا دامنه‌های از قبل رزرو شده توسط دیگران تعهدی ندارد',
      'مجری موظف است لیست محتوا و اطلاعات درخواستی را برای کارفرما تهیه و ارائه نماید',
      'مجری موظف است هاستینگی را انتخاب نماید که دارای تاییدیه‌های لازمه و فایروال برای جلوگیری از نفوذ و مشکلات امنیتی باشد',
      'طراحی اولیه سایت باید به صورت پیش‌نمایش توسط کارفرما تایید شود و سپس آپلود نهایی انجام شود',
      'پس از اتمام پروژه و پرداخت کامل مبلغ قرارداد توسط کارفرما، مجری موظف است کلیه اطلاعات لاگین سایت و پنل مدیریت هاست/دامنه را به کارفرما ارائه نماید',
    ],
  },

  article5: {
    title: 'ماده پنجم - تعهدات کارفرما',
    obligations: [
      'ارائه اسناد لازمه برای طراحی سایت به طراح و پرداخت مبلغ قرارداد',
      'کارفرما حق انتقال حقوق طراحی سایت در حین اجرا و پشتیبانی به دیگران را ندارد',
      'کلیه محتوای سایت، مسائل حقوقی و مالی مربوط به فروش کالا در سایت، تماما بر عهده کارفرما می‌باشد',
      'کارفرما متعهد به رعایت کلیه قوانین کسب و کار اینترنتی می‌باشد',
      'کلیه مسئولیت‌های مربوط به روش فروش، قیمت‌گذاری و غیره بر عهده کارفرما می‌باشد',
    ],
  },

  article6: {
    title: 'ماده ششم - مبلغ قرارداد',
    content: (data) => {
      const total = data.totalAmount || 0;
      const currency = data.currency === 'IRR' ? 'تومان' : data.currency === 'USD' ? 'دلار' : 'ریال';
      const firstPayment = data.firstPayment || Math.round(total * 0.33);
      const remaining = total - firstPayment;
      const installments = data.remainingPayments || [Math.round(remaining / 2), Math.round(remaining / 2)];
      
      return `مبلغ کل این قرارداد ${total.toLocaleString('fa-IR')} ${currency} برای طراحی و پیاده‌سازی سایت ${data.websiteLanguages || 'سه‌زبانه (فارسی و انگلیسی)'} مطابق با ویژگی‌ها و تعهدات ذکر شده در قرارداد می‌باشد.\n\nمبلغ قرارداد به صورت ${data.paymentTerms || 'سه قسط'} پرداخت می‌شود. قسط اول همزمان با امضای قرارداد و با تخفیف ${firstPayment.toLocaleString('fa-IR')} ${currency} می‌باشد. مابقی مبلغ قرارداد به مبلغ ${remaining.toLocaleString('fa-IR')} ${currency} به صورت ${installments.length} قسط مساوی، هر کدام ${installments[0].toLocaleString('fa-IR')} ${currency}، پس از اتمام طراحی و تحویل نهایی سایت پرداخت می‌شود.`;
    },
  },

  article7: {
    title: 'ماده هفتم - حل اختلاف',
    content: 'در صورت بروز هرگونه اختلاف بین طرفین، ابتدا سعی در حل و فصل دوستانه خواهد شد. در صورت عدم توافق، اختلاف از طریق داوری در تهران حل و فصل خواهد شد. داوری به زبان فارسی انجام می‌شود و رای داور قطعی و لازم الاجرا می‌باشد.',
  },

  article8: {
    title: 'ماده هشتم - فسخ قرارداد',
    terminationCompensation: '۵۰,۰۰۰,۰۰۰',
    content: 'فسخ یک‌طرفه قرارداد بدون علت موجه قابل قبول نیست و طرف فسخ‌کننده موظف به پرداخت مبلغ ۵۰,۰۰۰,۰۰۰ ریال به عنوان خسارت هزینه‌های اولیه می‌باشد. در صورت بروز حوادث غیرمترقبه (فورس ماژور) مانند بلایای طبیعی، جنگ، تحریم، اعتصاب، قطعی عمده اینترنت و برق، یا پاندمی، در صورت تداوم بیش از ۶۰ روز، هر یک از طرفین می‌تواند قرارداد را فسخ نماید و تعهدات تا تاریخ فسخ باید تسویه شود.',
  },

  article9: {
    title: 'ماده نهم - پشتیبانی',
    supportMonths: 6,
    content: (data) => {
      const months = data.supportMonths || 6;
      return `سایت طراحی شده دارای ${months} ماه پشتیبانی از طرف مجری می‌باشد. پس از این مدت، قرارداد جدیدی برای خدمات مدیریت و پشتیبانی سایت باید با مجری منعقد شود.`;
    },
  },

  signatures: {
    contractor: {
      label: 'امضاء مجری',
      name: 'صابر سلیمانی',
    },
    client: {
      label: 'امضاء کارفرما',
      name: (data) => data.clientName || 'کارفرما',
    },
  },

  footer: {
    phone: '۰۲۱۹۱۰۹۰۰۰۵',
    address: 'تهران، بزرگراه مدرس، الهیه، خیابان بیدار، برج جم، پلاک ۵ واحد ۲',
  },
};

