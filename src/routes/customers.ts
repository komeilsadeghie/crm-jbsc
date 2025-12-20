import express, { Response } from 'express';
import { db, isMySQL } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Customer } from '../types';

const router = express.Router();

// Helper functions to promisify database calls
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

const dbRun = (query: string, params: any[]): Promise<{ lastID?: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Get all customers with filters
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { type, status, category, search, sortBy = 'created_at', order = 'DESC' } = req.query;
  
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += ` ORDER BY ${sortBy} ${order}`;

  db.all(query, params, (err, customers) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت اطلاعات مشتریان' });
    }
    // Ensure we always return an array
    res.json(Array.isArray(customers) ? customers : []);
  });
});

// Bulk delete customers - MUST be before /:id route
router.post('/bulk-delete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
    }

    // Get all customers to find related accounts
    const placeholders = ids.map(() => '?').join(',');
    const customers = await dbAll(`SELECT id, name, company_name FROM customers WHERE id IN (${placeholders})`, ids);

    if (!customers || customers.length === 0) {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }

    // Collect all account names
    const accountNames: string[] = [];
    customers.forEach((customer: any) => {
      const accountName = customer.company_name || customer.name;
      if (accountName && !accountNames.includes(accountName)) {
        accountNames.push(accountName);
      }
    });

    if (accountNames.length > 0) {
      const accountPlaceholders = accountNames.map(() => '?').join(',');
      const accounts = await dbAll(`SELECT id FROM accounts WHERE name IN (${accountPlaceholders})`, accountNames);

      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map((a: any) => a.id);
        const accountIdsPlaceholders = accountIds.map(() => '?').join(',');

        // Delete related data
        // Get invoice IDs first
        const invoices = await dbAll(`SELECT id FROM invoices WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        if (invoices && invoices.length > 0) {
          const invoiceIds = invoices.map((inv: any) => inv.id);
          const invoicePlaceholders = invoiceIds.map(() => '?').join(',');
          
          // Delete invoice items
          await dbRun(`DELETE FROM invoice_items WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
          // Delete payments
          await dbRun(`DELETE FROM payments WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
        }

        // Delete invoices
        await dbRun(`DELETE FROM invoices WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        
        // Delete estimates
        await dbRun(`DELETE FROM estimates WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        
        // Delete proposals
        await dbRun(`DELETE FROM proposals WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        
        // Delete contracts
        await dbRun(`DELETE FROM contracts WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        
        // Delete deals
        await dbRun(`DELETE FROM deals WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        
        // Delete projects
        const projects = await dbAll(`SELECT id FROM projects WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        if (projects && projects.length > 0) {
          const projectIds = projects.map((p: any) => p.id);
          const projectPlaceholders = projectIds.map(() => '?').join(',');
          
          // Delete project discussions
          await dbRun(`DELETE FROM project_discussions WHERE project_id IN (${projectPlaceholders})`, projectIds);
        }
        
        await dbRun(`DELETE FROM projects WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
        
        // Delete accounts
        await dbRun(`DELETE FROM accounts WHERE id IN (${accountIdsPlaceholders})`, accountIds);
      }
    }

    // Delete interactions
    await dbRun(`DELETE FROM interactions WHERE customer_id IN (${placeholders})`, ids);

    // Delete related leads
    const leadNameExpr = isMySQL 
      ? 'CONCAT(first_name, " ", last_name)'
      : 'first_name || " " || last_name';
    for (const customer of customers) {
      const accountName = customer.company_name || customer.name;
      await dbRun(`DELETE FROM leads WHERE ${leadNameExpr} = ? OR company_name = ?`, 
        [customer.name, accountName]);
    }

    // Finally, delete customers
    const result = await dbRun(`DELETE FROM customers WHERE id IN (${placeholders})`, ids);
    
    res.json({ 
      message: `${result.changes} مشتری و تمام موارد مرتبط با موفقیت حذف شد`,
      deletedCount: result.changes 
    });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'خطا در حذف گروهی مشتریان: ' + (error.message || 'خطای نامشخص') });
  }
});

// Get single customer
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM customers WHERE id = ?', [id], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت اطلاعات مشتری' });
    }
    if (!customer) {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }
    res.json(customer);
  });
});

// Create customer
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const customer: Customer = req.body;
  const userId = req.user?.id;

  // Generate unique_id for customer (based on name + phone)
  const namePart = (customer.name || '').trim().replace(/\s+/g, '_').toLowerCase();
  const phonePart = (customer.phone || '').trim().replace(/\D/g, '');
  const emailPart = (customer.email || '').trim().toLowerCase().split('@')[0];
  
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

  db.run(
    `INSERT INTO customers (name, type, email, phone, company_name, address, website, score, status, category, notes, code, designer, gender, site_languages_count, service_type, delivery_deadline, site_costs, initial_delivery_date, languages_added_date, unique_id, journey_stage, coach_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer.name,
      customer.type || 'coaching',
      customer.email || null,
      customer.phone || null,
      customer.company_name || null,
      customer.address || null,
      customer.website || null,
      customer.score || 0,
      customer.status || 'active',
      customer.category || null,
      customer.notes || null,
      customer.code || null,
      customer.designer || null,
      customer.gender || null,
      customer.site_languages_count || null,
      customer.service_type || null,
      customer.delivery_deadline || null,
      customer.site_costs || null,
      customer.initial_delivery_date || null,
      customer.languages_added_date || null,
      uniqueId,
      customer.journey_stage || 'code_executed',
      customer.coach_id || null,
      userId
    ],
    function(err) {
      if (err) {
        console.error('❌ Error creating customer:', err);
        console.error('❌ SQL Error:', err.message);
        console.error('❌ Customer data:', customer);
        return res.status(500).json({ 
          error: 'خطا در ثبت مشتری',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined,
          sqlError: process.env.NODE_ENV === 'development' ? err.toString() : undefined
        });
      }
      res.status(201).json({ id: this.lastID, message: 'مشتری با موفقیت ثبت شد' });
    }
  );
});

// Update customer
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const customer: Customer = req.body;

  // Note: unique_id is NOT updated - it remains constant for each customer
  db.run(
    `UPDATE customers SET 
      name = ?, type = ?, email = ?, phone = ?, company_name = ?, address = ?, 
      website = ?, score = ?, status = ?, category = ?, notes = ?, code = ?, designer = ?, 
      gender = ?, site_languages_count = ?, service_type = ?, delivery_deadline = ?, 
      site_costs = ?, initial_delivery_date = ?, languages_added_date = ?, 
      journey_stage = ?, coach_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      customer.name,
      customer.type || 'coaching',
      customer.email || null,
      customer.phone || null,
      customer.company_name || null,
      customer.address || null,
      customer.website || null,
      customer.score || 0,
      customer.status || 'active',
      customer.category || null,
      customer.notes || null,
      customer.code || null,
      customer.designer || null,
      customer.gender || null,
      customer.site_languages_count || null,
      customer.service_type || null,
      customer.delivery_deadline || null,
      customer.site_costs || null,
      customer.initial_delivery_date || null,
      customer.languages_added_date || null,
      customer.journey_stage || 'code_executed',
      customer.coach_id || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی مشتری' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'مشتری یافت نشد' });
      }
      res.json({ message: 'مشتری با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Convert customer to project (create account if needed, then create project)
router.post('/:id/convert-to-project', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { project_name, project_description } = req.body;
    const userId = req.user?.id ? parseInt(String(req.user.id)) : null;

    // Get customer
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }

    // Find or create account
    const accountName = customer.company_name || customer.name;
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
          customer.website || null,
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
      `پروژه ایجاد شده از مشتری ${customer.name}${customer.company_name ? ` (${customer.company_name})` : ''}${customer.website ? `\nوب‌سایت: ${customer.website}` : ''}`;

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
        customer.site_costs || null,
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
    console.error('Error converting customer to project:', error);
    res.status(500).json({
      error: 'خطا در تبدیل مشتری به پروژه',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete customer
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // First, get customer info to find related accounts
    const customer = await dbGet('SELECT name, company_name FROM customers WHERE id = ?', [id]);
    
    if (!customer) {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }

    // Find related accounts by name or company_name
    const accountName = customer.company_name || customer.name;
    const accounts = await dbAll('SELECT id FROM accounts WHERE name = ?', [accountName]);
    const accountIds = accounts ? accounts.map((a: any) => a.id) : [];

    // Delete related data in cascade order
    if (accountIds.length > 0) {
      const accountPlaceholders = accountIds.map(() => '?').join(',');
      
      // Get invoice IDs first
      const invoices = await dbAll(`SELECT id FROM invoices WHERE account_id IN (${accountPlaceholders})`, accountIds);
      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((inv: any) => inv.id);
        const invoicePlaceholders = invoiceIds.map(() => '?').join(',');
        
        // Delete invoice items
        await dbRun(`DELETE FROM invoice_items WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
        // Delete payments
        await dbRun(`DELETE FROM payments WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
      }

      // Delete invoices
      await dbRun(`DELETE FROM invoices WHERE account_id IN (${accountPlaceholders})`, accountIds);
      
      // Delete estimates
      await dbRun(`DELETE FROM estimates WHERE account_id IN (${accountPlaceholders})`, accountIds);
      
      // Delete proposals
      await dbRun(`DELETE FROM proposals WHERE account_id IN (${accountPlaceholders})`, accountIds);
      
      // Delete contracts
      await dbRun(`DELETE FROM contracts WHERE account_id IN (${accountPlaceholders})`, accountIds);
      
      // Delete deals
      await dbRun(`DELETE FROM deals WHERE account_id IN (${accountPlaceholders})`, accountIds);
      
      // Delete projects (and related data)
      const projects = await dbAll(`SELECT id FROM projects WHERE account_id IN (${accountPlaceholders})`, accountIds);
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p: any) => p.id);
        const projectPlaceholders = projectIds.map(() => '?').join(',');
        
        // Delete project discussions
        await dbRun(`DELETE FROM project_discussions WHERE project_id IN (${projectPlaceholders})`, projectIds);
      }
      
      await dbRun(`DELETE FROM projects WHERE account_id IN (${accountPlaceholders})`, accountIds);
      
      // Delete accounts
      await dbRun(`DELETE FROM accounts WHERE id IN (${accountPlaceholders})`, accountIds);
    }

    // Delete interactions
    await dbRun('DELETE FROM interactions WHERE customer_id = ?', [id]);

    // Delete leads that might be related (by name or company)
    const leadNameExpr = isMySQL 
      ? 'CONCAT(first_name, " ", last_name)'
      : 'first_name || " " || last_name';
    await dbRun(`DELETE FROM leads WHERE ${leadNameExpr} = ? OR company_name = ?`, 
      [customer.name, accountName]);

    // Finally, delete the customer
    const result = await dbRun('DELETE FROM customers WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }
    
    res.json({ message: 'مشتری و تمام موارد مرتبط با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'خطا در حذف مشتری: ' + (error.message || 'خطای نامشخص') });
  }
});

// Update customer score
router.patch('/:id/score', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { score } = req.body;

  if (typeof score !== 'number') {
    return res.status(400).json({ error: 'نمره باید عدد باشد' });
  }

  db.run(
    'UPDATE customers SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [score, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی نمره' });
      }
      res.json({ message: 'نمره با موفقیت به‌روزرسانی شد' });
    }
  );
});

export default router;



