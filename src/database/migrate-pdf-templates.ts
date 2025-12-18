import { db } from './db';

export const migratePdfTemplatesTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if pdf_templates table exists
      db.all(`PRAGMA table_info(pdf_templates)`, [], (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create pdf_templates table
          db.run(`
            CREATE TABLE IF NOT EXISTS pdf_templates (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              type TEXT NOT NULL CHECK(type IN ('invoice', 'contract', 'estimate')),
              name TEXT NOT NULL,
              description TEXT,
              template_content TEXT NOT NULL,
              header_html TEXT,
              footer_html TEXT,
              is_default INTEGER DEFAULT 0,
              is_active INTEGER DEFAULT 1,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating pdf_templates table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created pdf_templates table');
            
            // Create default templates
            createDefaultTemplates().then(() => {
              resolve();
            }).catch(reject);
          });
        } else {
          console.log('✅ pdf_templates table already exists');
          resolve();
        }
      });
    });
  });
};

const createDefaultTemplates = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if default templates exist
    db.get('SELECT COUNT(*) as count FROM pdf_templates WHERE type = ? AND is_default = 1', ['invoice'], (err: any, row: any) => {
      if (err) {
        console.error('Error checking default templates:', err);
        reject(err);
        return;
      }
      
      if (row.count === 0) {
        // Create default invoice template
        const defaultInvoiceTemplate = {
          type: 'invoice',
          name: 'قالب پیش‌فرض فاکتور',
          description: 'قالب پیش‌فرض برای چاپ فاکتور',
          template_content: JSON.stringify({
            header: {
              showCompanyName: true,
              showLogo: false,
              companyInfo: {
                show: true,
                position: 'right'
              }
            },
            body: {
              invoiceNumber: { show: true, label: 'شماره فاکتور' },
              invoiceDate: { show: true, label: 'تاریخ فاکتور' },
              dueDate: { show: true, label: 'تاریخ سررسید' },
              accountInfo: { show: true, label: 'مشتری' },
              itemsTable: { 
                show: true,
                columns: ['item_name', 'quantity', 'unit_price', 'tax_rate', 'total_amount']
              },
              totals: {
                show: true,
                showSubtotal: true,
                showTax: true,
                showTotal: true,
                showPaidAmount: true,
                showRemainingAmount: true
              },
              notes: { show: true, label: 'یادداشت' }
            },
            footer: {
              showFooter: true,
              footerText: 'ممنون از اعتماد شما'
            }
          }),
          header_html: '',
          footer_html: '',
          is_default: 1,
          is_active: 1
        };

        db.run(
          `INSERT INTO pdf_templates (type, name, description, template_content, header_html, footer_html, is_default, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            defaultInvoiceTemplate.type,
            defaultInvoiceTemplate.name,
            defaultInvoiceTemplate.description,
            defaultInvoiceTemplate.template_content,
            defaultInvoiceTemplate.header_html,
            defaultInvoiceTemplate.footer_html,
            defaultInvoiceTemplate.is_default,
            defaultInvoiceTemplate.is_active
          ],
          (err) => {
            if (err) {
              console.error('Error creating default invoice template:', err);
            } else {
              console.log('✅ Created default invoice template');
            }
          }
        );
      }

      // Check for contract template
      db.get('SELECT COUNT(*) as count FROM pdf_templates WHERE type = ? AND is_default = 1', ['contract'], (err: any, row: any) => {
        if (err) {
          console.error('Error checking default contract template:', err);
          reject(err);
          return;
        }
        
        if (row.count === 0) {
          // Create default contract template
          const defaultContractTemplate = {
            type: 'contract',
            name: 'قالب پیش‌فرض قرارداد',
            description: 'قالب پیش‌فرض برای چاپ قرارداد',
            template_content: JSON.stringify({
              header: {
                showCompanyName: true,
                showLogo: false,
                title: 'قرارداد'
              },
              body: {
                contractNumber: { show: true, label: 'شماره قرارداد' },
                contractDate: { show: true, label: 'تاریخ قرارداد' },
                accountInfo: { show: true, label: 'مشتری' },
                contractType: { show: true, label: 'نوع قرارداد' },
                startDate: { show: true, label: 'تاریخ شروع' },
                endDate: { show: true, label: 'تاریخ پایان' },
                value: { show: true, label: 'مبلغ' },
                description: { show: true, label: 'توضیحات' },
                contractDetails: { show: true }
              },
              footer: {
                showFooter: true,
                footerText: 'این قرارداد به صورت خودکار تولید شده است.'
              }
            }),
            header_html: '',
            footer_html: '',
            is_default: 1,
            is_active: 1
          };

          db.run(
            `INSERT INTO pdf_templates (type, name, description, template_content, header_html, footer_html, is_default, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              defaultContractTemplate.type,
              defaultContractTemplate.name,
              defaultContractTemplate.description,
              defaultContractTemplate.template_content,
              defaultContractTemplate.header_html,
              defaultContractTemplate.footer_html,
              defaultContractTemplate.is_default,
              defaultContractTemplate.is_active
            ],
            (err) => {
              if (err) {
                console.error('Error creating default contract template:', err);
              } else {
                console.log('✅ Created default contract template');
              }
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
};

