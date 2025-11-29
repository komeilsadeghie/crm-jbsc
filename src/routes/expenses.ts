import express, { Response } from 'express';
import { db } from '../database/db';
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

// Create expense
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const expense = req.body;

  db.run(
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
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت هزینه' });
      }
      res.status(201).json({ id: this.lastID, message: 'هزینه با موفقیت ثبت شد' });
    }
  );
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

