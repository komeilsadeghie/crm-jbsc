import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get goals
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { user_id, period_type, period_start, period_end } = req.query;
  
  let query = `
    SELECT sg.*, u.username, u.full_name
    FROM sales_goals sg
    LEFT JOIN users u ON sg.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (user_id) {
    query += ' AND sg.user_id = ?';
    params.push(user_id);
  }

  if (period_type) {
    query += ' AND sg.period_type = ?';
    params.push(period_type);
  }

  if (period_start) {
    query += ' AND sg.period_start >= ?';
    params.push(period_start);
  }

  if (period_end) {
    query += ' AND sg.period_end <= ?';
    params.push(period_end);
  }

  query += ' ORDER BY sg.period_start DESC';

  db.all(query, params, (err, goals) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت اهداف' });
    }
    res.json(goals);
  });
});

// Create goal
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const goal = req.body;

  db.run(
    `INSERT INTO sales_goals (
      user_id, period_type, period_start, period_end,
      target_amount, current_amount, currency, goal_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.user_id || req.user?.id,
      goal.period_type,
      goal.period_start,
      goal.period_end,
      goal.target_amount,
      goal.current_amount || 0,
      goal.currency || 'IRR',
      goal.goal_type || 'revenue'
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت هدف' });
      }
      res.status(201).json({ id: this.lastID, message: 'هدف با موفقیت ثبت شد' });
    }
  );
});

// Update goal progress
router.patch('/:id/progress', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { current_amount } = req.body;

  db.run(
    `UPDATE sales_goals SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [current_amount, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی پیشرفت' });
      }
      res.json({ message: 'پیشرفت به‌روزرسانی شد' });
    }
  );
});

export default router;


