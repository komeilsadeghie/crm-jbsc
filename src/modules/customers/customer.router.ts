import { Router } from 'express';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateCustomerScore,
  getCustomerSegments,
  bulkDeleteCustomers,
} from './customer.service';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { CustomerStatus, CustomerType } from './customer.types';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const {
      type,
      status,
      category,
      search,
      tags,
      customerModels,
      createdById,
      dateFrom,
      dateTo,
      journey_stage,
      coach_id,
    } = req.query;

    const tagIds = typeof tags === 'string' ? tags.split(',') : undefined;
    const customerModelsArray =
      typeof customerModels === 'string'
        ? customerModels.split(',').map((model) => parseInt(model, 10)).filter((value) => !Number.isNaN(value))
        : undefined;

    const customers = await listCustomers({
      type: type as CustomerType | undefined,
      status: status as CustomerStatus | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
      tagIds,
      customerModels: customerModelsArray,
      createdById: createdById as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      journey_stage: journey_stage as string | undefined,
      coach_id: coach_id as string | undefined,
    });

    // Always return an array, even if empty
    const result = Array.isArray(customers) ? customers : [];
    console.log(`✅ Returning ${result.length} customers`);
    res.json(result);
  } catch (error: any) {
    console.error('Error in customers GET route:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    });
    // Return empty array instead of error to prevent frontend crash
    res.json([]);
  }
});

router.get('/segments', authenticate, async (_req, res) => {
  try {
    const segments = await getCustomerSegments();
    res.json(segments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت سگمنت‌های مشتری' });
  }
});

// Bulk delete customers - MUST be before /:id route
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
    }

    const deletedCount = await bulkDeleteCustomers(ids);
    res.json({ 
      message: `${deletedCount} مشتری و تمام موارد مرتبط با موفقیت حذف شد`,
      deletedCount 
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'خطا در حذف گروهی مشتریان: ' + (error instanceof Error ? error.message : 'خطای نامشخص') });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await getCustomerById(id);
    res.json(customer);
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات مشتری' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const payload = req.body;
    const userId = req.user?.id;
    const customer = await createCustomer(payload, userId);
    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof Error && error.message.includes('customerModel')) {
      return res.status(400).json({ error: error.message });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در ثبت مشتری' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const customer = await updateCustomer(id, payload);
    res.json(customer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return res.status(404).json({ error: 'مشتری یافت نشد' });
      }

      if (error.message.includes('customerModel')) {
        return res.status(400).json({ error: error.message });
      }
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی مشتری' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCustomer(id);
    res.json({ message: 'مشتری و تمام موارد مرتبط با موفقیت حذف شد' });
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف مشتری: ' + (error instanceof Error ? error.message : 'خطای نامشخص') });
  }
});

router.patch('/:id/score', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;

    if (typeof score !== 'number') {
      return res.status(400).json({ error: 'نمره باید عدد باشد' });
    }

    const customer = await updateCustomerScore(id, score);
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی نمره' });
  }
});

// Convert customer to project (create account if needed, then create project)
router.post('/:id/convert-to-project', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { project_name, project_description } = req.body;
    const userId = req.user?.id ? parseInt(String(req.user.id)) : null;

    // Import db helpers
    const { db } = await import('../../database/db');
    
    const dbGet = (query: string, params: any[]): Promise<any> => {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };

    const dbRun = (query: string, params: any[]): Promise<{ lastID?: number; changes: number }> => {
      return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    };

    // Get customer
    const customer = await getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }

    // Find or create account
    const accountName = (customer as any).company_name || customer.name;
    let accountId: number | null = null;

    // Try to find existing account by name
    const existingAccount = await dbGet(
      'SELECT id FROM accounts WHERE name = ?',
      [accountName]
    );

    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      // Create new account
      const accountResult = await dbRun(
        `INSERT INTO accounts (name, website, status, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          accountName,
          (customer as any).website || null,
          'active'
        ]
      );
      accountId = accountResult.lastID || null;
    }

    if (!accountId) {
      return res.status(500).json({ error: 'خطا در ایجاد حساب برای مشتری' });
    }

    // Create project
    const projectName = project_name || `پروژه ${customer.name}`;
    const projectDesc = project_description || 
      `پروژه ایجاد شده از مشتری ${customer.name}${(customer as any).company_name ? ` (${(customer as any).company_name})` : ''}${(customer as any).website ? `\nوب‌سایت: ${(customer as any).website}` : ''}`;

    // Validate created_by
    let finalCreatedBy: number | null = null;
    if (userId) {
      const user = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
      if (user) {
        finalCreatedBy = userId;
      }
    }

    const projectResult = await dbRun(
      `INSERT INTO projects (
        account_id, name, description, status, budget, manager_id, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        accountId,
        projectName,
        projectDesc,
        'planning',
        (customer as any).site_costs || null,
        null, // manager_id - can be set later
        finalCreatedBy
      ]
    );

    const projectId = projectResult.lastID;

    if (!projectId) {
      return res.status(500).json({ error: 'خطا در ایجاد پروژه' });
    }

    res.status(201).json({
      message: 'پروژه با موفقیت ایجاد شد',
      project_id: projectId,
      account_id: accountId,
      project_name: projectName
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }
    console.error('Error converting customer to project:', error);
    res.status(500).json({
      error: 'خطا در تبدیل مشتری به پروژه',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;


