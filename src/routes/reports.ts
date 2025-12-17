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

// Customers Report
router.get('/customers', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status, type } = req.query;
  
  let query = `
    SELECT 
      DATE(customers.created_at) as date,
      COUNT(*) as count,
      customers.status,
      customers.type
    FROM customers
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(customers.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(customers.created_at) <= ?';
    params.push(end_date);
  }

  if (status) {
    query += ' AND customers.status = ?';
    params.push(status);
  }

  if (type) {
    query += ' AND customers.type = ?';
    params.push(type);
  }

  query += ' GROUP BY DATE(customers.created_at), customers.status, customers.type ORDER BY date DESC';

  db.all(query, params, (err, customers) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش مشتریان' });
    }
    res.json(customers);
  });
});

// Coaching Report
router.get('/coaching', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status } = req.query;
  
  let query = `
    SELECT 
      DATE(coaching_sessions.session_date) as date,
      COUNT(*) as count,
      coaching_sessions.status,
      AVG(coaching_sessions.duration) as avg_duration,
      COUNT(DISTINCT coaching_sessions.customer_id) as unique_customers
    FROM coaching_sessions
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(coaching_sessions.session_date) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(coaching_sessions.session_date) <= ?';
    params.push(end_date);
  }

  if (status) {
    query += ' AND coaching_sessions.status = ?';
    params.push(status);
  }

  query += ' GROUP BY DATE(coaching_sessions.session_date), coaching_sessions.status ORDER BY date DESC';

  db.all(query, params, (err, coaching) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش کوچینگ' });
    }
    res.json(coaching);
  });
});

// Leads Report
router.get('/leads', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status } = req.query;
  
  let query = `
    SELECT 
      DATE(leads.created_at) as date,
      COUNT(*) as count,
      leads.status,
      leads.source
    FROM leads
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(leads.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(leads.created_at) <= ?';
    params.push(end_date);
  }

  if (status) {
    query += ' AND leads.status = ?';
    params.push(status);
  }

  query += ' GROUP BY DATE(leads.created_at), leads.status, leads.source ORDER BY date DESC';

  db.all(query, params, (err, leads) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش لیدها' });
    }
    res.json(leads);
  });
});

// Deals Report
router.get('/deals', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status } = req.query;
  
  let query = `
    SELECT 
      DATE(deals.created_at) as date,
      COUNT(*) as count,
      SUM(deals.value) as total_value,
      deals.status
    FROM deals
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(deals.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(deals.created_at) <= ?';
    params.push(end_date);
  }

  if (status) {
    query += ' AND deals.status = ?';
    params.push(status);
  }

  query += ' GROUP BY DATE(deals.created_at), deals.status ORDER BY date DESC';

  db.all(query, params, (err, deals) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش معاملات' });
    }
    res.json(deals);
  });
});

// Tasks Report
router.get('/tasks', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status } = req.query;
  
  let query = `
    SELECT 
      DATE(tasks.created_at) as date,
      COUNT(*) as count,
      tasks.status,
      tasks.priority
    FROM tasks
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(tasks.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(tasks.created_at) <= ?';
    params.push(end_date);
  }

  if (status) {
    query += ' AND tasks.status = ?';
    params.push(status);
  }

  query += ' GROUP BY DATE(tasks.created_at), tasks.status, tasks.priority ORDER BY date DESC';

  db.all(query, params, (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش وظایف' });
    }
    res.json(tasks);
  });
});

// Tickets Report
router.get('/tickets', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status } = req.query;
  
  let query = `
    SELECT 
      DATE(tickets.created_at) as date,
      COUNT(*) as count,
      tickets.status,
      tickets.priority
    FROM tickets
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(tickets.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(tickets.created_at) <= ?';
    params.push(end_date);
  }

  if (status) {
    query += ' AND tickets.status = ?';
    params.push(status);
  }

  query += ' GROUP BY DATE(tickets.created_at), tickets.status, tickets.priority ORDER BY date DESC';

  db.all(query, params, (err, tickets) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش تیکت‌ها' });
    }
    res.json(tickets);
  });
});

export default router;


