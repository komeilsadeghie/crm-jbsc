import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get activity logs
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { user_id, entity_type, entity_id, action, start_date, end_date, limit = 100 } = req.query;

  let query = `
    SELECT al.*, u.username, u.full_name, u.email
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user_id) {
    query += ' AND al.user_id = ?';
    params.push(user_id);
  }

  if (entity_type) {
    query += ' AND al.entity_type = ?';
    params.push(entity_type);
  }

  if (entity_id) {
    query += ' AND al.entity_id = ?';
    params.push(entity_id);
  }

  if (action) {
    query += ' AND al.action = ?';
    params.push(action);
  }

  if (start_date) {
    query += ' AND DATE(al.created_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(al.created_at) <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY al.created_at DESC LIMIT ?';
  params.push(parseInt(String(limit)));

  db.all(query, params, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت لاگ فعالیت‌ها' });
    }

    // Parse metadata JSON
    const parsedLogs = logs.map((log: any) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));

    res.json(parsedLogs);
  });
});

// Get activity log statistics
router.get('/statistics', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params: any[] = [];

  if (start_date && end_date) {
    dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  // Get action statistics
  db.all(`
    SELECT action, COUNT(*) as count
    FROM activity_log
    ${dateFilter}
    GROUP BY action
    ORDER BY count DESC
  `, params, (err, actionStats) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت آمار' });
    }

    // Get entity type statistics
    db.all(`
      SELECT entity_type, COUNT(*) as count
      FROM activity_log
      ${dateFilter}
      GROUP BY entity_type
      ORDER BY count DESC
    `, params, (err, entityStats) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت آمار' });
      }

      // Get user activity statistics
      db.all(`
        SELECT al.user_id, u.username, u.full_name, COUNT(*) as count
        FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.id
        ${dateFilter}
        GROUP BY al.user_id
        ORDER BY count DESC
        LIMIT 10
      `, params, (err, userStats) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در دریافت آمار' });
        }

        res.json({
          action_statistics: actionStats || [],
          entity_statistics: entityStats || [],
          user_statistics: userStats || []
        });
      });
    });
  });
});

// Get activity log for specific entity
router.get('/entity/:entityType/:entityId', authenticate, (req: AuthRequest, res: Response) => {
  const { entityType, entityId } = req.params;

  db.all(`
    SELECT al.*, u.username, u.full_name
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.entity_type = ? AND al.entity_id = ?
    ORDER BY al.created_at DESC
  `, [entityType, entityId], (err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت لاگ فعالیت‌ها' });
    }

    const parsedLogs = logs.map((log: any) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));

    res.json(parsedLogs);
  });
});

export default router;

