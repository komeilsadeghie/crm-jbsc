import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CoachingSession, Goal, Exercise, GrowthReport } from '../types';

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

// ========== Coaching Sessions ==========
router.get('/sessions', authenticate, (req: AuthRequest, res: Response) => {
  const { customer_id, coach_id, status } = req.query;
  
  let query = 'SELECT * FROM coaching_sessions WHERE 1=1';
  const params: any[] = [];

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  if (coach_id) {
    query += ' AND coach_id = ?';
    params.push(coach_id);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY session_date DESC';

  db.all(query, params, (err, sessions) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت جلسات' });
    }
    res.json(Array.isArray(sessions) ? sessions : []);
  });
});

router.post('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const session: any = req.body;

    const result = await dbRun(
      'INSERT INTO coaching_sessions (customer_id, coach_id, session_date, duration, notes, status, session_type, meeting_link, tags, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      session.customer_id,
        session.coach_id || req.user?.id,
      session.session_date,
      session.duration || null,
      session.notes || null,
        session.status || 'scheduled',
        session.session_type || null,
        session.meeting_link || null,
        session.tags || null,
        session.color || null
      ]
    );

    // Also create calendar event for this session
    if (session.session_date) {
      try {
        const customer = await dbGet('SELECT name FROM customers WHERE id = ?', [session.customer_id]);
        const customerName = customer?.name || 'مشتری';
        
        await dbRun(
          `INSERT INTO calendar_events (title, start_at, end_at, description, relation_type, relation_id, color, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `جلسه کوچینگ: ${customerName}`,
            session.session_date,
            session.session_date, // Same date for end
            session.notes || `جلسه کوچینگ با ${customerName}`,
            'COACHING_SESSION',
            result.lastID?.toString(),
            session.color || '#6366F1',
            req.user?.id
          ]
        );
        console.log('Created calendar event for coaching session:', result.lastID);
      } catch (calendarError: any) {
        console.error('Error creating calendar event for coaching session:', calendarError);
        // Don't fail the session creation if calendar event fails
      }
    }

    res.status(201).json({ id: result.lastID, message: 'جلسه با موفقیت ثبت شد' });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'خطا در ثبت جلسه' });
  }
});

router.put('/sessions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
  const { id } = req.params;
    const session: any = req.body;

    const result = await dbRun(
    `UPDATE coaching_sessions SET 
        customer_id = ?, coach_id = ?, session_date = ?, duration = ?, notes = ?, status = ?,
        session_type = ?, meeting_link = ?, attendance = ?, rating = ?, tags = ?, color = ?
     WHERE id = ?`,
    [
      session.customer_id,
      session.coach_id,
      session.session_date,
      session.duration || null,
      session.notes || null,
      session.status || 'scheduled',
        session.session_type || null,
        session.meeting_link || null,
        session.attendance || null,
        session.rating || null,
        session.tags || null,
        session.color || null,
        id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'جلسه یافت نشد' });
      }

    // Update calendar event if it exists
    try {
      const existingCalendarEvent = await dbGet(
        'SELECT id FROM calendar_events WHERE relation_type = ? AND relation_id = ?',
        ['COACHING_SESSION', id.toString()]
      );

      if (existingCalendarEvent) {
        const customer = await dbGet('SELECT name FROM customers WHERE id = ?', [session.customer_id]);
        const customerName = customer?.name || 'مشتری';
        
        await dbRun(
          `UPDATE calendar_events SET 
            title = ?, start_at = ?, end_at = ?, description = ?, color = ?
           WHERE relation_type = ? AND relation_id = ?`,
          [
            `جلسه کوچینگ: ${customerName}`,
            session.session_date,
            session.session_date,
            session.notes || `جلسه کوچینگ با ${customerName}`,
            session.color || '#6366F1',
            'COACHING_SESSION',
            id.toString()
          ]
        );
        console.log('Updated calendar event for coaching session:', id);
      } else if (session.session_date) {
        // Create calendar event if it doesn't exist
        const customer = await dbGet('SELECT name FROM customers WHERE id = ?', [session.customer_id]);
        const customerName = customer?.name || 'مشتری';
        
        await dbRun(
          `INSERT INTO calendar_events (title, start_at, end_at, description, relation_type, relation_id, color, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `جلسه کوچینگ: ${customerName}`,
            session.session_date,
            session.session_date,
            session.notes || `جلسه کوچینگ با ${customerName}`,
            'COACHING_SESSION',
            id.toString(),
            session.color || '#6366F1',
            req.user?.id
          ]
        );
        console.log('Created calendar event for coaching session:', id);
      }
    } catch (calendarError: any) {
      console.error('Error updating calendar event for coaching session:', calendarError);
      // Don't fail the session update if calendar event fails
    }

      res.json({ message: 'جلسه با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی جلسه' });
  }
});

// Delete coaching session
router.delete('/sessions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Delete associated calendar event if exists
    try {
      await dbRun(
        'DELETE FROM calendar_events WHERE relation_type = ? AND relation_id = ?',
        ['COACHING_SESSION', id.toString()]
      );
    } catch (calendarError: any) {
      console.error('Error deleting calendar event for coaching session:', calendarError);
      // Continue with session deletion even if calendar event deletion fails
    }

    const result = await dbRun('DELETE FROM coaching_sessions WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'جلسه یافت نشد' });
    }

    res.json({ message: 'جلسه با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'خطا در حذف جلسه' });
  }
});

// ========== Goals (KPI/OKR) ==========
router.get('/goals', authenticate, (req: AuthRequest, res: Response) => {
  const { customer_id, type, status } = req.query;
  
  let query = 'SELECT * FROM goals WHERE 1=1';
  const params: any[] = [];

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, goals) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت اهداف' });
    }
    res.json(Array.isArray(goals) ? goals : []);
  });
});

router.post('/goals', authenticate, (req: AuthRequest, res: Response) => {
  const goal: Goal = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO goals (customer_id, title, description, type, target_value, current_value, unit, deadline, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.customer_id,
      goal.title,
      goal.description || null,
      goal.type,
      goal.target_value || null,
      goal.current_value || 0,
      goal.unit || null,
      goal.deadline || null,
      goal.status || 'active',
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت هدف' });
      }
      res.status(201).json({ id: this.lastID, message: 'هدف با موفقیت ثبت شد' });
    }
  );
});

router.put('/goals/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const goal: Goal = req.body;

  db.run(
    `UPDATE goals SET 
      title = ?, description = ?, type = ?, target_value = ?, current_value = ?,
      unit = ?, deadline = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      goal.title,
      goal.description || null,
      goal.type,
      goal.target_value || null,
      goal.current_value || 0,
      goal.unit || null,
      goal.deadline || null,
      goal.status || 'active',
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی هدف' });
      }
      res.json({ message: 'هدف با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete goal
router.delete('/goals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM goals WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'هدف یافت نشد' });
    }

    res.json({ message: 'هدف با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'خطا در حذف هدف' });
  }
});

// ========== Exercises ==========
router.get('/exercises', authenticate, (req: AuthRequest, res: Response) => {
  const { customer_id, goal_id, status } = req.query;
  
  let query = 'SELECT * FROM exercises WHERE 1=1';
  const params: any[] = [];

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  if (goal_id) {
    query += ' AND goal_id = ?';
    params.push(goal_id);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY due_date ASC, created_at DESC';

  db.all(query, params, (err, exercises) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تمرین‌ها' });
    }
    res.json(Array.isArray(exercises) ? exercises : []);
  });
});

router.post('/exercises', authenticate, (req: AuthRequest, res: Response) => {
  const exercise: Exercise = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO exercises (goal_id, customer_id, title, description, instructions, due_date, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exercise.goal_id || null,
      exercise.customer_id,
      exercise.title,
      exercise.description || null,
      exercise.instructions || null,
      exercise.due_date || null,
      exercise.status || 'pending',
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت تمرین' });
      }
      res.status(201).json({ id: this.lastID, message: 'تمرین با موفقیت ثبت شد' });
    }
  );
});

router.put('/exercises/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const exercise: Exercise = req.body;

  db.run(
    `UPDATE exercises SET 
      title = ?, description = ?, instructions = ?, due_date = ?, status = ?,
      completion_date = ?, notes = ?
     WHERE id = ?`,
    [
      exercise.title,
      exercise.description || null,
      exercise.instructions || null,
      exercise.due_date || null,
      exercise.status || 'pending',
      exercise.status === 'completed' ? new Date().toISOString().split('T')[0] : exercise.completion_date || null,
      exercise.notes || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی تمرین' });
      }
      res.json({ message: 'تمرین با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete exercise
router.delete('/exercises/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM exercises WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'تمرین یافت نشد' });
    }

    res.json({ message: 'تمرین با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'خطا در حذف تمرین' });
  }
});

// ========== Growth Reports ==========
router.get('/reports', authenticate, (req: AuthRequest, res: Response) => {
  const { customer_id } = req.query;
  
  let query = 'SELECT * FROM growth_reports WHERE 1=1';
  const params: any[] = [];

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  query += ' ORDER BY report_date DESC';

  db.all(query, params, (err, reports) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت گزارش‌ها' });
    }
    res.json(Array.isArray(reports) ? reports : []);
  });
});

router.post('/reports', authenticate, (req: AuthRequest, res: Response) => {
  const report: GrowthReport = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO growth_reports (customer_id, report_date, metrics, achievements, challenges, next_steps, overall_score, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.customer_id,
      report.report_date,
      report.metrics ? JSON.stringify(report.metrics) : null,
      report.achievements || null,
      report.challenges || null,
      report.next_steps || null,
      report.overall_score || null,
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت گزارش' });
      }
      res.status(201).json({ id: this.lastID, message: 'گزارش با موفقیت ثبت شد' });
    }
  );
});

router.put('/reports/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
  const { id } = req.params;
  const report: GrowthReport = req.body;

    const result = await dbRun(
    `UPDATE growth_reports SET 
      customer_id = ?, report_date = ?, metrics = ?, achievements = ?, challenges = ?,
      next_steps = ?, overall_score = ?
     WHERE id = ?`,
    [
      report.customer_id,
      report.report_date,
      report.metrics ? JSON.stringify(report.metrics) : null,
      report.achievements || null,
      report.challenges || null,
      report.next_steps || null,
      report.overall_score || null,
      id
      ]
    );

    if (result.changes === 0) {
        return res.status(404).json({ error: 'گزارش یافت نشد' });
      }
      res.json({ message: 'گزارش با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی گزارش' });
  }
});

// Delete report
router.delete('/reports/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM growth_reports WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'گزارش یافت نشد' });
    }

    res.json({ message: 'گزارش با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'خطا در حذف گزارش' });
  }
});

// ========== New Enhanced Endpoints ==========

// Get upcoming sessions
router.get('/sessions/upcoming', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const coachId = req.user?.id;

    const sessions = await dbAll(
      `SELECT cs.*, c.name as customer_name 
       FROM coaching_sessions cs
       JOIN customers c ON cs.customer_id = c.id
       WHERE cs.status = 'scheduled' 
       AND cs.session_date >= date('now')
       AND cs.session_date <= date('now', '+' || ? || ' days')
       AND cs.coach_id = ?
       ORDER BY cs.session_date ASC`,
      [days, coachId]
    );

    res.json(sessions);
  } catch (error: any) {
    console.error('Error fetching upcoming sessions:', error);
    res.status(500).json({ error: 'خطا در دریافت جلسات آینده' });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const coachId = req.user?.id;
    const { customer_id } = req.query;

    let customerFilter = '';
    const params: any[] = [coachId];
    if (customer_id) {
      customerFilter = ' AND cs.customer_id = ?';
      params.push(customer_id);
    }

    // Total sessions
    const totalSessions = await dbGet(
      `SELECT COUNT(*) as count FROM coaching_sessions cs WHERE cs.coach_id = ? ${customerFilter}`,
      params
    );

    // Upcoming sessions
    const upcomingSessions = await dbGet(
      `SELECT COUNT(*) as count FROM coaching_sessions cs 
       WHERE cs.coach_id = ? AND cs.status = 'scheduled' AND cs.session_date >= date('now') ${customerFilter}`,
      params
    );

    // Completed sessions
    const completedSessions = await dbGet(
      `SELECT COUNT(*) as count FROM coaching_sessions cs 
       WHERE cs.coach_id = ? AND cs.status = 'completed' ${customerFilter}`,
      params
    );

    // Active goals
    const activeGoals = await dbGet(
      `SELECT COUNT(*) as count FROM goals g 
       JOIN coaching_sessions cs ON g.customer_id = cs.customer_id
       WHERE cs.coach_id = ? AND g.status = 'active' ${customerFilter}`,
      params
    );

    // Pending exercises
    const pendingExercises = await dbGet(
      `SELECT COUNT(*) as count FROM exercises e
       JOIN coaching_sessions cs ON e.customer_id = cs.customer_id
       WHERE cs.coach_id = ? AND e.status = 'pending' ${customerFilter}`,
      params
    );

    // Overdue exercises
    const overdueExercises = await dbGet(
      `SELECT COUNT(*) as count FROM exercises e
       JOIN coaching_sessions cs ON e.customer_id = cs.customer_id
       WHERE cs.coach_id = ? AND e.status != 'completed' AND e.due_date < date('now') ${customerFilter}`,
      params
    );

    res.json({
      totalSessions: totalSessions?.count || 0,
      upcomingSessions: upcomingSessions?.count || 0,
      completedSessions: completedSessions?.count || 0,
      activeGoals: activeGoals?.count || 0,
      pendingExercises: pendingExercises?.count || 0,
      overdueExercises: overdueExercises?.count || 0,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

// Get goals progress
router.get('/goals/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id } = req.query;
    const coachId = req.user?.id;

    let query = `
      SELECT g.*, c.name as customer_name
      FROM goals g
      JOIN coaching_sessions cs ON g.customer_id = cs.customer_id
      JOIN customers c ON g.customer_id = c.id
      WHERE cs.coach_id = ?
    `;
    const params: any[] = [coachId];

    if (customer_id) {
      query += ' AND g.customer_id = ?';
      params.push(customer_id);
    }

    query += ' ORDER BY g.deadline ASC';

    const goals = await dbAll(query, params);

    const goalsWithProgress = goals.map((goal: any) => {
      const progress = goal.target_value && goal.target_value > 0
        ? Math.min((goal.current_value / goal.target_value) * 100, 100)
        : 0;
      return { ...goal, progress };
    });

    res.json(goalsWithProgress);
  } catch (error: any) {
    console.error('Error fetching goals progress:', error);
    res.status(500).json({ error: 'خطا در دریافت پیشرفت اهداف' });
  }
});

// Get overdue exercises
router.get('/exercises/overdue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const coachId = req.user?.id;
    const { customer_id } = req.query;

    let query = `
      SELECT e.*, c.name as customer_name, g.title as goal_title
      FROM exercises e
      JOIN coaching_sessions cs ON e.customer_id = cs.customer_id
      JOIN customers c ON e.customer_id = c.id
      LEFT JOIN goals g ON e.goal_id = g.id
      WHERE cs.coach_id = ? 
      AND e.status != 'completed' 
      AND e.due_date < date('now')
    `;
    const params: any[] = [coachId];

    if (customer_id) {
      query += ' AND e.customer_id = ?';
      params.push(customer_id);
    }

    query += ' ORDER BY e.due_date ASC';

    const exercises = await dbAll(query, params);
    res.json(exercises);
  } catch (error: any) {
    console.error('Error fetching overdue exercises:', error);
    res.status(500).json({ error: 'خطا در دریافت تمرین‌های منقضی شده' });
  }
});

// Complete session
router.post('/sessions/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { attendance, rating, notes } = req.body;

    const result = await dbRun(
      `UPDATE coaching_sessions SET 
        status = 'completed',
        attendance = ?,
        rating = ?,
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [attendance || null, rating || null, notes || null, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'جلسه یافت نشد' });
    }
    res.json({ message: 'جلسه با موفقیت تکمیل شد' });
  } catch (error: any) {
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'خطا در تکمیل جلسه' });
  }
});

// Update goal progress
router.post('/goals/:id/update-progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { current_value } = req.body;

    const result = await dbRun(
      `UPDATE goals SET 
        current_value = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [current_value || 0, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'هدف یافت نشد' });
    }
    res.json({ message: 'پیشرفت هدف با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی پیشرفت' });
  }
});

// ========== Coaching Programs ==========
router.get('/programs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id, status } = req.query;
    const coachId = req.user?.id;

    let query = 'SELECT * FROM coaching_programs WHERE coach_id = ?';
    const params: any[] = [coachId];

    if (customer_id) {
      query += ' AND customer_id = ?';
      params.push(customer_id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const programs = await dbAll(query, params);
    res.json(programs);
  } catch (error: any) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'خطا در دریافت برنامه‌ها' });
  }
});

router.post('/programs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const program: any = req.body;

    const result = await dbRun(
      `INSERT INTO coaching_programs (customer_id, title, description, start_date, end_date, status, coach_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        program.customer_id,
        program.title,
        program.description || null,
        program.start_date,
        program.end_date || null,
        program.status || 'active',
        req.user?.id
      ]
    );

    res.status(201).json({ id: result.lastID, message: 'برنامه با موفقیت ایجاد شد' });
  } catch (error: any) {
    console.error('Error creating program:', error);
    res.status(500).json({ error: 'خطا در ایجاد برنامه' });
  }
});

router.put('/programs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const program: any = req.body;

    const result = await dbRun(
      `UPDATE coaching_programs SET 
        customer_id = ?, title = ?, description = ?, start_date = ?, end_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND coach_id = ?`,
      [
        program.customer_id,
        program.title,
        program.description || null,
        program.start_date,
        program.end_date || null,
        program.status || 'active',
        id,
        req.user?.id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'برنامه یافت نشد' });
    }

    res.json({ message: 'برنامه با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating program:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی برنامه' });
  }
});

router.delete('/programs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbRun(
      'DELETE FROM coaching_programs WHERE id = ? AND coach_id = ?',
      [id, req.user?.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'برنامه یافت نشد' });
    }

    res.json({ message: 'برنامه با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting program:', error);
    res.status(500).json({ error: 'خطا در حذف برنامه' });
  }
});

// ========== Templates ==========
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;

    let query = 'SELECT * FROM coaching_templates WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY is_default DESC, created_at DESC';

    const templates = await dbAll(query, params);
    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'خطا در دریافت قالب‌ها' });
  }
});

router.post('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const template: any = req.body;

    const result = await dbRun(
      `INSERT INTO coaching_templates (name, type, content, is_default, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        template.name,
        template.type,
        JSON.stringify(template.content),
        template.is_default || 0,
        req.user?.id
      ]
    );

    res.status(201).json({ id: result.lastID, message: 'قالب با موفقیت ایجاد شد' });
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'خطا در ایجاد قالب' });
  }
});

router.put('/templates/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const template: any = req.body;

    const result = await dbRun(
      `UPDATE coaching_templates SET 
        name = ?, type = ?, content = ?, is_default = ?
       WHERE id = ? AND created_by = ?`,
      [
        template.name,
        template.type,
        JSON.stringify(template.content),
        template.is_default || 0,
        id,
        req.user?.id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'قالب یافت نشد' });
    }

    res.json({ message: 'قالب با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی قالب' });
  }
});

router.delete('/templates/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await dbRun(
      'DELETE FROM coaching_templates WHERE id = ? AND created_by = ?',
      [id, req.user?.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'قالب یافت نشد' });
    }

    res.json({ message: 'قالب با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'خطا در حذف قالب' });
  }
});

// ========== Feedback ==========
router.get('/feedback', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id, session_id, feedback_type } = req.query;
    const coachId = req.user?.id;

    let query = 'SELECT * FROM coaching_feedback WHERE coach_id = ?';
    const params: any[] = [coachId];

    if (customer_id) {
      query += ' AND customer_id = ?';
      params.push(customer_id);
    }

    if (session_id) {
      query += ' AND session_id = ?';
      params.push(session_id);
    }

    if (feedback_type) {
      query += ' AND feedback_type = ?';
      params.push(feedback_type);
    }

    query += ' ORDER BY created_at DESC';

    const feedbacks = await dbAll(query, params);
    res.json(feedbacks);
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'خطا در دریافت بازخوردها' });
  }
});

router.post('/feedback', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const feedback: any = req.body;

    const result = await dbRun(
      `INSERT INTO coaching_feedback (session_id, customer_id, coach_id, feedback_type, rating, comments)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        feedback.session_id || null,
        feedback.customer_id,
        req.user?.id,
        feedback.feedback_type,
        feedback.rating || null,
        feedback.comments || null
      ]
    );

    res.status(201).json({ id: result.lastID, message: 'بازخورد با موفقیت ثبت شد' });
  } catch (error: any) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'خطا در ثبت بازخورد' });
  }
});

export default router;

