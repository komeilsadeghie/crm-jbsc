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
    const { file, mapping, createDeals, createProjects } = req.body as { 
      file: string; 
      mapping: Record<string, string>;
      createDeals?: boolean;
      createProjects?: boolean;
    };
    
    // Log createProjects value for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Import request params:', { createDeals, createProjects });
    }

    if (!file) {
      return res.status(400).json({ error: 'فایل Excel ارسال نشده است' });
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      return res.status(400).json({ error: 'نگاشت ستون‌ها ارسال نشده است' });
    }
    
    // Validate that required fields are mapped
    const requiredFields = ['name'];
    const mappedFields = Object.values(mapping);
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `ستون "نام و نام خانوادگی" باید به فیلد "name" نگاشت شود. لطفاً در بخش نگاشت ستون‌ها، ستون "نام و نام خانوادگی" را انتخاب کنید.`,
        missingFields,
        currentMapping: mapping,
        mappedFields: mappedFields
      });
    }

    const buffer = Buffer.from(file, 'base64');
    
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'فایل Excel خالی است یا به درستی decode نشده است' });
    }
    
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    
    if (!sheet) {
      return res.status(400).json({ error: 'هیچ sheet در فایل Excel یافت نشد' });
    }
    
    const jsonRows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    
    if (jsonRows.length === 0) {
      return res.status(400).json({ error: 'هیچ داده‌ای در فایل Excel یافت نشد' });
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
      
      // Map columns using mapping - after mapping, only use system field names
      const mappedRow: Record<string, any> = {};
      Object.entries(mapping).forEach(([excelColumn, systemField]) => {
        // Check if the Excel column exists in the row
        if (row.hasOwnProperty(excelColumn)) {
          mappedRow[systemField] = row[excelColumn];
        }
      });
      
      // Log only first row for debugging
      if (index === 0 && process.env.NODE_ENV === 'development') {
        console.log('First row - Original Excel columns:', Object.keys(row));
        console.log('First row - Mapping config:', mapping);
        console.log('First row - Mapped data:', mappedRow);
      }

      // Extract customer data - use only system field names after mapping
      let customerName = mappedRow.name;
      
      // If not found in mapped data, try to get from the Excel column that was mapped to 'name'
      if (!customerName || String(customerName).trim() === '' || customerName === 'nan' || customerName === 'NaN') {
        // Find which Excel column is mapped to 'name'
        const nameMappedColumn = Object.keys(mapping).find(key => mapping[key] === 'name');
        if (nameMappedColumn && row[nameMappedColumn] && String(row[nameMappedColumn]).trim() !== '' && row[nameMappedColumn] !== 'nan' && row[nameMappedColumn] !== 'NaN') {
          customerName = String(row[nameMappedColumn]).trim();
        } else {
          // Fallback: try common column names
          const nameColumns = ['نام و نام خانوادگی', 'name', 'Name', 'NAME', 'نام'];
          for (const col of nameColumns) {
            if (row[col] && String(row[col]).trim() !== '' && row[col] !== 'nan' && row[col] !== 'NaN') {
              customerName = String(row[col]).trim();
              break;
            }
          }
        }
      }
      
      // Clean up customer name - remove 'nan' values
      if (customerName && (String(customerName).toLowerCase() === 'nan' || String(customerName).trim() === '')) {
        customerName = null;
      }
      
      // Extract fields using system field names only (already mapped from Excel columns)
      // Clean up phone - handle 'nan' values
      let phone = mappedRow.phone;
      if (phone && (String(phone).toLowerCase() === 'nan' || String(phone).trim() === '')) {
        phone = null;
      }
      const website = mappedRow.website || mappedRow.company_name;
      const activityType = mappedRow.type || 'export';
      const productName = mappedRow.product_name;
      const serviceCost = mappedRow.service_cost;
      const balance = mappedRow.balance;
      const websiteStartDate = mappedRow.website_start_date;
      const websiteDeliveryDate = mappedRow.website_delivery_date;
      // For code and designer, check both mapped and direct row access as fallback
      const codeColumn = mappedRow.code || row['Code'] || row['CODE'] || row['کد'];
      const designerColumn = mappedRow.designer || row['Designer'] || row['DESIGNER'] || row['طراح'];
      
      // New Excel fields - use system field names only
      const gender = mappedRow.gender;
      const siteLanguagesCount = mappedRow.site_languages_count;
      const serviceType = mappedRow.service_type;
      const deliveryDeadline = mappedRow.delivery_deadline;
      const siteCosts = mappedRow.site_costs;
      const initialDeliveryDate = mappedRow.initial_delivery_date;
      const languagesAddedDate = mappedRow.languages_added_date;
      
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
        // Find which Excel column is mapped to 'name' for better error message
        const nameMappedColumn = Object.keys(mapping).find(key => mapping[key] === 'name');
        const columnName = nameMappedColumn || 'نام و نام خانوادگی';
        
        errors.push({
          row: index + 2,
          error: `نام مشتری در ستون "${columnName}" خالی است یا یافت نشد. لطفاً مقدار این ستون را در ردیف ${index + 2} بررسی کنید.`,
        });
        continue;
      }

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
              normalizeValue(productName ? `محصول: ${productName}` : mappedRow.notes),
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
            // Validate user_id exists before inserting to avoid foreign key constraint error
            let createdById: number | null = null;
            if (req.user?.id && Number.isInteger(Number(req.user.id))) {
              const userId = Number(req.user.id);
              const userExists = await dbGet(`SELECT id FROM users WHERE id = ?`, [userId]);
              if (userExists) {
                createdById = userId;
              }
            }

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
                normalizeValue(productName ? `محصول: ${productName}` : mappedRow.notes),
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
                createdById,
              ]
            );
            customerId = customerResult.lastID!;
            successCount++;
          } catch (insertError: any) {
            // Only log detailed error in development or for first few errors
            if (process.env.NODE_ENV === 'development' || errors.length < 5) {
              console.error(`❌ Error inserting customer in row ${index + 2}:`, insertError.message);
            }
            // Check if it's a foreign key constraint error
            if (insertError.code === 'SQLITE_CONSTRAINT' && insertError.message?.includes('FOREIGN KEY')) {
              errors.push({
                row: index + 2,
                error: `خطا در محدودیت کلید خارجی: ${insertError.message}`,
              });
              continue;
            }
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
            // Log but don't fail - continue without accountId
          }
        }
        
        // Log if accountId is still null (for debugging)
        if (!accountId && process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ No accountId created for customer ${customerId} (${customerName})`);
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
              } else {
                // Create new deal - validate user_id exists
                let dealCreatedBy: number | null = null;
                if (req.user?.id && Number.isInteger(Number(req.user.id))) {
                  const userId = Number(req.user.id);
                  const userExists = await dbGet(`SELECT id FROM users WHERE id = ?`, [userId]);
                  if (userExists) {
                    dealCreatedBy = userId;
                  }
                }

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
                    dealCreatedBy,
                  ]
                );
                dealId = dealResult.lastID || null;
                dealsCreated++;
              }
            }
          } catch (dealError: any) {
            // Log but don't fail the import
            console.error(`Error creating/updating deal for account ${accountId}:`, dealError);
          }
        }

        // Create project if createProjects is true (for all customers)
        // Ensure accountId exists - if not, create it
        if (createProjects) {
          if (!accountId) {
            // Try to create account if it doesn't exist
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
              if (process.env.NODE_ENV === 'development') {
                console.log(`Created account ${accountId} for customer ${customerId}`);
              }
            } catch (accountError: any) {
              console.error(`Error creating account for project:`, accountError);
            }
          }
          
          if (accountId) {
          try {
            // Use serviceCost or balanceValue as budget, or null if neither exists
            const costValue = serviceCost || balanceValue;
            const budget = costValue ? Number(String(costValue).replace(/,/g, '')) : null;

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

            // Extract payment stages from mapped fields (use system field names only)
            const paymentStage1 = mappedRow['payment_stage_1'] || null;
            const paymentStage1Date = mappedRow['payment_stage_1_date'] || null;
            const paymentStage2 = mappedRow['payment_stage_2'] || null;
            const paymentStage2Date = mappedRow['payment_stage_2_date'] || null;
            const paymentStage3 = mappedRow['payment_stage_3'] || null;
            const paymentStage3Date = mappedRow['payment_stage_3_date'] || null;
            const paymentStage4 = mappedRow['payment_stage_4'] || null;
            const paymentStage4Date = mappedRow['payment_stage_4_date'] || null;
            
            // Extract settlements (use system field names only)
            const settlementKamil = mappedRow['settlement_kamil'] || null;
            const settlementAsdan = mappedRow['settlement_asdan'] || null;
            const settlementSoleimani = mappedRow['settlement_soleimani'] || null;
            
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
            const projectDescription = `پروژه طراحی وب‌سایت برای ${customerName}${website ? `\nوب‌سایت: ${website}` : ''}${productName ? `\nمحصول: ${productName}` : ''}${customerCode ? `\nکد: ${customerCode}` : ''}${designerColumn ? `\nطراح: ${designerColumn}` : ''}${siteLanguagesCount ? `\nتعداد زبان‌ها: ${siteLanguagesCount}` : ''}${serviceType ? `\nنوع خدمات: ${serviceType}` : ''}${balanceValue > 0 ? `\nمانده پرداخت: ${new Intl.NumberFormat('fa-IR').format(balanceValue)} تومان` : ''}`;

            // Check if project already exists for this account
            const existingProject = await dbGet(
              `SELECT id FROM projects WHERE account_id = ? AND name = ?`,
              [accountId, projectName]
            );

            if (existingProject) {
              // Validate user_id exists before updating
              let projectManagerId: number | null = null;
              if (req.user?.id && Number.isInteger(Number(req.user.id))) {
                const userId = Number(req.user.id);
                const userExists = await dbGet(`SELECT id FROM users WHERE id = ?`, [userId]);
                if (userExists) {
                  projectManagerId = userId;
                }
              }

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
                  projectManagerId,
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
            } else {
              // Validate user_id exists before creating project
              let projectManagerId: number | null = null;
              let projectCreatedBy: number | null = null;
              if (req.user?.id && Number.isInteger(Number(req.user.id))) {
                const userId = Number(req.user.id);
                const userExists = await dbGet(`SELECT id FROM users WHERE id = ?`, [userId]);
                if (userExists) {
                  projectManagerId = userId;
                  projectCreatedBy = userId;
                }
              }

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
                  projectManagerId,
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
                  projectCreatedBy,
                ]
              );
              projectsCreated++;
            }
            } catch (projectError: any) {
              // Log but don't fail the import
              console.error(`Error creating project for account ${accountId}:`, projectError);
              if (process.env.NODE_ENV === 'development') {
                console.error('Project error details:', projectError.message);
              }
            }
          } else {
            // Log if accountId is still null after attempt to create
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ Cannot create project: accountId is still null for customer ${customerId} (${customerName})`);
            }
          }
        }
      } catch (error: any) {
        // Only log detailed errors in development or for first few errors
        if (process.env.NODE_ENV === 'development' || errors.length < 5) {
          console.error(`❌ Error processing row ${index + 2}:`, error.message);
        }
        
        // Check if it's a SQL error about missing column or foreign key constraint
        const errorMessage = error.message || String(error);
        let userFriendlyError = errorMessage;
        
        if (error.code === 'SQLITE_CONSTRAINT' && errorMessage.includes('FOREIGN KEY')) {
          userFriendlyError = `خطا در محدودیت کلید خارجی. لطفاً مطمئن شوید که تمام ارجاعات معتبر هستند.`;
        } else if (errorMessage.includes('no column named')) {
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

    // Only log completion summary, not detailed logs for every row
    if (process.env.NODE_ENV === 'development' || errors.length > 0) {
      console.log('Import completed:', { successCount, dealsCreated, projectsCreated, errorsCount: errors.length });
    }
    
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
    const { file } = req.body as { file: string };

    if (!file) {
      return res.status(400).json({ error: 'فایل Excel ارسال نشده است' });
    }

    if (typeof file !== 'string') {
      return res.status(400).json({ error: 'فرمت فایل نامعتبر است' });
    }

    try {
      // Decode base64
      let buffer: Buffer;
      try {
        buffer = Buffer.from(file, 'base64');
        if (buffer.length === 0) {
          return res.status(400).json({ error: 'فایل خالی است یا base64 معتبر نیست' });
        }
      } catch (decodeError: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Base64 decode error:', decodeError);
        }
        return res.status(400).json({ error: 'خطا در decode کردن فایل: ' + (decodeError.message || 'فرمت base64 نامعتبر') });
      }

      // Read Excel file
      let workbook: xlsx.WorkBook;
      try {
        workbook = xlsx.read(buffer, { 
          type: 'buffer',
          cellDates: false,
          cellNF: false,
          cellStyles: false,
          sheetStubs: false
        });
      } catch (readError: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Excel read error:', readError);
        }
        return res.status(400).json({ error: 'خطا در خواندن فایل Excel: ' + (readError.message || 'فایل Excel معتبر نیست') });
      }
      
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        return res.status(400).json({ error: 'فایل Excel معتبر نیست یا خالی است' });
      }

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      
      if (!sheet) {
        return res.status(400).json({ error: 'نمی‌توان صفحه اول Excel را خواند' });
      }

      // Convert to JSON
      let jsonData: any[];
      try {
        jsonData = xlsx.utils.sheet_to_json(sheet, { 
          defval: '', 
          header: 1,
          raw: false,
          blankrows: false
        });
      } catch (jsonError: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('JSON conversion error:', jsonError);
        }
        return res.status(400).json({ error: 'خطا در تبدیل داده‌ها: ' + (jsonError.message || 'داده‌ها قابل تبدیل نیستند') });
      }

      if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
        return res.status(400).json({ error: 'فایل Excel خالی است' });
      }

      // Get first row as headers
      const firstRow = jsonData[0];
      if (!firstRow || !Array.isArray(firstRow)) {
        return res.status(400).json({ error: 'ستون‌های فایل Excel نامعتبر است' });
      }

      const headers = firstRow as any[];
      
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
        return res.status(400).json({ error: 'هیچ ستونی در فایل Excel یافت نشد' });
      }

      // Get first few rows as preview
      const preview = jsonData.slice(0, Math.min(6, jsonData.length));
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


