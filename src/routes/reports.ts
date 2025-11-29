import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Sales Report
router.get('/sales', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, user_id } = req.query;
  
  let query = `
    SELECT 
      DATE(invoices.created_at) as date,
      COUNT(*) as invoice_count,
      SUM(invoices.total_amount) as total_revenue,
      SUM(CASE WHEN invoices.status = 'paid' THEN invoices.total_amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN invoices.status = 'pending' THEN invoices.total_amount ELSE 0 END) as pending_amount
    FROM invoices
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(invoices.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(invoices.created_at) <= ?';
    params.push(end_date);
  }

  query += ' GROUP BY DATE(invoices.created_at) ORDER BY date DESC';

  db.all(query, params, (err, sales) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش فروش' });
    }
    res.json(sales);
  });
});

// Payment Report
router.get('/payments', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, payment_method } = req.query;
  
  let query = `
    SELECT 
      DATE(payments.payment_date) as date,
      COUNT(*) as payment_count,
      SUM(payments.amount) as total_amount,
      payments.payment_method
    FROM payments
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(payments.payment_date) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(payments.payment_date) <= ?';
    params.push(end_date);
  }

  if (payment_method) {
    query += ' AND payments.payment_method = ?';
    params.push(payment_method);
  }

  query += ' GROUP BY DATE(payments.payment_date), payments.payment_method ORDER BY date DESC';

  db.all(query, params, (err, payments) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش پرداخت' });
    }
    res.json(payments);
  });
});

// Expense Report
router.get('/expenses', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, category_id } = req.query;
  
  let query = `
    SELECT 
      DATE(expenses.expense_date) as date,
      COUNT(*) as expense_count,
      SUM(expenses.amount) as total_amount,
      ec.name as category_name
    FROM expenses
    LEFT JOIN expense_categories ec ON expenses.category_id = ec.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(expenses.expense_date) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(expenses.expense_date) <= ?';
    params.push(end_date);
  }

  if (category_id) {
    query += ' AND expenses.category_id = ?';
    params.push(category_id);
  }

  query += ' GROUP BY DATE(expenses.expense_date), expenses.category_id ORDER BY date DESC';

  db.all(query, params, (err, expenses) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش هزینه' });
    }
    res.json(expenses);
  });
});

// Time Tracking Report
router.get('/time', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, user_id, task_id } = req.query;
  
  let query = `
    SELECT 
      DATE(time_logs.created_at) as date,
      SUM(time_logs.duration_minutes) as total_minutes,
      COUNT(*) as log_count,
      tasks.title as task_title,
      users.username,
      users.full_name
    FROM time_logs
    LEFT JOIN tasks ON time_logs.task_id = tasks.id
    LEFT JOIN users ON time_logs.user_id = users.id
    WHERE time_logs.end_time IS NOT NULL
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(time_logs.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(time_logs.created_at) <= ?';
    params.push(end_date);
  }

  if (user_id) {
    query += ' AND time_logs.user_id = ?';
    params.push(user_id);
  }

  if (task_id) {
    query += ' AND time_logs.task_id = ?';
    params.push(task_id);
  }

  query += ' GROUP BY DATE(time_logs.created_at), time_logs.user_id, time_logs.task_id ORDER BY date DESC';

  db.all(query, params, (err, timeLogs) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش زمان' });
    }
    res.json(timeLogs);
  });
});

// Dashboard KPIs
router.get('/dashboard/kpis', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;

  // Total Revenue
  let revenueQuery = 'SELECT SUM(total_amount) as total FROM invoices WHERE status = ?';
  const revenueParams: any[] = ['paid'];
  if (start_date) {
    revenueQuery += ' AND DATE(created_at) >= ?';
    revenueParams.push(start_date);
  }
  if (end_date) {
    revenueQuery += ' AND DATE(created_at) <= ?';
    revenueParams.push(end_date);
  }

  db.get(revenueQuery, revenueParams, (err, revenue: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت KPI' });
    }

    // Pending Invoices
    let pendingQuery = 'SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices WHERE status = ?';
    const pendingParams: any[] = ['pending'];
    if (start_date) {
      pendingQuery += ' AND DATE(created_at) >= ?';
      pendingParams.push(start_date);
    }
    if (end_date) {
      pendingQuery += ' AND DATE(created_at) <= ?';
      pendingParams.push(end_date);
    }

    db.get(pendingQuery, pendingParams, (err, pending: any) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت KPI' });
      }

      // Active Deals
      db.get('SELECT COUNT(*) as count, SUM(value) as total FROM deals WHERE status = ?', ['open'], (err, deals: any) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در دریافت KPI' });
        }

        // Active Leads
        db.get('SELECT COUNT(*) as count FROM leads WHERE status != ?', ['converted'], (err, leads: any) => {
          if (err) {
            return res.status(500).json({ error: 'خطا در دریافت KPI' });
          }

          // Active Tasks
          db.get('SELECT COUNT(*) as count FROM tasks WHERE status != ?', ['done'], (err, tasks: any) => {
            if (err) {
              return res.status(500).json({ error: 'خطا در دریافت KPI' });
            }

            res.json({
              total_revenue: revenue?.total || 0,
              pending_invoices: {
                count: pending?.count || 0,
                amount: pending?.total || 0
              },
              active_deals: {
                count: deals?.count || 0,
                value: deals?.total || 0
              },
              active_leads: leads?.count || 0,
              active_tasks: tasks?.count || 0
            });
          });
        });
      });
    });
  });
});

export default router;


