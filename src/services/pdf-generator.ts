import PDFDocument from 'pdfkit';
import { db } from '../database/db';
import { toJalali, toJalaliDateTime } from '../utils/dateHelper';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { processText, processPersianText } from '../utils/persianTextHelper';
import { defaultContractTemplate, ContractTemplateConfig, ContractTemplateData } from '../config/contractTemplate';
import * as fs from 'fs';
import * as path from 'path';

interface EstimateData {
  id: number;
  estimate_number: string;
  account_name?: string;
  amount: number;
  currency: string;
  status: string;
  valid_until?: string;
  notes?: string;
  contract_type?: string;
  domain_name?: string;
  hosting_type?: string;
  ssl_included?: number;
  created_at: string;
  items?: any[];
}

interface ContractData {
  id: number;
  contract_number: string;
  title: string;
  description?: string;
  account_name?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  value?: number;
  currency: string;
  status: string;
  auto_renew?: number;
  renewal_notice_days?: number;
  signed_date?: string;
  signed_by?: string;
  created_at: string;
  // Contract/Website details
  domain_name?: string;
  hosting_type?: string;
  hosting_duration?: number;
  ssl_certificate?: number;
  support_duration?: number;
  seo_package?: string;
  website_pages?: number;
  website_languages?: string;
  payment_terms?: string;
  delivery_days?: number;
  warranty_months?: number;
  project_id?: number;
}

// Helper function to format numbers in Persian
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fa-IR').format(num);
};

// Helper function to format currency
const formatCurrency = (amount: number, currency: string): string => {
  const formatted = formatNumber(amount);
  const currencyNames: Record<string, string> = {
    'IRR': 'ریال',
    'USD': 'دلار',
    'EUR': 'یورو'
  };
  return `${formatted} ${currencyNames[currency] || currency}`;
};

// Generate Estimate PDF with Persian support
export const generateEstimatePDF = (estimate: EstimateData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `پیش‌فاکتور ${estimate.estimate_number}`,
          Author: 'CRM هوشمند',
          Subject: 'پیش‌فاکتور'
        }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Get company settings
      db.all('SELECT * FROM settings WHERE key IN ("company_name", "company_domain")', [], (err, settings: any) => {
        if (err) {
          return reject(err);
        }
        
        const companyName = settings?.find((s: any) => s.key === 'company_name')?.value || 'CRM هوشمند';
        
        // Header with border
        doc.rect(50, 50, 495, 80).stroke();
        doc.fontSize(20).fillColor('black');
        doc.text('پیش‌فاکتور', 480, 60, { align: 'right', width: 100 });
        doc.fontSize(10).fillColor('gray');
        doc.text(companyName, 480, 85, { align: 'right', width: 100 });
        doc.fontSize(12).fillColor('black');
        
        // Estimate Info Box
        const infoBoxY = 140;
        doc.rect(50, infoBoxY, 240, 60).stroke();
        doc.fontSize(10).text('اطلاعات پیش‌فاکتور', 55, infoBoxY + 5, { align: 'right' });
        doc.fontSize(9);
        doc.text(`شماره: ${estimate.estimate_number}`, 55, infoBoxY + 20, { align: 'right' });
        doc.text(`تاریخ: ${toJalali(estimate.created_at)}`, 55, infoBoxY + 35, { align: 'right' });
        if (estimate.valid_until) {
          doc.text(`اعتبار تا: ${toJalali(estimate.valid_until)}`, 55, infoBoxY + 50, { align: 'right' });
        }

        // Customer Info Box
        doc.rect(300, infoBoxY, 245, 60).stroke();
        doc.fontSize(10).text('مشتری', 305, infoBoxY + 5, { align: 'right' });
        doc.fontSize(9);
        doc.text(estimate.account_name || '-', 305, infoBoxY + 20, { align: 'right', width: 240 });
        
        doc.y = infoBoxY + 70;

        // Contract/Site Details
        if (estimate.contract_type || estimate.domain_name) {
        doc.fontSize(14).text('جزئیات قرارداد/سایت:', { align: 'right' });
        doc.fontSize(12);
        
        if (estimate.contract_type) {
          const contractTypes: Record<string, string> = {
            website: 'طراحی وب‌سایت',
            hosting: 'هاستینگ',
            domain: 'دامنه',
            ssl: 'گواهینامه SSL',
            maintenance: 'پشتیبانی و نگهداری',
            seo: 'بهینه‌سازی موتور جستجو',
            other: 'سایر'
          };
          doc.text(`نوع قرارداد: ${contractTypes[estimate.contract_type] || estimate.contract_type}`, { align: 'right' });
        }
        
        if (estimate.domain_name) {
          doc.text(`نام دامنه: ${estimate.domain_name}`, { align: 'right' });
        }
        
        if (estimate.hosting_type) {
          doc.text(`نوع هاستینگ: ${estimate.hosting_type}`, { align: 'right' });
        }
        
        if (estimate.ssl_included) {
          doc.text('گواهینامه SSL: شامل', { align: 'right' });
        }
        
        doc.moveDown();
      }

        // Items Table
        if (estimate.items && estimate.items.length > 0) {
          doc.moveDown(1);
          const tableTop = doc.y;
          const itemHeight = 25;
          const colWidths = { name: 250, qty: 70, price: 90, total: 95 };
          const startX = 50;
          const endX = 545;
          const headerHeight = 20;

          // Table Header with background
          doc.rect(startX, tableTop, endX - startX, headerHeight).fillAndStroke('#f0f0f0', 'black');
          doc.fontSize(10).fillColor('black');
          doc.text('جمع', startX + colWidths.name + colWidths.qty + colWidths.price, tableTop + 5, { width: colWidths.total, align: 'right' });
          doc.text('قیمت واحد', startX + colWidths.name + colWidths.qty, tableTop + 5, { width: colWidths.price, align: 'right' });
          doc.text('تعداد', startX + colWidths.name, tableTop + 5, { width: colWidths.qty, align: 'right' });
          doc.text('نام آیتم', startX, tableTop + 5, { width: colWidths.name, align: 'right' });

          // Table Rows
          let currentY = tableTop + headerHeight;
          doc.fontSize(9);
          
          estimate.items.forEach((item: any, index: number) => {
            // Alternate row colors
            if (index % 2 === 0) {
              doc.rect(startX, currentY, endX - startX, itemHeight).fill('#fafafa');
            }
            
            // Draw borders
            doc.rect(startX, currentY, endX - startX, itemHeight).stroke();
            
            doc.fillColor('black');
            doc.text(item.item_name || '-', startX + 5, currentY + 8, { width: colWidths.name - 10, align: 'right' });
            doc.text((item.quantity || 1).toString(), startX + colWidths.name + 5, currentY + 8, { width: colWidths.qty - 10, align: 'right' });
            doc.text(formatNumber(item.unit_price || 0), startX + colWidths.name + colWidths.qty + 5, currentY + 8, { width: colWidths.price - 10, align: 'right' });
            doc.text(formatNumber(item.total_amount || 0), startX + colWidths.name + colWidths.qty + colWidths.price + 5, currentY + 8, { width: colWidths.total - 10, align: 'right' });
            currentY += itemHeight;
          });

          doc.y = currentY + 10;
        }

        // Total Box
        const totalBoxY = doc.y;
        const totalBoxWidth = 200;
        const totalBoxX = 545 - totalBoxWidth;
        doc.rect(totalBoxX, totalBoxY, totalBoxWidth, 30).fillAndStroke('#e8f4f8', 'black');
        doc.fontSize(12).fillColor('black');
        doc.text(`جمع کل: ${formatCurrency(estimate.amount, estimate.currency)}`, totalBoxX + 5, totalBoxY + 8, { align: 'right', width: totalBoxWidth - 10 });

        // Notes Box
        if (estimate.notes) {
          doc.y = totalBoxY + 40;
          const notesBoxY = doc.y;
          doc.rect(50, notesBoxY, 495, 60).stroke();
          doc.fontSize(11).fillColor('black');
          doc.text('یادداشت:', 55, notesBoxY + 5, { align: 'right' });
          doc.fontSize(9);
          // Split notes into lines if too long
          const notesLines = estimate.notes.split('\n');
          let notesY = notesBoxY + 20;
          notesLines.forEach((line: string) => {
            if (line.trim()) {
              doc.text(line.trim(), 55, notesY, { align: 'right', width: 485 });
              notesY += 12;
            }
          });
        }

        // Footer
        const footerY = doc.page.height - 40;
        doc.fontSize(8).fillColor('gray');
        doc.text('این پیش‌فاکتور به صورت خودکار تولید شده است.', 50, footerY, { align: 'center', width: 495 });
        doc.text(`تولید شده در: ${toJalaliDateTime(new Date().toISOString())}`, 50, footerY + 12, { align: 'center', width: 495 });

        doc.end();
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Global flag to track if Persian font is available
let persianFontAvailable = false;
let persianFontPath: string | null = null;

/**
 * Register Persian font if available
 * Place your Persian font file (e.g., Vazirmatn-Regular.ttf) in the fonts directory
 */
const registerPersianFont = (doc: PDFDocument): boolean => {
  // Check if we already found the font
  if (persianFontAvailable && persianFontPath) {
    try {
      doc.registerFont('persian', persianFontPath);
      return true;
    } catch (error) {
      // Font path might have changed, reset and search again
      persianFontAvailable = false;
      persianFontPath = null;
    }
  }

  const fontPaths = [
    path.join(process.cwd(), 'fonts/Vazirmatn-Regular.ttf'), // First check root fonts folder
    path.join(__dirname, '../../fonts/Vazirmatn-Regular.ttf'), // Then check relative to dist
    path.join(__dirname, '../fonts/Vazirmatn-Regular.ttf'), // Then check relative to src
    path.join(process.cwd(), 'src/fonts/Vazirmatn-Regular.ttf'),
    path.join(process.cwd(), 'dist/fonts/Vazirmatn-Regular.ttf'),
  ];

  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      try {
        doc.registerFont('persian', fontPath);
        persianFontAvailable = true;
        persianFontPath = fontPath;
        console.log('✅ Persian font registered successfully from:', fontPath);
        return true;
      } catch (error) {
        console.warn('Failed to register Persian font from', fontPath, ':', error);
      }
    }
  }

  if (!persianFontAvailable) {
    console.warn('❌ Persian font not found. Please add a Persian font (e.g., Vazirmatn-Regular.ttf) to the fonts directory.');
    console.warn('Searched paths:', fontPaths);
  }
  return false;
};

/**
 * Helper function to add text with proper RTL and Persian support
 */
const addText = (doc: PDFDocument, text: string, x: number, y: number, options: any = {}) => {
  // Process Persian text FIRST (before setting font)
  const processedText = processText(text);
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width;
  const usableWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
  
  const textOptions = {
    width: options.width || usableWidth,
    align: options.align || 'right',
    ...options,
  };

  // Use Persian font if available, otherwise use default
  // IMPORTANT: Set font BEFORE calling text()
  if (persianFontAvailable) {
    try {
      doc.font('persian');
    } catch (error) {
      console.warn('Failed to use Persian font, falling back to Helvetica:', error);
      doc.font('Helvetica');
    }
  } else {
    doc.font('Helvetica');
  }

  // Add the processed text
  doc.text(processedText, x, y, textOptions);
};

/**
 * Helper function to add multiline text with proper wrapping
 */
const addMultilineText = (doc: PDFDocument, text: string, x: number, y: number, options: any = {}) => {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width;
  const usableWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
  
  const lines = text.split('\n');
  let currentY = y;
  
  lines.forEach((line) => {
    if (line.trim()) {
      addText(doc, line.trim(), x, currentY, {
        width: options.width || usableWidth,
        align: options.align || 'right',
        ...options,
      });
      currentY += (options.lineHeight || 15);
    }
  });
  
  return currentY;
};

/**
 * Get company settings from database
 */
const getCompanySettings = (): Promise<Record<string, string>> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings WHERE key IN ("company_name", "company_phone", "company_address")', [], (err, settings: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      const settingsObj: Record<string, string> = {};
      settings.forEach((s: any) => {
        settingsObj[s.key] = s.value || '';
      });
      
      resolve(settingsObj);
    });
  });
};

// Generate Contract PDF with full Persian support and contract template
export const generateContractPDF = (contract: ContractData, templateConfig?: ContractTemplateConfig): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `قرارداد ${contract.contract_number}`,
          Author: 'CRM هوشمند',
          Subject: 'قرارداد',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Register Persian font
      const hasPersianFont = registerPersianFont(doc);
      if (!hasPersianFont) {
        doc.font('Helvetica'); // Fallback to default font
      }

      // Get company settings
      let companySettings: Record<string, string> = {};
      try {
        companySettings = await getCompanySettings();
      } catch (error) {
        console.warn('Could not fetch company settings:', error);
      }

      // Use provided template or default
      const template = templateConfig || defaultContractTemplate;
      
      // Update template with company settings if available
      if (companySettings.company_name) {
        template.header.companyName = companySettings.company_name;
      }
      if (companySettings.company_phone) {
        template.header.phone = companySettings.company_phone;
        template.footer.phone = companySettings.company_phone;
      }
      if (companySettings.company_address) {
        template.header.address = companySettings.company_address;
        template.footer.address = companySettings.company_address;
      }

      // Prepare contract data
      const contractData: ContractTemplateData = {
        contractNumber: contract.contract_number,
        contractDate: contract.start_date ? toJalali(contract.start_date) : toJalali(contract.created_at),
        clientName: contract.account_name || 'کارفرما',
        contractorName: template.signatures.contractor.name,
        contractType: contract.contract_type,
        packageName: template.article2.packageName,
        projectTitle: contract.title || template.article2.projectTitle,
        totalAmount: contract.value || 0,
        currency: contract.currency || 'IRR',
        paymentTerms: contract.payment_terms,
        executionDays: contract.delivery_days || template.article3.executionDays,
        validityMonths: template.article3.validityMonths,
        supportMonths: contract.support_duration || template.article9.supportMonths,
        deliveryDays: contract.delivery_days,
        websiteLanguages: contract.website_languages,
        domainName: contract.domain_name,
        hostingType: contract.hosting_type,
        sslCertificate: contract.ssl_certificate === 1,
        seoPackage: contract.seo_package,
        websitePages: contract.website_pages,
        warrantyMonths: contract.warranty_months,
      };

      // Calculate payment installments
      if (contract.value) {
        const firstPayment = Math.round(contract.value * 0.33);
        const remaining = contract.value - firstPayment;
        contractData.firstPayment = firstPayment;
        contractData.remainingPayments = [Math.round(remaining / 2), Math.round(remaining / 2)];
      }

      const margin = doc.page.margins.left;
      const pageWidth = doc.page.width;
      const usableWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
      let currentY = 30;

      // ========== OFFICIAL HEADER ==========
      // Top border line
      doc.strokeColor('black').lineWidth(1);
      doc.moveTo(margin, currentY).lineTo(pageWidth - doc.page.margins.right, currentY).stroke();
      currentY += 15;

      // Company name - Large and prominent
      doc.fontSize(20).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      const companyNameText = processText(template.header.companyName);
      const companyNameWidth = doc.widthOfString(companyNameText);
      addText(doc, template.header.companyName, (pageWidth - companyNameWidth) / 2, currentY, { align: 'left' });
      currentY += 25;

      // Contact information box
      doc.fontSize(10).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      
      // Phone and address in a structured format
      const contactInfoY = currentY;
      addText(doc, `تلفن: ${template.header.phone}`, margin, contactInfoY, { width: usableWidth / 2, align: 'right' });
      addText(doc, `آدرس: ${template.header.address}`, margin + usableWidth / 2, contactInfoY, { width: usableWidth / 2, align: 'right' });
      currentY += 18;

      // Bottom border line of header
      doc.strokeColor('black').lineWidth(1);
      doc.moveTo(margin, currentY).lineTo(pageWidth - doc.page.margins.right, currentY).stroke();
      currentY += 25;

      // Contract date and number (top right) - with better spacing
      doc.fontSize(11).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      addText(doc, `تاریخ قرارداد: ${contractData.contractDate}`, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 15;
      addText(doc, `شماره قرارداد: ${processText(contract.contract_number)}`, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 30;

      // Title section - with better spacing
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      addText(doc, 'بسمه تعالی', margin, currentY, { width: usableWidth, align: 'center' });
      currentY += 20;
      doc.fontSize(20);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.title.main, margin, currentY, { width: usableWidth, align: 'center' });
      currentY += 35;

      // Article 1 - Contract Title - with better spacing
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article1.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      const article1Content = template.article1.content(contractData);
      currentY = addMultilineText(doc, article1Content, margin, currentY, { width: usableWidth, align: 'right', lineHeight: 18 });
      currentY += 25;

      // Article 2 - Contract Subject - with better spacing
      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article2.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      
      if (template.article2.packageName) {
        addText(doc, `${template.article2.packageName} شامل تمامی موارد ذکر شده در پکیج که تیم بهت موظف به پیاده‌سازی آن برای کارفرما می‌باشد.`, margin, currentY, { width: usableWidth, align: 'right' });
        currentY += 18;
      }
      
      if (template.article2.projectTitle) {
        addText(doc, `پیاده‌سازی پروژه طراحی سایت با عنوان "${contractData.projectTitle}"`, margin, currentY, { width: usableWidth, align: 'right' });
        currentY += 18;
      }
      
      addText(doc, 'طراحی بصری و پیاده‌سازی مطابق با نظر و سلیقه مجری انجام خواهد شد.', margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      
      addText(doc, 'مواردی که باید به کارفرما ارائه شود:', margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 18;
      
      const items = template.article2.items(contractData);
      doc.fontSize(10);
      items.forEach((item, index) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }
        addText(doc, `${index + 1}. ${item}`, margin + 15, currentY, { width: usableWidth - 15, align: 'right' });
        currentY += 16;
      });
      currentY += 20;

      // Article 3 - Contract Duration - with better spacing
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article3.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      const article3Content = template.article3.content(contractData);
      currentY = addMultilineText(doc, article3Content, margin, currentY, { width: usableWidth, align: 'right', lineHeight: 18 });
      currentY += 25;

      // Article 4 - Contractor Obligations - with better spacing
      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article4.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      template.article4.obligations.forEach((obligation) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }
        addText(doc, `• ${obligation}`, margin + 15, currentY, { width: usableWidth - 15, align: 'right' });
        currentY += 16;
      });
      currentY += 20;

      // Article 5 - Client Obligations - with better spacing
      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article5.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      template.article5.obligations.forEach((obligation) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }
        addText(doc, `• ${obligation}`, margin + 15, currentY, { width: usableWidth - 15, align: 'right' });
        currentY += 16;
      });
      currentY += 20;

      // Article 6 - Contract Amount - with better spacing
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article6.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      const article6Content = template.article6.content(contractData);
      currentY = addMultilineText(doc, article6Content, margin, currentY, { width: usableWidth, align: 'right', lineHeight: 18 });
      currentY += 25;

      // Article 7 - Dispute Resolution - with better spacing
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article7.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      currentY = addMultilineText(doc, template.article7.content, margin, currentY, { width: usableWidth, align: 'right', lineHeight: 18 });
      currentY += 25;

      // Article 8 - Contract Termination - with better spacing
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article8.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      currentY = addMultilineText(doc, template.article8.content, margin, currentY, { width: usableWidth, align: 'right', lineHeight: 18 });
      currentY += 25;

      // Article 9 - Support - with better spacing
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
      doc.fontSize(14).fillColor('black');
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica-Bold');
      }
      addText(doc, template.article9.title, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 20;
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      const article9Content = template.article9.content(contractData);
      currentY = addMultilineText(doc, article9Content, margin, currentY, { width: usableWidth, align: 'right', lineHeight: 18 });
      currentY += 25;

      // Closing statement - with better spacing
      doc.fontSize(11);
      if (hasPersianFont) {
        doc.font('persian');
      } else {
        doc.font('Helvetica');
      }
      addText(doc, 'این قرارداد در ۹ ماده و ۲ نسخه تهیه شده که هر دو نسخه دارای اعتبار یکسان می‌باشند.', margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 18;
      addText(doc, `کلیه بندهای قرارداد در تاریخ ${contractData.contractDate} توسط طرفین امضا شده و طرفین متعهد به اجرای مفاد آن می‌باشند.`, margin, currentY, { width: usableWidth, align: 'right' });
      currentY += 30;

      // Signatures section
      if (currentY > doc.page.height - 120) {
        doc.addPage();
        currentY = 50;
      }
      
      const signatureBoxHeight = 80;
      const signatureBoxWidth = (usableWidth - 20) / 2;
      
      // Contractor signature box (left)
      doc.rect(margin, currentY, signatureBoxWidth, signatureBoxHeight).stroke();
      doc.fontSize(11);
      addText(doc, template.signatures.contractor.label, margin + 5, currentY + 5, { width: signatureBoxWidth - 10, align: 'right' });
      doc.fontSize(10);
      addText(doc, template.signatures.contractor.name, margin + 5, currentY + 25, { width: signatureBoxWidth - 10, align: 'right' });
      
      // Client signature box (right)
      const clientBoxX = margin + signatureBoxWidth + 20;
      doc.rect(clientBoxX, currentY, signatureBoxWidth, signatureBoxHeight).stroke();
      doc.fontSize(11);
      addText(doc, template.signatures.client.label, clientBoxX + 5, currentY + 5, { width: signatureBoxWidth - 10, align: 'right' });
      doc.fontSize(10);
      addText(doc, template.signatures.client.name(contractData), clientBoxX + 5, currentY + 25, { width: signatureBoxWidth - 10, align: 'right' });
      
      currentY += signatureBoxHeight + 15;

      // Footer
      const footerY = doc.page.height - 40;
      doc.fontSize(8).fillColor('gray');
      addText(doc, template.footer.phone, margin, footerY, { width: usableWidth, align: 'center' });
      addText(doc, template.footer.address, margin, footerY + 10, { width: usableWidth, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Estimate Word Document
export const generateEstimateWord = async (estimate: EstimateData): Promise<Buffer> => {
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'پیش‌فاکتور', rightToLeft: true }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
    })
  );

  // Estimate Info
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `شماره: ${estimate.estimate_number}`, rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `تاریخ: ${toJalali(estimate.created_at)}`, rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    })
  );

  if (estimate.valid_until) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `اعتبار تا: ${toJalali(estimate.valid_until)}`, rightToLeft: true }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  // Customer Info
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'مشتری:', rightToLeft: true }),
      ],
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: estimate.account_name || '-', rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    })
  );

  // Items Table
  if (estimate.items && estimate.items.length > 0) {
    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'نام آیتم', rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 40, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'تعداد', rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'قیمت واحد', rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'جمع', rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];

    estimate.items.forEach((item: any) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.item_name || '-', rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 40, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (item.quantity || 1).toString(), rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatNumber(item.unit_price || 0), rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatNumber(item.total_amount || 0), rightToLeft: true })], alignment: AlignmentType.RIGHT })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          ],
        })
      );
    });

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'آیتم‌ها:', rightToLeft: true }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      })
    );
  }

  // Total
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `جمع کل: ${formatCurrency(estimate.amount, estimate.currency)}`,
          bold: true,
          rightToLeft: true,
        }),
      ],
      alignment: AlignmentType.RIGHT,
    })
  );

  // Notes
  if (estimate.notes) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'یادداشت:', rightToLeft: true }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: estimate.notes, rightToLeft: true }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

// Generate Contract Word Document
export const generateContractWord = async (contract: ContractData): Promise<Buffer> => {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'قرارداد', rightToLeft: true }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `شماره قرارداد: ${contract.contract_number}`, rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `تاریخ ایجاد: ${toJalali(contract.created_at)}`, rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    })
  );

  // Contract Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: contract.title, bold: true, rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    })
  );

  // Contract Info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'اطلاعات قرارداد:', rightToLeft: true }),
      ],
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `مشتری: ${contract.account_name || '-'}`, rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    })
  );

  if (contract.contract_type) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `نوع قرارداد: ${contract.contract_type}`, rightToLeft: true }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  if (contract.start_date) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `تاریخ شروع: ${toJalali(contract.start_date)}`, rightToLeft: true }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  if (contract.end_date) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `تاریخ پایان: ${toJalali(contract.end_date)}`, rightToLeft: true }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  if (contract.value) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `مبلغ: ${formatCurrency(contract.value, contract.currency)}`, rightToLeft: true }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `وضعیت: ${contract.status}`, rightToLeft: true }),
      ],
      alignment: AlignmentType.RIGHT,
    })
  );

  // Description
  if (contract.description) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'توضیحات:', rightToLeft: true }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: contract.description, rightToLeft: true }),
        ],
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  // Contract/Website Details Table
  const hasDetails = contract.domain_name || contract.hosting_type || contract.hosting_duration || 
                    contract.ssl_certificate || contract.support_duration || contract.seo_package ||
                    contract.website_pages || contract.website_languages || contract.payment_terms ||
                    contract.delivery_days || contract.warranty_months;
  
  if (hasDetails) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'جزئیات قرارداد/سایت:', rightToLeft: true }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
      })
    );

    const tableRows: TableRow[] = [];
    
    // Helper function to add table row
    const addTableRow = (label: string, value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === '') return;
      
      const displayValue = typeof value === 'number' ? value.toString() : 
                          (typeof value === 'boolean' ? (value ? 'بله' : 'خیر') : value);
      
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: displayValue.toString(), rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      );
    };
    
    addTableRow('نام دامنه', contract.domain_name);
    addTableRow('نوع هاستینگ', contract.hosting_type);
    if (contract.hosting_duration) {
      addTableRow('مدت هاستینگ (ماه)', contract.hosting_duration);
    }
    if (contract.ssl_certificate !== undefined) {
      addTableRow('گواهینامه SSL شامل', contract.ssl_certificate ? 'بله' : 'خیر');
    }
    if (contract.support_duration) {
      addTableRow('مدت پشتیبانی (ماه)', contract.support_duration);
    }
    addTableRow('پکیج SEO', contract.seo_package);
    if (contract.website_pages) {
      addTableRow('تعداد صفحات سایت', contract.website_pages);
    }
    addTableRow('زبانهای سایت', contract.website_languages);
    addTableRow('شرایط پرداخت', contract.payment_terms);
    if (contract.delivery_days) {
      addTableRow('روزهای تحویل', contract.delivery_days);
    }
    if (contract.warranty_months) {
      addTableRow('ضمانت (ماه)', contract.warranty_months);
    }
    
    if (tableRows.length > 0) {
      children.push(
        new Paragraph({
          children: [],
        }),
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        children: children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

export const getEstimateWithItems = (estimateId: number): Promise<EstimateData> => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT e.*, a.name as account_name
      FROM estimates e
      LEFT JOIN accounts a ON e.account_id = a.id
      WHERE e.id = ?
    `, [estimateId], (err, estimate: any) => {
      if (err) {
        reject(err);
        return;
      }
      if (!estimate) {
        reject(new Error('پیش‌فاکتور یافت نشد'));
        return;
      }

      // Get items
      db.all('SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY position', [estimateId], (err, items: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ 
          id: estimate.id,
          estimate_number: estimate.estimate_number,
          account_name: estimate.account_name,
          amount: estimate.amount,
          currency: estimate.currency,
          status: estimate.status,
          valid_until: estimate.valid_until,
          notes: estimate.notes,
          contract_type: estimate.contract_type,
          domain_name: estimate.domain_name,
          hosting_type: estimate.hosting_type,
          ssl_included: estimate.ssl_included,
          created_at: estimate.created_at,
          items: items || []
        });
      });
    });
  });
};

export const getContractWithDetails = (contractId: number): Promise<ContractData> => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT c.*, a.name as account_name
      FROM contracts c
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE c.id = ?
    `, [contractId], (err, contract: any) => {
      if (err) {
        reject(err);
        return;
      }
      if (!contract) {
        reject(new Error('قرارداد یافت نشد'));
        return;
      }
      resolve({
        id: contract.id,
        contract_number: contract.contract_number,
        title: contract.title,
        description: contract.description,
        account_name: contract.account_name,
        contract_type: contract.contract_type,
        start_date: contract.start_date,
        end_date: contract.end_date,
        value: contract.value,
        currency: contract.currency || 'IRR',
        status: contract.status,
        auto_renew: contract.auto_renew,
        renewal_notice_days: contract.renewal_notice_days,
        signed_date: contract.signed_date,
        signed_by: contract.signed_by,
        created_at: contract.created_at,
        // Contract/Website details
        domain_name: contract.domain_name,
        hosting_type: contract.hosting_type,
        hosting_duration: contract.hosting_duration,
        ssl_certificate: contract.ssl_certificate,
        support_duration: contract.support_duration,
        seo_package: contract.seo_package,
        website_pages: contract.website_pages,
        website_languages: contract.website_languages,
        payment_terms: contract.payment_terms,
        delivery_days: contract.delivery_days,
        warranty_months: contract.warranty_months,
        project_id: contract.project_id,
      });
    });
  });
};
