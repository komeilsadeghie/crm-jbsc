import express, { Response } from 'express';
import { db, isMySQL } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { DashboardKPI } from '../types';

const router = express.Router();

// Helper functions to promisify db methods
const dbGet = (query: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

router.get('/kpis', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { period = 'month' } = req.query;

  const kpis: DashboardKPI = {
    total_customers: 0,
    active_customers: 0,
    total_revenue: 0,
    pending_interactions: 0,
    coaching_sessions_scheduled: 0,
    goals_completed: 0,
    goals_in_progress: 0,
    average_customer_score: 0,
    top_customers: [],
    recent_interactions: []
  };

  // Get total customers
  db.get('SELECT COUNT(*) as count FROM customers', [], (err, result: any) => {
    if (!err && result) kpis.total_customers = result.count;

    // Get active customers
    db.get("SELECT COUNT(*) as count FROM customers WHERE status = 'active'", [], (err, result: any) => {
      if (!err && result) kpis.active_customers = result.count;

      // Get total revenue (from deposit interactions)
      db.get(
        "SELECT COALESCE(SUM(amount), 0) as total FROM interactions WHERE type = 'deposit' AND amount IS NOT NULL",
        [],
        (err, result: any) => {
          if (!err && result) kpis.total_revenue = result.total || 0;

          // Get pending interactions
          db.get(
            "SELECT COUNT(*) as count FROM interactions WHERE type IN ('call', 'meeting') AND created_at > datetime('now', '-7 days')",
            [],
            (err, result: any) => {
              if (!err && result) kpis.pending_interactions = result.count;

              // Get scheduled coaching sessions
              db.get(
                "SELECT COUNT(*) as count FROM coaching_sessions WHERE status = 'scheduled' AND session_date >= date('now')",
                [],
                (err, result: any) => {
                  if (!err && result) kpis.coaching_sessions_scheduled = result.count;

                  // Get completed goals
                  db.get(
                    "SELECT COUNT(*) as count FROM goals WHERE status = 'completed'",
                    [],
                    (err, result: any) => {
                      if (!err && result) kpis.goals_completed = result.count;

                      // Get in-progress goals
                      db.get(
                        "SELECT COUNT(*) as count FROM goals WHERE status = 'active'",
                        [],
                        (err, result: any) => {
                          if (!err && result) kpis.goals_in_progress = result.count;

                          // Get average customer score
                          db.get(
                            'SELECT AVG(score) as avg FROM customers WHERE score > 0',
                            [],
                            (err, result: any) => {
                              if (!err && result) kpis.average_customer_score = Math.round(result.avg || 0);

                              // Get top customers by score
                              db.all(
                                'SELECT * FROM customers WHERE score > 0 ORDER BY score DESC LIMIT 10',
                                [],
                                (err, customers) => {
                                  if (!err && customers) kpis.top_customers = customers as any;

                                  // Get recent interactions
                                  db.all(
                                    `SELECT i.*, c.name as customer_name 
                                     FROM interactions i 
                                     LEFT JOIN customers c ON i.customer_id = c.id 
                                     ORDER BY i.created_at DESC LIMIT 10`,
                                    [],
                                    (err, interactions) => {
                                      if (!err && interactions) kpis.recent_interactions = interactions as any;

                                      res.json(kpis);
                                    }
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
});

// Get coach-specific KPIs
router.get('/coach-kpis', authenticate, (req: AuthRequest, res: Response) => {
  const coachId = req.user?.id;

  if (req.user?.role !== 'coach' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز' });
  }

  db.all(
    `SELECT 
      COUNT(DISTINCT cs.customer_id) as total_clients,
      COUNT(cs.id) as total_sessions,
      COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completed_sessions,
      COUNT(CASE WHEN cs.status = 'scheduled' AND cs.session_date >= date('now') THEN 1 END) as upcoming_sessions,
      COUNT(DISTINCT g.id) as total_goals,
      COUNT(CASE WHEN g.status = 'completed' THEN 1 END) as completed_goals,
      AVG(gr.overall_score) as avg_client_score
     FROM coaching_sessions cs
     LEFT JOIN goals g ON g.customer_id = cs.customer_id AND g.created_by = ?
     LEFT JOIN growth_reports gr ON gr.customer_id = cs.customer_id
     WHERE cs.coach_id = ?`,
    [coachId, coachId],
    (err, result: any) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت KPI' });
      }
      res.json(result[0] || {});
    }
  );
});

// Get sales manager KPIs
router.get('/sales-kpis', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'sales_manager' && req.user?.role !== 'sales' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز' });
  }

  db.all(
    `SELECT 
      COUNT(DISTINCT c.id) as total_customers,
      COUNT(CASE WHEN c.status = 'lead' THEN 1 END) as leads,
      COUNT(CASE WHEN c.status = 'customer' THEN 1 END) as customers,
      COUNT(CASE WHEN c.type = 'export' THEN 1 END) as export_customers,
      COUNT(CASE WHEN c.type = 'import' THEN 1 END) as import_customers,
      COALESCE(SUM(i.amount), 0) as total_revenue,
      COUNT(i.id) as total_interactions,
      AVG(c.score) as avg_customer_score
     FROM customers c
     LEFT JOIN interactions i ON i.customer_id = c.id AND i.type = 'deposit'`,
    [],
    (err, result: any) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت KPI' });
      }
      res.json(result[0] || {});
    }
  );
});

// Get comprehensive dashboard data (Perfex-style)
router.get('/overview', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  try {
    // KPIs
    const invoiceStats: any = await dbGet(`SELECT COUNT(*) as total, 
                   COUNT(CASE WHEN status IN ('unpaid', 'partially_paid') THEN 1 END) as awaiting
            FROM invoices`).catch(() => ({ total: 0, awaiting: 0 }));
    
    const leadStats: any = await dbGet(`SELECT COUNT(*) as total,
                     COUNT(CASE WHEN status = 'customer' THEN 1 END) as converted
              FROM leads`).catch(() => ({ total: 0, converted: 0 }));
    
    const projectStats: any = await dbGet(`SELECT COUNT(*) as total,
                       COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
                FROM projects`).catch(() => ({ total: 0, in_progress: 0 }));
    
    const taskStats: any = await dbGet(`SELECT COUNT(*) as total,
                         COUNT(CASE WHEN status != 'completed' THEN 1 END) as not_finished
                  FROM tasks`).catch(() => ({ total: 0, not_finished: 0 }));
    
    const kpis = {
      invoices_awaiting_payment: invoiceStats?.awaiting || 0,
      invoices_total: invoiceStats?.total || 0,
      converted_leads: leadStats?.converted || 0,
      leads_total: leadStats?.total || 0,
      projects_in_progress: projectStats?.in_progress || 0,
      projects_total: projectStats?.total || 0,
      tasks_not_finished: taskStats?.not_finished || 0,
      tasks_total: taskStats?.total || 0
    };
    
    // Overviews
    const invoiceOverviewRaw = await dbAll(`SELECT status, COUNT(*) as count FROM invoices GROUP BY status`).catch(() => []);
    const invoiceOverviewData: any = {
      draft: 0,
      not_sent: 0,
      unpaid: 0,
      partially_paid: 0,
      overdue: 0,
      paid: 0,
      total: 0
    };
    invoiceOverviewRaw.forEach((item: any) => {
      invoiceOverviewData[item.status] = item.count;
      invoiceOverviewData.total += item.count;
    });
    
    const estimateOverviewRaw = await dbAll(`SELECT status, COUNT(*) as count FROM estimates GROUP BY status`).catch(() => []);
    const estimateOverviewData: any = {
      draft: 0,
      not_sent: 0,
      sent: 0,
      expired: 0,
      declined: 0,
      accepted: 0,
      total: 0
    };
    estimateOverviewRaw.forEach((item: any) => {
      estimateOverviewData[item.status] = item.count;
      estimateOverviewData.total += item.count;
    });
    
    const proposalOverviewRaw = await dbAll(`SELECT status, COUNT(*) as count FROM proposals GROUP BY status`).catch(() => []);
    const proposalOverviewData: any = {
      draft: 0,
      open: 0,
      revised: 0,
      declined: 0,
      accepted: 0,
      total: 0
    };
    proposalOverviewRaw.forEach((item: any) => {
      proposalOverviewData[item.status] = item.count;
      proposalOverviewData.total += item.count;
    });
    
    // Financial Summary - Use 'amount' instead of 'total_amount'
    const financial: any = await dbGet(`SELECT 
                          COALESCE(SUM(CASE WHEN status IN ('unpaid', 'partially_paid') THEN amount ELSE 0 END), 0) as outstanding,
                          COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as past_due,
                          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid
                         FROM invoices`).catch(() => ({ outstanding: 0, past_due: 0, paid: 0 }));
    
    const financialSummary = {
      outstanding: financial?.outstanding || 0,
      past_due: financial?.past_due || 0,
      paid: financial?.paid || 0
    };
    
    // Charts Data
    const leadsOverview = await dbAll(`SELECT status, COUNT(*) as count FROM leads GROUP BY status`).catch(() => []);
    const projectStatus = await dbAll(`SELECT status, COUNT(*) as count FROM projects GROUP BY status`).catch(() => []);
    const ticketStatus = await dbAll(`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`).catch(() => []);
    const ticketDepartments = await dbAll(`SELECT d.name as department, COUNT(*) as count 
                                  FROM tickets t
                                  LEFT JOIN ticket_departments d ON t.department_id = d.id
                                  GROUP BY d.name`).catch(() => []);
    
    // Payment Records - Convert SQLite date syntax to MySQL
    const dateExpr = isMySQL 
      ? `DATE_SUB(CURDATE(), INTERVAL 7 DAY)` 
      : `DATE('now', '-7 days')`;
    const dateExpr14 = isMySQL 
      ? `DATE_SUB(CURDATE(), INTERVAL 14 DAY)` 
      : `DATE('now', '-14 days')`;
    const dateExpr14End = isMySQL 
      ? `DATE_SUB(CURDATE(), INTERVAL 7 DAY)` 
      : `DATE('now', '-7 days')`;
    
    const paymentRecordsQuery = isMySQL
      ? `SELECT 
          DATE(payment_date) as date,
          SUM(amount) as amount,
          CASE 
            WHEN DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 'this_week'
            WHEN DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND DATE(payment_date) < DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 'last_week'
          END as period
          FROM invoice_payments
          WHERE DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
          GROUP BY DATE(payment_date), period`
      : `SELECT 
          DATE(payment_date) as date,
          SUM(amount) as amount,
          CASE 
            WHEN DATE(payment_date) >= DATE('now', '-7 days') THEN 'this_week'
            WHEN DATE(payment_date) >= DATE('now', '-14 days') AND DATE(payment_date) < DATE('now', '-7 days') THEN 'last_week'
          END as period
          FROM invoice_payments
          WHERE DATE(payment_date) >= DATE('now', '-14 days')
          GROUP BY DATE(payment_date), period`;
    
    const paymentRecords = await dbAll(paymentRecordsQuery).catch(() => []);
    
    // Contracts Expiring Soon - Convert SQLite date syntax to MySQL
    const contractsExpiringQuery = isMySQL
      ? `SELECT c.*, a.name as account_name
         FROM contracts c
         LEFT JOIN accounts a ON c.account_id = a.id
         WHERE c.status = 'active'
           AND c.end_date IS NOT NULL
           AND DATE(c.end_date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         ORDER BY c.end_date ASC
         LIMIT 10`
      : `SELECT c.*, a.name as account_name
         FROM contracts c
         LEFT JOIN accounts a ON c.account_id = a.id
         WHERE c.status = 'active'
           AND c.end_date IS NOT NULL
           AND DATE(c.end_date) BETWEEN DATE('now') AND DATE('now', '+30 days')
         ORDER BY c.end_date ASC
         LIMIT 10`;
    const contractsExpiring = await dbAll(contractsExpiringQuery).catch(() => []);
    
    // Staff Tickets Report
    const staffTicketsReport = await dbAll(`SELECT 
                                        u.id as user_id,
                                        u.full_name as staff_member,
                                        COUNT(t.id) as total_assigned,
                                        COUNT(CASE WHEN t.status = 'open' THEN 1 END) as open_tickets,
                                        COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_tickets,
                                        COUNT(tr.id) as replies_count
                                        FROM users u
                                        LEFT JOIN tickets t ON t.assigned_to = u.id
                                        LEFT JOIN ticket_replies tr ON tr.ticket_id = t.id AND tr.user_id = u.id
                                        GROUP BY u.id, u.full_name
                                        ORDER BY total_assigned DESC`).catch(() => []);
    
    // My Tasks
    const myTasks = await dbAll(`SELECT t.*, 
                                         a.name as account_name,
                                         d.title as deal_title,
                                         p.name as project_name
                                         FROM tasks t
                                         LEFT JOIN accounts a ON t.account_id = a.id
                                         LEFT JOIN deals d ON t.deal_id = d.id
                                         LEFT JOIN projects p ON t.project_id = p.id
                                         WHERE t.assigned_to = ?
                                         ORDER BY t.created_at DESC
                                         LIMIT 10`, [userId]).catch(() => []);
    
    // My Projects
    const myProjects = await dbAll(`SELECT p.*, a.name as account_name
                                           FROM projects p
                                           LEFT JOIN accounts a ON p.account_id = a.id
                                           WHERE p.manager_id = ?
                                           ORDER BY p.created_at DESC
                                           LIMIT 10`, [userId]).catch(() => []);
    
    // This Week Events - Convert SQLite date syntax to MySQL
    const weekEventsQuery = isMySQL
      ? `SELECT ce.*, a.name as account_name
         FROM calendar_events ce
         LEFT JOIN accounts a ON ce.relation_type = 'CUSTOMER' AND ce.relation_id = a.id
         WHERE DATE(ce.start_at) >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY)
           AND DATE(ce.start_at) <= DATE_ADD(CURDATE(), INTERVAL 6 - WEEKDAY(CURDATE()) DAY)
         ORDER BY ce.start_at ASC`
      : `SELECT ce.*, a.name as account_name
         FROM calendar_events ce
         LEFT JOIN accounts a ON ce.relation_type = 'CUSTOMER' AND ce.relation_id = a.id
         WHERE DATE(ce.start_at) >= DATE('now', 'weekday 0', '-7 days')
           AND DATE(ce.start_at) <= DATE('now', 'weekday 6')
         ORDER BY ce.start_at ASC`;
    const weekEvents = await dbAll(weekEventsQuery).catch(() => []);
    
    // Latest Activity
    const latestActivity = await dbAll(`SELECT al.*, u.full_name as user_name
                                               FROM activity_log al
                                               LEFT JOIN users u ON al.user_id = u.id
                                               ORDER BY al.created_at DESC
                                               LIMIT 20`).catch(() => []);
    
    // Goals
    const goals = await dbAll(`SELECT sg.*, u.full_name
                                                 FROM sales_goals sg
                                                 LEFT JOIN users u ON sg.user_id = u.id
                                                 WHERE DATE(sg.period_end) >= ${isMySQL ? 'CURDATE()' : "DATE('now')"}
                                                 ORDER BY sg.period_start DESC`).catch(() => []);
    
    res.json({
      kpis,
      invoiceOverview: invoiceOverviewData,
      estimateOverview: estimateOverviewData,
      proposalOverview: proposalOverviewData,
      financialSummary,
      leadsOverview,
      projectStatus,
      ticketStatus,
      ticketDepartments,
      paymentRecords,
      contractsExpiring,
      staffTicketsReport,
      myTasks,
      myProjects,
      weekEvents,
      latestActivity,
      goals
    });
  } catch (error: any) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: error.message || 'خطا در دریافت داده‌های داشبورد' });
  }
});

export default router;



