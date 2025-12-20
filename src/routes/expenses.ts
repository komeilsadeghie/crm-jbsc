import express, { Response } from 'express';
import { db, dbRun } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all expenses
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, project_id, category, billable } = req.query;
  
  let query = `
    SELECT e.*, 
           a.name as account_name,
           p.name as project_name
    FROM expenses e
    LEFT JOIN accounts a ON e.account_id = a.id
    LEFT JOIN projects p ON e.project_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND e.account_id = ?';
    params.push(account_id);
  }

  if (project_id) {
    query += ' AND e.project_id = ?';
    params.push(project_id);
  }

  if (category) {
    query += ' AND e.category = ?';
    params.push(category);
  }

  if (billable !== undefined) {
    query += ' AND e.billable = ?';
    params.push(billable === 'true' ? 1 : 0);
  }

  query += ' ORDER BY e.expense_date DESC';

  db.all(query, params, (err, expenses) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت هزینه‌ها' });
    }
    res.json(expenses);
  });
});

// Get expense categories
router.get('/categories', authenticate, (req: AuthRequest, res: Response) => {
  db.all('SELECT * FROM expense_categories ORDER BY name', [], (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت دسته‌بندی‌ها' });
    }
    res.json(categories);
  });
});

// Create expense category (admin only)
router.post('/categories', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { name, description, color } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'نام دسته‌بندی الزامی است' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO expense_categories (name, description, color) VALUES (?, ?, ?)',
      [name, description || null, color || '#00A3FF']
    );
    res.status(201).json({ 
      id: result.lastID || result.insertId, 
      message: 'دسته‌بندی با موفقیت ایجاد شد' 
    });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint') || err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'این دسته‌بندی قبلاً وجود دارد' });
    }
    console.error('Error creating expense category:', err);
    return res.status(500).json({ error: 'خطا در ایجاد دسته‌بندی' });
  }
});

// Update expense category (admin only)
router.put('/categories/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;
  const { name, description, color } = req.body;

  db.run(
    'UPDATE expense_categories SET name = ?, description = ?, color = ? WHERE id = ?',
    [name, description || null, color || '#00A3FF', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی دسته‌بندی' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });
      }
      res.json({ message: 'دسته‌بندی با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete expense category (admin only)
router.delete('/categories/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;

  // Check if category is being used
  db.get('SELECT COUNT(*) as count FROM expenses WHERE category = (SELECT name FROM expense_categories WHERE id = ?)', [id], (err, result: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی استفاده دسته‌بندی' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'این دسته‌بندی در حال استفاده است و نمی‌تواند حذف شود' });
    }

    db.run('DELETE FROM expense_categories WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف دسته‌بندی' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'دسته‌بندی یافت نشد' });
      }
      res.json({ message: 'دسته‌بندی با موفقیت حذف شد' });
    });
  });
});

// Create expense
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const expense = req.body;

  try {
    const result = await dbRun(
      `INSERT INTO expenses (
        account_id, project_id, category, amount, currency,
        expense_date, description, receipt_file_path, billable, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.account_id || null,
        expense.project_id || null,
        expense.category,
        expense.amount,
        expense.currency || 'IRR',
        expense.expense_date,
        expense.description || null,
        expense.receipt_file_path || null,
        expense.billable ? 1 : 0,
        req.user?.id
      ]
    );
    res.status(201).json({ 
      id: result.lastID || result.insertId, 
      message: 'هزینه با موفقیت ثبت شد' 
    });
  } catch (err: any) {
    console.error('Error creating expense:', err);
    return res.status(500).json({ error: 'خطا در ثبت هزینه' });
  }
});

// Update expense
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const expense = req.body;

  db.run(
    `UPDATE expenses SET 
      account_id = ?, project_id = ?, category = ?, amount = ?, currency = ?,
      expense_date = ?, description = ?, receipt_file_path = ?, billable = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      expense.account_id || null,
      expense.project_id || null,
      expense.category,
      expense.amount,
      expense.currency || 'IRR',
      expense.expense_date,
      expense.description || null,
      expense.receipt_file_path || null,
      expense.billable ? 1 : 0,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی هزینه' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'هزینه یافت نشد' });
      }
      res.json({ message: 'هزینه با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete expense
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM expenses WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف هزینه' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'هزینه یافت نشد' });
    }
    res.json({ message: 'هزینه با موفقیت حذف شد' });
  });
});

export default router;

