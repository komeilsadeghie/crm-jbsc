const PDFDocument = require('pdfkit');
import { db } from '../database/db';
import { toJalali, toJalaliDateTime } from '../utils/dateHelper';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';

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
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Set default font size
      doc.fontSize(12);

      // Header
      doc.fontSize(24).text('پیش‌فاکتور', { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`شماره: ${estimate.estimate_number}`, { align: 'right' });
      doc.text(`تاریخ: ${toJalali(estimate.created_at)}`, { align: 'right' });
      if (estimate.valid_until) {
        doc.text(`اعتبار تا: ${toJalali(estimate.valid_until)}`, { align: 'right' });
      }
      doc.moveDown();

      // Company Info
      doc.fontSize(14).text('مشتری:', { align: 'right' });
      doc.fontSize(12);
      doc.text(estimate.account_name || '-', { align: 'right' });
      doc.moveDown();

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
        doc.fontSize(14).text('آیتم‌ها:', { align: 'right' });
        doc.moveDown(0.5);

        // Table Header
        const tableTop = doc.y;
        const itemHeight = 20;
        const colWidths = { name: 200, qty: 60, price: 80, total: 80 };
        const startX = 50;
        const endX = 545;

        doc.fontSize(10);
        doc.text('جمع', startX + colWidths.name + colWidths.qty + colWidths.price, tableTop, { width: colWidths.total, align: 'right' });
        doc.text('قیمت واحد', startX + colWidths.name + colWidths.qty, tableTop, { width: colWidths.price, align: 'right' });
        doc.text('تعداد', startX + colWidths.name, tableTop, { width: colWidths.qty, align: 'right' });
        doc.text('نام آیتم', startX, tableTop, { width: colWidths.name, align: 'right' });

        // Draw line
        doc.moveTo(startX, tableTop + 15).lineTo(endX, tableTop + 15).stroke();

        // Table Rows
        let currentY = tableTop + 20;
        doc.fontSize(10);
        
        estimate.items.forEach((item: any) => {
          doc.text(item.item_name || '-', startX, currentY, { width: colWidths.name, align: 'right' });
          doc.text((item.quantity || 1).toString(), startX + colWidths.name, currentY, { width: colWidths.qty, align: 'right' });
          doc.text(formatNumber(item.unit_price || 0), startX + colWidths.name + colWidths.qty, currentY, { width: colWidths.price, align: 'right' });
          doc.text(formatNumber(item.total_amount || 0), startX + colWidths.name + colWidths.qty + colWidths.price, currentY, { width: colWidths.total, align: 'right' });
          currentY += itemHeight;
        });

        doc.moveDown();
      }

      // Total
      doc.moveDown();
      doc.fontSize(14);
      const totalText = `جمع کل: ${formatCurrency(estimate.amount, estimate.currency)}`;
      doc.text(totalText, { align: 'right' });

      // Notes
      if (estimate.notes) {
        doc.moveDown();
        doc.fontSize(12).text('یادداشت:', { align: 'right' });
        doc.fontSize(10);
        // Split notes into lines if too long
        const notesLines = estimate.notes.split('\n');
        notesLines.forEach((line: string) => {
          doc.text(line, { align: 'right' });
        });
      }

      // Footer
      doc.fontSize(8).fillColor('gray');
      const footerY = doc.page.height - 30;
      doc.text('این پیش‌فاکتور به صورت خودکار تولید شده است.', 50, footerY, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Contract PDF with Persian support
export const generateContractPDF = (contract: ContractData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(24).text('قرارداد', { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`شماره قرارداد: ${contract.contract_number}`, { align: 'right' });
      doc.text(`تاریخ ایجاد: ${toJalali(contract.created_at)}`, { align: 'right' });
      doc.moveDown();

      // Title
      doc.fontSize(18).text(contract.title, { align: 'right' });
      doc.moveDown();

      // Contract Info
      doc.fontSize(14).text('اطلاعات قرارداد:', { align: 'right' });
      doc.fontSize(12);
      doc.text(`مشتری: ${contract.account_name || '-'}`, { align: 'right' });
      
      if (contract.contract_type) {
        doc.text(`نوع قرارداد: ${contract.contract_type}`, { align: 'right' });
      }
      
      if (contract.start_date) {
        doc.text(`تاریخ شروع: ${toJalali(contract.start_date)}`, { align: 'right' });
      }
      
      if (contract.end_date) {
        doc.text(`تاریخ پایان: ${toJalali(contract.end_date)}`, { align: 'right' });
      }
      
      if (contract.value) {
        doc.text(`مبلغ: ${formatCurrency(contract.value, contract.currency)}`, { align: 'right' });
      }
      
      doc.text(`وضعیت: ${contract.status}`, { align: 'right' });
      
      if (contract.auto_renew) {
        doc.text('تمدید خودکار: بله', { align: 'right' });
        if (contract.renewal_notice_days) {
          doc.text(`یادآور انقضا: ${contract.renewal_notice_days} روز قبل`, { align: 'right' });
        }
      }
      
      if (contract.signed_date) {
        doc.text(`تاریخ امضا: ${toJalali(contract.signed_date)}`, { align: 'right' });
      }
      
      if (contract.signed_by) {
        doc.text(`امضا کننده: ${contract.signed_by}`, { align: 'right' });
      }
      
      doc.moveDown();

      // Description
      if (contract.description) {
        doc.fontSize(14).text('توضیحات:', { align: 'right' });
        doc.fontSize(12);
        // Split description into lines if too long
        const descLines = contract.description.split('\n');
        descLines.forEach((line: string) => {
          doc.text(line, { align: 'right' });
        });
        doc.moveDown();
      }

      // Contract/Website Details Table
      const hasDetails = contract.domain_name || contract.hosting_type || contract.hosting_duration || 
                        contract.ssl_certificate || contract.support_duration || contract.seo_package ||
                        contract.website_pages || contract.website_languages || contract.payment_terms ||
                        contract.delivery_days || contract.warranty_months;
      
      if (hasDetails) {
        doc.moveDown();
        doc.fontSize(14).text('جزئیات قرارداد/سایت:', { align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(10);
        
        const tableTop = doc.y;
        const tableWidth = 500;
        const col1Width = 200;
        const col2Width = 300;
        let currentY = tableTop;
        
        // Helper function to add table row
        const addTableRow = (label: string, value: string | number | null | undefined) => {
          if (value === null || value === undefined || value === '') return;
          
          const displayValue = typeof value === 'number' ? value.toString() : value;
          const displayLabel = label;
          
          // Check if we need a new page
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;
          }
          
          doc.rect(50, currentY, col1Width, 20).stroke();
          doc.rect(50 + col1Width, currentY, col2Width, 20).stroke();
          
          doc.text(displayLabel, 55, currentY + 5, { width: col1Width - 10, align: 'right' });
          doc.text(displayValue.toString(), 55 + col1Width, currentY + 5, { width: col2Width - 10, align: 'right' });
          
          currentY += 20;
        };
        
        addTableRow('نام دامنه', contract.domain_name);
        addTableRow('نوع هاستینگ', contract.hosting_type);
        if (contract.hosting_duration) {
          addTableRow('مدت هاستینگ (ماه)', contract.hosting_duration);
        }
        if (contract.ssl_certificate) {
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
        
        doc.y = currentY;
        doc.moveDown();
      }

      // Footer
      doc.fontSize(8).fillColor('gray');
      const footerY = doc.page.height - 30;
      doc.text('این قرارداد به صورت خودکار تولید شده است.', 50, footerY, { align: 'center' });

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
