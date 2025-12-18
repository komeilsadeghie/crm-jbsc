import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ContentBrief, ContentItem } from '../types/extended';
import { importModuleFromExcel } from '../modules/import-export/importExport.service';
import { migrateMediaImportFields } from '../database/migrate-media-import';
import xlsx from 'xlsx';

// Run migration on startup
migrateMediaImportFields().catch(err => {
  console.error('Error migrating media import fields:', err);
});

const router = express.Router();

// ========== Content Briefs ==========
router.get('/briefs', authenticate, (req: AuthRequest, res: Response) => {
  const { deal_id, account_id, status } = req.query;
  
  let query = 'SELECT * FROM content_briefs WHERE 1=1';
  const params: any[] = [];

  if (deal_id) {
    query += ' AND deal_id = ?';
    params.push(deal_id);
  }

  if (account_id) {
    query += ' AND account_id = ?';
    params.push(account_id);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, briefs) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت بریف‌ها' });
    }
    res.json(Array.isArray(briefs) ? briefs : []);
  });
});

router.post('/briefs', authenticate, (req: AuthRequest, res: Response) => {
  const brief: ContentBrief = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO content_briefs (
      deal_id, account_id, objective, message, persona, keywords, cta, platform, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      brief.deal_id || null,
      brief.account_id || null,
      brief.objective || null,
      brief.message || null,
      brief.persona || null,
      brief.keywords || null,
      brief.cta || null,
      brief.platform || null,
      brief.status || 'draft',
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت بریف' });
      }
      res.status(201).json({ id: this.lastID, message: 'بریف با موفقیت ثبت شد' });
    }
  );
});

router.put('/briefs/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const brief: ContentBrief = req.body;

  db.run(
    `UPDATE content_briefs SET 
      objective = ?, message = ?, persona = ?, keywords = ?, cta = ?,
      platform = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      brief.objective || null,
      brief.message || null,
      brief.persona || null,
      brief.keywords || null,
      brief.cta || null,
      brief.platform || null,
      brief.status || 'draft',
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی بریف' });
      }
      res.json({ message: 'بریف با موفقیت به‌روزرسانی شد' });
    }
  );
});

// ========== Content Items ==========
router.get('/items', authenticate, (req: AuthRequest, res: Response) => {
  const { brief_id, deal_id, status, content_type } = req.query;
  
  let query = 'SELECT * FROM content_items WHERE 1=1';
  const params: any[] = [];

  if (brief_id) {
    query += ' AND brief_id = ?';
    params.push(brief_id);
  }

  if (deal_id) {
    query += ' AND deal_id = ?';
    params.push(deal_id);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (content_type) {
    query += ' AND content_type = ?';
    params.push(content_type);
  }

  query += ' ORDER BY publish_date DESC, created_at DESC';

  db.all(query, params, (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت محتواها' });
    }
    res.json(Array.isArray(items) ? items : []);
  });
});

router.post('/items', authenticate, (req: AuthRequest, res: Response) => {
  const item: ContentItem = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO content_items (
      brief_id, deal_id, content_type, title, status, platform, publish_date, links, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.brief_id || null,
      item.deal_id || null,
      item.content_type,
      item.title || null,
      item.status || 'briefed',
      item.platform || null,
      item.publish_date || null,
      item.links || null,
      item.notes || null,
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت محتوا' });
      }
      res.status(201).json({ id: this.lastID, message: 'محتوا با موفقیت ثبت شد' });
    }
  );
});

router.put('/items/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const item: ContentItem = req.body;

  db.run(
    `UPDATE content_items SET 
      title = ?, status = ?, platform = ?, publish_date = ?, links = ?,
      notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      item.title || null,
      item.status || 'briefed',
      item.platform || null,
      item.publish_date || null,
      item.links || null,
      item.notes || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی محتوا' });
      }
      res.json({ message: 'محتوا با موفقیت به‌روزرسانی شد' });
    }
  );
});

// ========== Content Calendar ==========
router.get('/calendar', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, owner_id } = req.query;
  
  let query = `
    SELECT cc.*, ci.title as content_title, ci.content_type, ci.status as content_status
    FROM content_calendar cc
    LEFT JOIN content_items ci ON cc.content_item_id = ci.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND cc.publish_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND cc.publish_date <= ?';
    params.push(end_date);
  }

  if (owner_id) {
    query += ' AND cc.owner_id = ?';
    params.push(owner_id);
  }

  query += ' ORDER BY cc.publish_date ASC, cc.publish_time ASC';

  db.all(query, params, (err, calendar) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تقویم' });
    }
    res.json(Array.isArray(calendar) ? calendar : []);
  });
});

// ========== Assets ==========
router.get('/assets', authenticate, (req: AuthRequest, res: Response) => {
  const { deal_id, brief_id, asset_type, approval_status } = req.query;
  
  let query = 'SELECT * FROM assets WHERE 1=1';
  const params: any[] = [];

  if (deal_id) {
    query += ' AND deal_id = ?';
    params.push(deal_id);
  }

  if (brief_id) {
    query += ' AND brief_id = ?';
    params.push(brief_id);
  }

  if (asset_type) {
    query += ' AND asset_type = ?';
    params.push(asset_type);
  }

  if (approval_status) {
    query += ' AND approval_status = ?';
    params.push(approval_status);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, assets) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت دارایی‌ها' });
    }
    res.json(Array.isArray(assets) ? assets : []);
  });
});

router.post('/assets', authenticate, (req: AuthRequest, res: Response) => {
  const asset = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO assets (
      deal_id, brief_id, asset_type, file_name, file_path, file_size,
      mime_type, version, approval_status, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      asset.deal_id || null,
      asset.brief_id || null,
      asset.asset_type,
      asset.file_name,
      asset.file_path,
      asset.file_size || null,
      asset.mime_type || null,
      asset.version || 1,
      asset.approval_status || 'pending',
      asset.notes || null,
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت دارایی' });
      }
      res.status(201).json({ id: this.lastID, message: 'دارایی با موفقیت ثبت شد' });
    }
  );
});

router.patch('/assets/:id/approve', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { approval_status, notes } = req.body;
  const userId = req.user?.id;

  db.run(
    `UPDATE assets SET 
      approval_status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
     WHERE id = ?`,
    [approval_status, userId, notes || null, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت تایید' });
      }
      res.json({ message: 'وضعیت تایید به‌روزرسانی شد' });
    }
  );
});

// ========== Import Customers from Excel ==========
router.post('/import/customers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Import customers request received');
    const { file, mapping, createDeals } = req.body as { 
      file: string; 
      mapping: Record<string, string>;
      createDeals?: boolean;
    };

    if (!file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'فایل Excel ارسال نشده است' });
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      console.log('No mapping in request');
      return res.status(400).json({ error: 'نگاشت ستون‌ها ارسال نشده است' });
    }
    
    console.log('File length:', file.length, 'Mapping keys:', Object.keys(mapping).length);
    console.log('Mapping details:', JSON.stringify(mapping, null, 2));
    
    // Validate that required fields are mapped
    const requiredFields = ['name'];
    const mappedFields = Object.values(mapping);
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
    
    console.log('=== VALIDATION CHECK ===');
    console.log('Required fields:', requiredFields);
    console.log('Mapping object:', JSON.stringify(mapping, null, 2));
    console.log('Mapped fields (values):', mappedFields);
    console.log('Missing fields:', missingFields);
    
    if (missingFields.length > 0) {
      console.log('❌ VALIDATION FAILED: Missing required field mappings');
      return res.status(400).json({ 
        error: `ستون "نام و نام خانوادگی" باید به فیلد "name" نگاشت شود. لطفاً در بخش نگاشت ستون‌ها، ستون "نام و نام خانوادگی" را انتخاب کنید.`,
        missingFields,
        currentMapping: mapping,
        mappedFields: mappedFields
      });
    }
    
    console.log('✅ VALIDATION PASSED: All required fields are mapped');

    console.log('=== FILE PROCESSING ===');
    console.log('Decoding base64 file...');
    const buffer = Buffer.from(file, 'base64');
    console.log('Buffer length:', buffer.length);
    
    if (buffer.length === 0) {
      console.error('❌ ERROR: Empty buffer after decoding');
      return res.status(400).json({ error: 'فایل Excel خالی است یا به درستی decode نشده است' });
    }
    
    console.log('Reading Excel file...');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    console.log('First sheet name:', firstSheetName);
    const sheet = workbook.Sheets[firstSheetName];
    
    if (!sheet) {
      console.error('❌ ERROR: Sheet not found');
      return res.status(400).json({ error: 'هیچ sheet در فایل Excel یافت نشد' });
    }
    
    const jsonRows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    console.log(`✅ Excel file parsed: ${jsonRows.length} rows found`);
    
    if (jsonRows.length === 0) {
      console.error('❌ ERROR: No rows found in Excel');
      return res.status(400).json({ error: 'هیچ داده‌ای در فایل Excel یافت نشد' });
    }
    
    // Log first row to see available columns
    if (jsonRows.length > 0) {
      console.log('First row columns:', Object.keys(jsonRows[0]));
      console.log('First row sample (first 500 chars):', JSON.stringify(jsonRows[0], null, 2).substring(0, 500));
    }

    const errors: Array<{ row: number; error: string }> = [];
    let successCount = 0;
    let dealsCreated = 0;
    let projectsCreated = 0;

    // Helper functions
    const dbGet = (query: string, params: any[]): Promise<any> => {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };

    const dbRun = (query: string, params: any[]): Promise<{ lastID?: number }> => {
      return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      });
    };

    const normalizeValue = (value: any) => {
      if (value === null || value === undefined) {
        return null;
      }
      // Convert to string first, then trim
      const strValue = String(value);
      const trimmed = strValue.trim();
      return trimmed === '' ? null : trimmed;
    };

    const convertJalaliToGregorian = (jalaliDate: string): string | null => {
      if (!jalaliDate || jalaliDate === '0' || jalaliDate === '') return null;
      // Simple conversion - can be improved with proper library
      try {
        const parts = jalaliDate.split('/');
        if (parts.length === 3) {
          // For now, return as is - you may want to use a proper Jalali date library
          return jalaliDate;
        }
      } catch (e) {
        // Ignore
      }
      return null;
    };

    for (let index = 0; index < jsonRows.length; index++) {
      const row = jsonRows[index];
      
      // Map columns using mapping
      const mappedRow: Record<string, any> = {};
      Object.entries(mapping).forEach(([excelColumn, systemField]) => {
        // Check if the Excel column exists in the row
        if (row.hasOwnProperty(excelColumn)) {
          mappedRow[systemField] = row[excelColumn];
        } else {
          console.warn(`Row ${index + 2}: Column "${excelColumn}" not found. Available columns:`, Object.keys(row));
        }
      });
      
      if (index === 0) {
        console.log('First row - Original Excel columns:', Object.keys(row));
        console.log('First row - Mapping config:', mapping);
        console.log('First row - Mapped data:', mappedRow);
      }

      // Extract customer data - try multiple possible field names
      let customerName = mappedRow.name || mappedRow['نام و نام خانوادگی'];
      
      console.log(`Row ${index + 2}: Looking for customer name...`);
      console.log(`  - mappedRow.name:`, mappedRow.name);
      console.log(`  - mappedRow['نام و نام خانوادگی']:`, mappedRow['نام و نام خانوادگی']);
      console.log(`  - Available mapped fields:`, Object.keys(mappedRow));
      
      // If not found in mapped data, try direct column access
      if (!customerName || String(customerName).trim() === '') {
        console.log(`  - Name not found in mapped data, trying direct column access...`);
        const nameColumns = ['نام و نام خانوادگی', 'name', 'Name', 'NAME', 'نام'];
        for (const col of nameColumns) {
          if (row[col] && String(row[col]).trim() !== '') {
            customerName = String(row[col]).trim();
            console.log(`  - Found name in column "${col}":`, customerName);
            break;
          }
        }
      } else {
        console.log(`  - Found name from mapping:`, customerName);
      }
      
      const phone = mappedRow.phone || mappedRow['تلفن همراه'] || mappedRow['شماره تلفن'];
      const website = mappedRow.website || mappedRow['اسم سایت ( نام دامنه )'] || mappedRow['وب‌سایت / دامنه'] || mappedRow.company_name;
      const activityType = mappedRow.type || mappedRow['نوع فعالیت'] || 'export';
      const productName = mappedRow.product_name || mappedRow['نام محصول'];
      const serviceCost = mappedRow.service_cost || mappedRow['هزینه خدمات (مبلغ)'] || mappedRow['هزینه سرویس'];
      const balance = mappedRow.balance || mappedRow['مانده'];
      const websiteStartDate = mappedRow.website_start_date || mappedRow['تاریخ شروع سایت'];
      const websiteDeliveryDate = mappedRow.website_delivery_date || mappedRow['تاریخ تحویل سایت'];
      const codeColumn = mappedRow.code || mappedRow['Code'] || row['Code'] || row['CODE'] || row['کد'];
      const designerColumn = mappedRow.designer || mappedRow['طراح'] || row['Designer'] || row['DESIGNER'] || row['طراح'];
      
      // New Excel fields
      const gender = mappedRow.gender || mappedRow['جنسیت'];
      const siteLanguagesCount = mappedRow.site_languages_count || mappedRow['تعداد زبان های سایت ها'];
      const serviceType = mappedRow.service_type || mappedRow['نوع خدمات'];
      const deliveryDeadline = mappedRow.delivery_deadline || mappedRow['ددلاین تحویل'];
      const siteCosts = mappedRow.site_costs || mappedRow['هزینه ها برای سایت ها'];
      const initialDeliveryDate = mappedRow.initial_delivery_date || mappedRow['تاریخ اتمام و تحویل اولیه سایت'];
      const languagesAddedDate = mappedRow.languages_added_date || mappedRow['تاریخ اضافه کردن زبان های سایت'];
      
      // Extract code from CODE column (e.g., E-C3-403 -> 3)
      let customerCode: number | null = null;
      if (codeColumn) {
        const codeStr = String(codeColumn);
        // Match pattern like E-C3-403 or CM1-403
        const match = codeStr.match(/[-\s]C(\d)[-\s]/i) || codeStr.match(/C(\d)/i);
        if (match && match[1]) {
          const extractedCode = Number(match[1]);
          if (extractedCode >= 1 && extractedCode <= 9) {
            customerCode = extractedCode;
          }
        }
      }

      if (!customerName || String(customerName).trim() === '') {
        console.error(`❌ Row ${index + 2}: No customer name found!`);
        console.error(`  - Mapped fields:`, Object.keys(mappedRow));
        console.error(`  - Mapped values:`, mappedRow);
        console.error(`  - Available Excel columns:`, Object.keys(row));
        console.error(`  - Mapping config:`, JSON.stringify(mapping, null, 2));
        console.error(`  - Row data sample:`, JSON.stringify(row, null, 2).substring(0, 1000));
        errors.push({
          row: index + 2,
          error: `نام مشتری الزامی است. لطفاً ستون "نام و نام خانوادگی" را به فیلد "name" نگاشت کنید.`,
        });
        continue;
      }
      
      console.log(`✅ Row ${index + 2}: Customer name found: "${customerName}"`);

      try {
        // Determine customer type from activity type
        let customerType = 'export';
        if (activityType && typeof activityType === 'string') {
          const normalizedType = String(activityType).toLowerCase().trim();
          if (normalizedType.includes('صادرات') || normalizedType.includes('export')) {
            customerType = 'export';
          } else if (normalizedType.includes('واردات') || normalizedType.includes('import')) {
            customerType = 'import';
          } else if (normalizedType.includes('کوچینگ') || normalizedType.includes('coaching')) {
            customerType = 'coaching';
          } else if (normalizedType.includes('شرکت') || normalizedType.includes('company')) {
            customerType = 'company';
          } else {
            customerType = 'individual';
          }
        }

        // Extract company name from website if available
        let companyName = mappedRow.company_name;
        if (!companyName && website) {
          // Extract domain name as company name
          companyName = String(website).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }

        // Validate and normalize status
        const validStatuses = ['active', 'inactive', 'lead', 'customer', 'partner'];
        let customerStatus = 'active'; // Default status
        if (mappedRow.status) {
          const statusStr = String(mappedRow.status).toLowerCase().trim();
          if (validStatuses.includes(statusStr)) {
            customerStatus = statusStr;
          } else {
            // Try to map common Persian status values
            if (statusStr.includes('فعال') || statusStr.includes('active')) {
              customerStatus = 'active';
            } else if (statusStr.includes('غیرفعال') || statusStr.includes('inactive')) {
              customerStatus = 'inactive';
            } else if (statusStr.includes('لید') || statusStr.includes('lead')) {
              customerStatus = 'lead';
            } else if (statusStr.includes('مشتری') || statusStr.includes('customer')) {
              customerStatus = 'customer';
            } else if (statusStr.includes('شریک') || statusStr.includes('partner')) {
              customerStatus = 'partner';
            }
            // If still not valid, use default 'active'
          }
        }

        // Generate unique_id for customer (based on name + phone)
        const namePart = String(customerName || '').trim().replace(/\s+/g, '_').toLowerCase();
        const phonePart = String(phone || '').trim().replace(/\D/g, '');
        const emailPart = String(mappedRow.email || '').trim().toLowerCase().split('@')[0];
        
        let uniqueId = '';
        if (namePart && phonePart) {
          uniqueId = `${namePart}_${phonePart}`;
        } else if (namePart && emailPart) {
          uniqueId = `${namePart}_${emailPart}`;
        } else if (namePart) {
          uniqueId = `${namePart}_${Date.now()}`;
        } else {
          uniqueId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Check if customer with this unique_id already exists
        const existingCustomer = await dbGet(
          `SELECT id FROM customers WHERE unique_id = ?`,
          [uniqueId]
        );

        let customerId: number;
        
        if (existingCustomer) {
          // Update existing customer
          await dbRun(
            `UPDATE customers SET 
              name = ?, type = ?, email = ?, phone = ?, company_name = ?, address = ?, 
              website = ?, score = ?, status = ?, category = ?, notes = ?, code = ?, designer = ?, 
              gender = ?, site_languages_count = ?, service_type = ?, delivery_deadline = ?, 
              site_costs = ?, initial_delivery_date = ?, languages_added_date = ?, updated_at = CURRENT_TIMESTAMP
             WHERE unique_id = ?`,
            [
              customerName,
              customerType,
              normalizeValue(mappedRow.email),
              normalizeValue(phone),
              normalizeValue(companyName),
              normalizeValue(mappedRow.address),
              normalizeValue(website),
              Number(mappedRow.score) || 0,
              customerStatus,
              'بخش مدیا > طراحی سایت',
              normalizeValue(productName ? `محصول: ${productName}` : mappedRow.notes || mappedRow['توضیحات']),
              customerCode,
              normalizeValue(designerColumn),
              normalizeValue(gender),
              siteLanguagesCount ? Number(siteLanguagesCount) : null,
              normalizeValue(serviceType),
              deliveryDeadline || null,
              siteCosts ? parseFloat(String(siteCosts).replace(/,/g, '')) : null,
              initialDeliveryDate || null,
              languagesAddedDate || null,
              uniqueId,
            ]
          );
          customerId = existingCustomer.id;
          successCount++;
        } else {
          // Create new customer
          try {
            const customerResult = await dbRun(
              `INSERT INTO customers (name, type, email, phone, company_name, address, website, score, status, category, notes, code, designer, gender, site_languages_count, service_type, delivery_deadline, site_costs, initial_delivery_date, languages_added_date, unique_id, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                customerName,
                customerType,
                normalizeValue(mappedRow.email),
                normalizeValue(phone),
                normalizeValue(companyName),
                normalizeValue(mappedRow.address),
                normalizeValue(website),
                Number(mappedRow.score) || 0,
                customerStatus,
                'بخش مدیا > طراحی سایت',
                normalizeValue(productName ? `محصول: ${productName}` : mappedRow.notes || mappedRow['توضیحات']),
                customerCode,
                normalizeValue(designerColumn),
                normalizeValue(gender),
                siteLanguagesCount ? Number(siteLanguagesCount) : null,
                normalizeValue(serviceType),
                deliveryDeadline || null,
                siteCosts ? parseFloat(String(siteCosts).replace(/,/g, '')) : null,
                initialDeliveryDate || null,
                languagesAddedDate || null,
                uniqueId,
                req.user?.id,
              ]
            );
            customerId = customerResult.lastID!;
            successCount++;
          } catch (insertError: any) {
            console.error(`❌ Error inserting customer in row ${index + 2}:`, insertError);
            console.error(`❌ SQL Error:`, insertError.message);
            throw insertError; // Re-throw to be caught by outer catch
          }
        }

        // Parse balance value
        let balanceValue = 0;
        if (balance) {
          const balanceStr = String(balance).replace(/,/g, '').trim();
          balanceValue = Number(balanceStr) || 0;
        }

        // Create or update account for the customer (projects need account_id)
        // Use customer name and website to find existing account
        let accountId: number | null = null;
        
        // Try to find existing account by name and website
        const existingAccount = await dbGet(
          `SELECT id FROM accounts WHERE name = ? AND (website = ? OR website IS NULL)`,
          [companyName || customerName, normalizeValue(website)]
        );

        if (existingAccount) {
          // Update existing account
          await dbRun(
            `UPDATE accounts SET name = ?, website = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [
              companyName || customerName,
              normalizeValue(website),
              'active',
              existingAccount.id,
            ]
          );
          accountId = existingAccount.id;
        } else {
          // Create new account
          try {
            const accountResult = await dbRun(
              `INSERT INTO accounts (name, website, status, created_at)
               VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                companyName || customerName,
                normalizeValue(website),
                'active',
              ]
            );
            accountId = accountResult.lastID || null;
          } catch (accountError: any) {
            console.error(`Error creating account for customer ${customerId}:`, accountError);
          }
        }

        // Create or update deal if createDeals is true and we have service cost
        let dealId: number | null = null;
        if (createDeals && accountId && serviceCost) {
          try {
            const costValue = String(serviceCost).replace(/,/g, '');
            const budget = Number(costValue) || null;

            if (budget) {
              const dealTitle = `طراحی سایت ${companyName || customerName}`;
              
              // Check if deal already exists for this account
              const existingDeal = await dbGet(
                `SELECT id FROM deals WHERE account_id = ? AND title = ?`,
                [accountId, dealTitle]
              );

              if (existingDeal) {
                // Update existing deal
                await dbRun(
                  `UPDATE deals SET budget = ?, services = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                  [
                    budget,
                    'طراحی سایت',
                    `وارد شده از Excel - محصول: ${productName || 'نامشخص'}`,
                    existingDeal.id,
                  ]
                );
                dealId = existingDeal.id;
                dealsCreated++;
                console.log(`Updated existing deal ${dealId} for account ${accountId}`);
              } else {
                // Create new deal
                const dealResult = await dbRun(
                  `INSERT INTO deals (title, account_id, stage, budget, services, notes, created_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    dealTitle,
                    accountId,
                    'design',
                    budget,
                    'طراحی سایت',
                    `وارد شده از Excel - محصول: ${productName || 'نامشخص'}`,
                    req.user?.id,
                  ]
                );
                dealId = dealResult.lastID || null;
                dealsCreated++;
                console.log(`Created new deal ${dealId} for account ${accountId}`);
              }
            }
          } catch (dealError: any) {
            // Log but don't fail the import
            console.error(`Error creating/updating deal for account ${accountId}:`, dealError);
          }
        }

        // Create project if balance > 0 (there's remaining payment)
        if (accountId && balanceValue > 0) {
          try {
            const costValue = String(serviceCost || balanceValue).replace(/,/g, '');
            const budget = Number(costValue) || null;

            // Determine project status based on dates and balance
            // If balance > 0, project is still active (not completed)
            let projectStatus = 'active';
            if (websiteStartDate) {
              // If start date exists, project is active
              projectStatus = 'active';
            } else {
              // If no start date, project is in planning
              projectStatus = 'planning';
            }
            // Note: We don't set status to 'completed' if balance > 0, as there's remaining payment

            // Convert Jalali dates to format (keep as string for now, can be converted later)
            const startDate = websiteStartDate ? convertJalaliToGregorian(String(websiteStartDate)) : null;
            const endDate = websiteDeliveryDate ? convertJalaliToGregorian(String(websiteDeliveryDate)) : null;

            // Extract payment stages from mapping
            const paymentStage1 = mappedRow['payment_stage_1'] || mappedRow['واریزی اول'] || mappedRow['پرداخت مرحله 1'] || mappedRow['مرحله 1'] || null;
            const paymentStage1Date = mappedRow['payment_stage_1_date'] || mappedRow['تاریخ واریز اول'] || mappedRow['تاریخ پرداخت مرحله 1'] || mappedRow['تاریخ مرحله 1'] || null;
            const paymentStage2 = mappedRow['payment_stage_2'] || mappedRow['واریزی دوم'] || mappedRow['پرداخت مرحله 2'] || mappedRow['مرحله 2'] || null;
            const paymentStage2Date = mappedRow['payment_stage_2_date'] || mappedRow['تاریخ واریز دوم'] || mappedRow['تاریخ پرداخت مرحله 2'] || mappedRow['تاریخ مرحله 2'] || null;
            const paymentStage3 = mappedRow['payment_stage_3'] || mappedRow['واریزی سوم'] || mappedRow['پرداخت مرحله 3'] || mappedRow['مرحله 3'] || null;
            const paymentStage3Date = mappedRow['payment_stage_3_date'] || mappedRow['تاریخ واریز سوم'] || mappedRow['تاریخ پرداخت مرحله 3'] || mappedRow['تاریخ مرحله 3'] || null;
            const paymentStage4 = mappedRow['payment_stage_4'] || mappedRow['واریزی چهارم'] || mappedRow['پرداخت مرحله 4'] || mappedRow['مرحله 4'] || null;
            const paymentStage4Date = mappedRow['payment_stage_4_date'] || mappedRow['تاریخ واریز چهارم'] || mappedRow['تاریخ پرداخت مرحله 4'] || mappedRow['تاریخ مرحله 4'] || null;
            
            // Extract settlements
            const settlementKamil = mappedRow['settlement_kamil'] || mappedRow['تسویه کمیل'] || null;
            const settlementAsdan = mappedRow['settlement_asdan'] || mappedRow['تسویه اسدان'] || null;
            const settlementSoleimani = mappedRow['settlement_soleimani'] || mappedRow['تسویه سلیمانی'] || null;
            
            // Create settlements JSON
            const settlementsObj: any = {
              sadeghieh: false,
              soleimani: false,
            };
            if (settlementKamil) {
              settlementsObj.kamil = String(settlementKamil).toLowerCase() === 'true' || String(settlementKamil) === '1' || String(settlementKamil).toLowerCase() === 'بله' || String(settlementKamil).toLowerCase() === '✓';
            }
            if (settlementAsdan) {
              settlementsObj.asdan = String(settlementAsdan).toLowerCase() === 'true' || String(settlementAsdan) === '1' || String(settlementAsdan).toLowerCase() === 'بله' || String(settlementAsdan).toLowerCase() === '✓';
            }
            if (settlementSoleimani) {
              settlementsObj.soleimani = String(settlementSoleimani).toLowerCase() === 'true' || String(settlementSoleimani) === '1' || String(settlementSoleimani).toLowerCase() === 'بله' || String(settlementSoleimani).toLowerCase() === '✓';
            }
            const settlements = JSON.stringify(settlementsObj);

            const projectName = `طراحی سایت ${companyName || customerName}`;
            const projectDescription = `پروژه طراحی وب‌سایت برای ${customerName}\n${website ? `وب‌سایت: ${website}\n` : ''}${productName ? `محصول: ${productName}\n` : ''}${customerCode ? `کد: ${customerCode}\n` : ''}${designerColumn ? `طراح: ${designerColumn}\n` : ''}${siteLanguagesCount ? `تعداد زبان‌ها: ${siteLanguagesCount}\n` : ''}${serviceType ? `نوع خدمات: ${serviceType}\n` : ''}مانده پرداخت: ${new Intl.NumberFormat('fa-IR').format(balanceValue)} تومان`;

            // Check if project already exists for this account
            const existingProject = await dbGet(
              `SELECT id FROM projects WHERE account_id = ? AND name = ?`,
              [accountId, projectName]
            );

            if (existingProject) {
              // Update existing project
              await dbRun(
                `UPDATE projects SET 
                  deal_id = ?, description = ?, status = ?, start_date = ?, end_date = ?, budget = ?, 
                  manager_id = ?, settlements = ?,
                  payment_stage_1 = ?, payment_stage_1_date = ?,
                  payment_stage_2 = ?, payment_stage_2_date = ?,
                  payment_stage_3 = ?, payment_stage_3_date = ?,
                  payment_stage_4 = ?, payment_stage_4_date = ?,
                  settlement_kamil = ?, settlement_asdan = ?, settlement_soleimani = ?,
                  updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                  dealId,
                  projectDescription,
                  projectStatus,
                  startDate,
                  endDate || deliveryDeadline || null,
                  budget,
                  req.user?.id,
                  settlements,
                  paymentStage1 ? parseFloat(String(paymentStage1).replace(/,/g, '')) : null,
                  paymentStage1Date || null,
                  paymentStage2 ? parseFloat(String(paymentStage2).replace(/,/g, '')) : null,
                  paymentStage2Date || null,
                  paymentStage3 ? parseFloat(String(paymentStage3).replace(/,/g, '')) : null,
                  paymentStage3Date || null,
                  paymentStage4 ? parseFloat(String(paymentStage4).replace(/,/g, '')) : null,
                  paymentStage4Date || null,
                  settlementKamil || null,
                  settlementAsdan || null,
                  settlementSoleimani || null,
                  existingProject.id,
                ]
              );
              projectsCreated++;
              console.log(`Updated existing project ${existingProject.id} for account ${accountId}`);
            } else {
              // Create new project
              await dbRun(
                `INSERT INTO projects (account_id, deal_id, name, description, status, start_date, end_date, budget, manager_id, settlements, 
                  payment_stage_1, payment_stage_1_date, payment_stage_2, payment_stage_2_date,
                  payment_stage_3, payment_stage_3_date, payment_stage_4, payment_stage_4_date,
                  settlement_kamil, settlement_asdan, settlement_soleimani, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  accountId,
                  dealId,
                  projectName,
                  projectDescription,
                  projectStatus,
                  startDate,
                  endDate || deliveryDeadline || null,
                  budget,
                  req.user?.id, // Set current user as manager
                  settlements,
                  paymentStage1 ? parseFloat(String(paymentStage1).replace(/,/g, '')) : null,
                  paymentStage1Date || null,
                  paymentStage2 ? parseFloat(String(paymentStage2).replace(/,/g, '')) : null,
                  paymentStage2Date || null,
                  paymentStage3 ? parseFloat(String(paymentStage3).replace(/,/g, '')) : null,
                  paymentStage3Date || null,
                  paymentStage4 ? parseFloat(String(paymentStage4).replace(/,/g, '')) : null,
                  paymentStage4Date || null,
                  settlementKamil || null,
                  settlementAsdan || null,
                  settlementSoleimani || null,
                  req.user?.id,
                ]
              );
              projectsCreated++;
              console.log(`Created new project for account ${accountId}`);
            }
          } catch (projectError: any) {
            // Log but don't fail the import
            console.error(`Error creating project for account ${accountId}:`, projectError);
          }
        }
      } catch (error: any) {
        console.error(`❌ Error processing row ${index + 2}:`, error);
        console.error(`❌ Error message:`, error.message);
        console.error(`❌ Error stack:`, error.stack);
        
        // Check if it's a SQL error about missing column
        const errorMessage = error.message || String(error);
        let userFriendlyError = errorMessage;
        
        if (errorMessage.includes('no column named')) {
          const columnMatch = errorMessage.match(/no column named (\w+)/i);
          if (columnMatch) {
            userFriendlyError = `ستون "${columnMatch[1]}" در دیتابیس وجود ندارد. لطفاً migration را اجرا کنید: npm run migrate:customer-fields`;
          }
        } else if (errorMessage.includes('SQLITE_ERROR')) {
          // Extract more details from SQLite errors
          const sqliteMatch = errorMessage.match(/SQLITE_ERROR: (.+)/i);
          if (sqliteMatch) {
            userFriendlyError = sqliteMatch[1];
          }
        }
        
        errors.push({ row: index + 2, error: userFriendlyError });
      }
    }

    console.log('Import completed:', { successCount, dealsCreated, projectsCreated, errorsCount: errors.length });
    
    res.json({
      successCount,
      dealsCreated,
      projectsCreated,
      errors,
    });
  } catch (error: any) {
    console.error('Import customers error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'خطا در ورود اطلاعات از Excel' });
  }
});

// ========== Preview Excel File (Get Column Names) ==========
router.post('/import/preview', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Preview request received');
    const { file } = req.body as { file: string };

    if (!file) {
      console.log('No file in request body');
      return res.status(400).json({ error: 'فایل Excel ارسال نشده است' });
    }

    if (typeof file !== 'string') {
      console.log('File is not a string, type:', typeof file);
      return res.status(400).json({ error: 'فرمت فایل نامعتبر است' });
    }

    console.log('File received, length:', file.length);

    try {
      // Decode base64
      let buffer: Buffer;
      try {
        buffer = Buffer.from(file, 'base64');
        console.log('Buffer created, length:', buffer.length);
        if (buffer.length === 0) {
          return res.status(400).json({ error: 'فایل خالی است یا base64 معتبر نیست' });
        }
        
        // Check if it's a valid Excel file by checking magic bytes
        const magicBytes = buffer.slice(0, 8);
        const isXLSX = magicBytes[0] === 0x50 && magicBytes[1] === 0x4B; // PK (ZIP signature)
        const isXLS = magicBytes.slice(0, 8).toString('hex').startsWith('d0cf11e0a1b11ae1'); // OLE2 signature
        
        console.log('File type check - isXLSX:', isXLSX, 'isXLS:', isXLS, 'magic bytes:', magicBytes.toString('hex'));
        
        // Try to read anyway even if magic bytes don't match (some Excel files might have different headers)
        // if (!isXLSX && !isXLS) {
        //   console.log('Invalid file format, magic bytes:', magicBytes.toString('hex'));
        //   return res.status(400).json({ error: 'فایل انتخاب شده یک فایل Excel معتبر نیست' });
        // }
      } catch (decodeError: any) {
        console.error('Base64 decode error:', decodeError);
        return res.status(400).json({ error: 'خطا در decode کردن فایل: ' + (decodeError.message || 'فرمت base64 نامعتبر') });
      }

      // Read Excel file
      let workbook: xlsx.WorkBook;
      try {
        console.log('Attempting to read Excel file...');
        workbook = xlsx.read(buffer, { 
          type: 'buffer',
          cellDates: false,
          cellNF: false,
          cellStyles: false,
          sheetStubs: false
        });
        console.log('Excel file read successfully, sheets:', workbook.SheetNames?.length || 0);
      } catch (readError: any) {
        console.error('Excel read error:', readError);
        console.error('Error details:', {
          message: readError.message,
          stack: readError.stack,
          name: readError.name
        });
        return res.status(400).json({ error: 'خطا در خواندن فایل Excel: ' + (readError.message || 'فایل Excel معتبر نیست') });
      }
      
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        console.log('No sheets found in workbook');
        return res.status(400).json({ error: 'فایل Excel معتبر نیست یا خالی است' });
      }

      const firstSheetName = workbook.SheetNames[0];
      console.log('First sheet name:', firstSheetName);
      const sheet = workbook.Sheets[firstSheetName];
      
      if (!sheet) {
        console.log('Sheet not found:', firstSheetName);
        return res.status(400).json({ error: 'نمی‌توان صفحه اول Excel را خواند' });
      }

      // Convert to JSON
      let jsonData: any[];
      try {
        console.log('Converting sheet to JSON...');
        jsonData = xlsx.utils.sheet_to_json(sheet, { 
          defval: '', 
          header: 1,
          raw: false,
          blankrows: false
        });
        console.log('JSON conversion successful, rows:', jsonData.length);
      } catch (jsonError: any) {
        console.error('JSON conversion error:', jsonError);
        return res.status(400).json({ error: 'خطا در تبدیل داده‌ها: ' + (jsonError.message || 'داده‌ها قابل تبدیل نیستند') });
      }

      if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
        console.log('No data in JSON array');
        return res.status(400).json({ error: 'فایل Excel خالی است' });
      }

      // Get first row as headers
      const firstRow = jsonData[0];
      if (!firstRow || !Array.isArray(firstRow)) {
        console.log('First row is not an array:', typeof firstRow);
        return res.status(400).json({ error: 'ستون‌های فایل Excel نامعتبر است' });
      }

      const headers = firstRow as any[];
      console.log('Headers found:', headers.length);
      
      // Filter out empty headers and convert to string
      const validHeaders = headers
        .map((h: any, index: number) => {
          if (h === null || h === undefined) {
            return `ستون ${index + 1}`;
          }
          const str = String(h).trim();
          return str || `ستون ${index + 1}`;
        })
        .filter((h: string) => h && h.trim() !== '');

      if (validHeaders.length === 0) {
        console.log('No valid headers found');
        return res.status(400).json({ error: 'هیچ ستونی در فایل Excel یافت نشد' });
      }

      console.log('Valid headers:', validHeaders.length);

      // Get first few rows as preview
      const preview = jsonData.slice(0, Math.min(6, jsonData.length));

      console.log('Preview data prepared, sending response...');
      res.json({
        headers: validHeaders,
        preview,
        totalRows: jsonData.length - 1, // Exclude header
      });
    } catch (parseError: any) {
      console.error('Excel parsing error:', parseError);
      console.error('Error stack:', parseError.stack);
      return res.status(400).json({ 
        error: `خطا در خواندن فایل Excel: ${parseError.message || 'فایل معتبر نیست'}`,
        details: process.env.NODE_ENV === 'development' ? parseError.stack : undefined
      });
    }
  } catch (error: any) {
    console.error('Preview Excel error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'خطا در خواندن فایل Excel',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;


