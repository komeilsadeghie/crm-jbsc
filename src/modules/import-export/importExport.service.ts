import xlsx from 'xlsx';
import { db } from '../../database/db';

export type ImportModule =
  | 'customers'
  | 'deals'
  | 'coachingPrograms'
  | 'contentItems';

interface ImportOptions {
  module: ImportModule;
  file: Buffer;
  mapping: Record<string, string>;
  createdById?: string;
}

interface ImportResult {
  successCount: number;
  errors: Array<{ row: number; error: string }>;
}

// Helper functions for database operations
const dbGet = (query: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (query: string, params: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const dbRun = (query: string, params: any[]): Promise<{ lastID?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const workbookFromBuffer = (buffer: Buffer) => {
  return xlsx.read(buffer, { type: 'buffer' });
};

const sheetToJson = (buffer: Buffer) => {
  const workbook = workbookFromBuffer(buffer);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
};

const mapRow = (row: Record<string, any>, mapping: Record<string, string>) => {
  return Object.entries(mapping).reduce<Record<string, any>>(
    (acc, [column, field]) => {
      acc[field] = row[column];
      return acc;
    },
    {},
  );
};

const mapEnumValue = <T extends Record<string, string>>(
  value: string | null | undefined,
  enumeration: T,
  fallback: T[keyof T],
): T[keyof T] => {
  if (!value) {
    return fallback;
  }

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '_');

  return enumeration[normalized as keyof T] ?? fallback;
};

const DealStage = {
  DISCOVERY: 'discovery',
  PROPOSAL: 'proposal',
  CONTRACT: 'contract',
  DESIGN: 'design',
  DEVELOPMENT: 'development',
  QA: 'qa',
  DELIVERY: 'delivery',
  SUPPORT: 'support',
} as const;

const CoachingProgramStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
} as const;

const ContentItemStatus = {
  BRIEFED: 'briefed',
  PRODUCING: 'producing',
  REVIEW: 'review',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

const ContentItemType = {
  POST: 'post',
  VIDEO: 'video',
  REELS: 'reels',
  BLOG: 'blog',
  PAGE: 'page',
} as const;

export const exportModuleToExcel = async (module: ImportModule) => {
  let data: any[] = [];

  switch (module) {
    case 'customers':
      const customers = await dbAll(
        `SELECT c.*, 
         GROUP_CONCAT(t.name) as tag_names
         FROM customers c
         LEFT JOIN entity_tags et ON et.customer_id = c.id AND et.entity_type = 'CUSTOMER'
         LEFT JOIN tags t ON et.tag_id = t.id
         GROUP BY c.id`,
        []
      );
      data = customers.map((customer: any) => ({
        ...customer,
        tags: customer.tag_names || null,
      }));
      break;

    case 'deals':
      data = await dbAll('SELECT * FROM deals', []);
      break;

    case 'coachingPrograms':
      data = await dbAll('SELECT * FROM coaching_programs', []);
      break;

    case 'contentItems':
      data = await dbAll('SELECT * FROM content_items', []);
      break;

    default:
      throw new Error('MODULE_NOT_SUPPORTED');
  }

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, module);

  return xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
};

const normalizeValue = (value: any) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
};

const importCustomers = async (
  rows: Record<string, any>[],
  createdById?: string,
): Promise<ImportResult> => {
  const errors: ImportResult['errors'] = [];
  let successCount = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (!row.name || !row.type) {
      errors.push({
        row: index + 2,
        error: 'نام و نوع مشتری الزامی است',
      });
      continue;
    }

    try {
      await dbRun(
        `INSERT INTO customers (name, type, email, phone, company_name, address, website, score, status, category, notes, customer_model, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.name,
          row.type,
          normalizeValue(row.email),
          normalizeValue(row.phone),
          normalizeValue(row.companyName || row.company_name),
          normalizeValue(row.address),
          normalizeValue(row.website),
          Number(row.score) || 0,
          row.status || 'active',
          normalizeValue(row.category),
          normalizeValue(row.notes),
          row.customerModel ? Number(row.customerModel) : null,
          createdById || null,
        ]
      );

      successCount++;
    } catch (error: any) {
      errors.push({ row: index + 2, error: error.message });
    }
  }

  return { successCount, errors };
};

const importDeals = async (
  rows: Record<string, any>[],
): Promise<ImportResult> => {
  const errors: ImportResult['errors'] = [];
  let successCount = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (!row.title || !row.account_id) {
      errors.push({
        row: index + 2,
        error: 'عنوان و شناسه حساب الزامی است',
      });
      continue;
    }

    try {
      await dbRun(
        `INSERT INTO deals (title, account_id, contact_id, stage, budget, probability, services, site_model, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.title,
          row.account_id,
          row.contact_id || null,
          mapEnumValue(row.stage, DealStage, DealStage.DISCOVERY),
          row.budget ? Number(row.budget) : null,
          Number(row.probability) || 0,
          normalizeValue(row.services),
          normalizeValue(row.site_model),
          normalizeValue(row.notes),
        ]
      );

      successCount++;
    } catch (error: any) {
      errors.push({ row: index + 2, error: error.message });
    }
  }

  return { successCount, errors };
};

const importCoachingPrograms = async (
  rows: Record<string, any>[],
): Promise<ImportResult> => {
  const errors: ImportResult['errors'] = [];
  let successCount = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (!row.program_type || !row.account_id) {
      errors.push({
        row: index + 2,
        error: 'نوع برنامه و شناسه حساب الزامی است',
      });
      continue;
    }

    try {
      await dbRun(
        `INSERT INTO coaching_programs (account_id, contact_id, program_type, duration_months, price, start_date, end_date, overall_goals, status, coach_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.account_id,
          row.contact_id || null,
          row.program_type || 'individual',
          row.durationMonths ? Number(row.durationMonths) : null,
          row.price ? Number(row.price) : null,
          row.start_date || null,
          row.end_date || null,
          normalizeValue(row.overallGoals || row.overall_goals),
          mapEnumValue(row.status, CoachingProgramStatus, CoachingProgramStatus.ACTIVE),
          row.coach_id || null,
        ]
      );

      successCount++;
    } catch (error: any) {
      errors.push({ row: index + 2, error: error.message });
    }
  }

  return { successCount, errors };
};

const importContentItems = async (
  rows: Record<string, any>[],
): Promise<ImportResult> => {
  const errors: ImportResult['errors'] = [];
  let successCount = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (!row.title || !row.content_type) {
      errors.push({
        row: index + 2,
        error: 'عنوان و نوع محتوا الزامی است',
      });
      continue;
    }

    try {
      await dbRun(
        `INSERT INTO content_items (brief_id, deal_id, content_type, title, status, platform, publish_date, links, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.brief_id || null,
          row.deal_id || null,
          mapEnumValue(row.content_type, ContentItemType, ContentItemType.POST),
          row.title,
          mapEnumValue(row.status, ContentItemStatus, ContentItemStatus.BRIEFED),
          normalizeValue(row.platform),
          row.publish_date || null,
          normalizeValue(row.links),
          normalizeValue(row.notes),
        ]
      );

      successCount++;
    } catch (error: any) {
      errors.push({ row: index + 2, error: error.message });
    }
  }

  return { successCount, errors };
};

export const importModuleFromExcel = async ({
  module,
  file,
  mapping,
  createdById,
}: ImportOptions): Promise<ImportResult> => {
  // If mapping is empty or not provided, try to use column names directly
  let jsonRows = sheetToJson(file);
  
  if (mapping && Object.keys(mapping).length > 0) {
    // Map columns using provided mapping
    jsonRows = jsonRows.map((row) => mapRow(row, mapping));
  } else {
    // Try to use column names directly (case-insensitive matching)
    jsonRows = jsonRows.map((row) => {
      const mappedRow: Record<string, any> = {};
      Object.keys(row).forEach((key) => {
        const normalizedKey = key.toLowerCase().trim();
        // Try to match common field names
        if (normalizedKey.includes('name') || normalizedKey.includes('نام')) {
          mappedRow.name = row[key];
        } else if (normalizedKey.includes('type') || normalizedKey.includes('نوع')) {
          mappedRow.type = row[key];
        } else if (normalizedKey.includes('email') || normalizedKey.includes('ایمیل')) {
          mappedRow.email = row[key];
        } else if (normalizedKey.includes('phone') || normalizedKey.includes('تلفن') || normalizedKey.includes('موبایل')) {
          mappedRow.phone = row[key];
        } else if (normalizedKey.includes('company') || normalizedKey.includes('شرکت')) {
          mappedRow.company_name = row[key];
        } else if (normalizedKey.includes('address') || normalizedKey.includes('آدرس')) {
          mappedRow.address = row[key];
        } else if (normalizedKey.includes('website') || normalizedKey.includes('وب') || normalizedKey.includes('سایت')) {
          mappedRow.website = row[key];
        } else if (normalizedKey.includes('score') || normalizedKey.includes('امتیاز')) {
          mappedRow.score = row[key];
        } else if (normalizedKey.includes('status') || normalizedKey.includes('وضعیت')) {
          mappedRow.status = row[key];
        } else if (normalizedKey.includes('category') || normalizedKey.includes('دسته')) {
          mappedRow.category = row[key];
        } else if (normalizedKey.includes('notes') || normalizedKey.includes('یادداشت') || normalizedKey.includes('توضیحات')) {
          mappedRow.notes = row[key];
        }
      });
      return mappedRow;
    });
  }

  switch (module) {
    case 'customers':
      return importCustomers(jsonRows, createdById);

    case 'deals':
      return importDeals(jsonRows);

    case 'coachingPrograms':
      return importCoachingPrograms(jsonRows);

    case 'contentItems':
      return importContentItems(jsonRows);

    default:
      throw new Error('MODULE_NOT_SUPPORTED');
  }
};
