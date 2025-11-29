import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Task, Activity } from '../types/extended';

const router = express.Router();

// ========== Tasks ==========
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { deal_id, account_id, project_id, assigned_to, status, priority } = req.query;
  
  let query = `
    SELECT t.*, 
           a.name as account_name,
           d.title as deal_title,
           p.name as project_name,
           u.full_name as assigned_to_name
    FROM tasks t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN deals d ON t.deal_id = d.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (deal_id) {
    query += ' AND t.deal_id = ?';
    params.push(deal_id);
  }

  if (account_id) {
    query += ' AND t.account_id = ?';
    params.push(account_id);
  }

  if (project_id) {
    query += ' AND t.project_id = ?';
    params.push(project_id);
  }

  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY t.due_date ASC, t.created_at DESC';

  db.all(query, params, (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تسک‌ها' });
    }
    res.json(tasks);
  });
});

router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const task: any = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO tasks (
      deal_id, account_id, project_id, parent_task_id, title, description, status, priority,
      due_date, start_date, estimated_hours, position, kanban_column, assigned_to, created_by,
      recurrence_pattern, recurrence_end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.deal_id || null,
      task.account_id || null,
      task.project_id || null,
      task.parent_task_id || null,
      task.title,
      task.description || null,
      task.status || 'todo',
      task.priority || 'medium',
      task.due_date || null,
      task.start_date || null,
      task.estimated_hours || null,
      task.position || 0,
      task.kanban_column || 'todo',
      task.assigned_to || null,
      userId,
      task.recurrence_pattern || null,
      task.recurrence_end_date || null
    ],
    function(err) {
      if (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ error: 'خطا در ثبت تسک: ' + err.message });
      }
      
      const taskId = this.lastID;
      
      // Insert checklist items if provided
      if (task.checklist && Array.isArray(task.checklist) && task.checklist.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO task_checklists (task_id, item, is_completed, position)
          VALUES (?, ?, ?, ?)
        `);
        
        task.checklist.forEach((item: any, index: number) => {
          stmt.run([
            taskId,
            item.item || item,
            item.is_completed ? 1 : 0,
            index
          ]);
        });
        
        stmt.finalize();
      }
      
      res.status(201).json({ id: taskId, message: 'تسک با موفقیت ثبت شد' });
    }
  );
});

router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const task: any = req.body;

  db.run(
    `UPDATE tasks SET 
      deal_id = ?, account_id = ?, project_id = ?, parent_task_id = ?,
      title = ?, description = ?, status = ?, priority = ?,
      due_date = ?, start_date = ?, estimated_hours = ?, position = ?, kanban_column = ?,
      assigned_to = ?, completed_at = ?,
      recurrence_pattern = ?, recurrence_end_date = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      task.deal_id || null,
      task.account_id || null,
      task.project_id || null,
      task.parent_task_id || null,
      task.title,
      task.description || null,
      task.status || 'todo',
      task.priority || 'medium',
      task.due_date || null,
      task.start_date || null,
      task.estimated_hours || null,
      task.position || 0,
      task.kanban_column || 'todo',
      task.assigned_to || null,
      task.status === 'done' ? new Date().toISOString() : task.completed_at || null,
      task.recurrence_pattern || null,
      task.recurrence_end_date || null,
      id
    ],
    function(err) {
      if (err) {
        console.error('Error updating task:', err);
        return res.status(500).json({ error: 'خطا در به‌روزرسانی تسک: ' + err.message });
      }
      
      // Update checklist if provided
      if (task.checklist && Array.isArray(task.checklist)) {
        db.run('DELETE FROM task_checklists WHERE task_id = ?', [id], () => {
          const stmt = db.prepare(`
            INSERT INTO task_checklists (task_id, item, is_completed, position)
            VALUES (?, ?, ?, ?)
          `);
          
          task.checklist.forEach((item: any, index: number) => {
            stmt.run([
              parseInt(id),
              item.item || item,
              item.is_completed ? 1 : 0,
              index
            ]);
          });
          
          stmt.finalize();
        });
      }
      
      res.json({ message: 'تسک با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete task (must be before GET /:id to avoid conflicts)
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // First, check if task exists
  db.get('SELECT id FROM tasks WHERE id = ?', [id], (err, task: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی تسک' });
    }
    if (!task) {
      return res.status(404).json({ error: 'تسک یافت نشد' });
    }

    // Delete related data first (cascade delete)
    // Delete time logs
    db.run('DELETE FROM time_logs WHERE task_id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting time logs:', err);
      }
    });

    // Delete dependencies
    db.run('DELETE FROM task_dependencies WHERE task_id = ? OR depends_on_task_id = ?', [id, id], (err) => {
      if (err) {
        console.error('Error deleting dependencies:', err);
      }
    });

    // Delete checklist items
    db.run('DELETE FROM task_checklists WHERE task_id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting checklist:', err);
      }
    });

    // Delete subtasks (cascade)
    db.run('DELETE FROM tasks WHERE parent_task_id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting subtasks:', err);
      }
    });

    // Finally, delete the task itself
    db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ error: 'خطا در حذف تسک: ' + err.message });
      }
      res.json({ message: 'تسک با موفقیت حذف شد' });
    });
  });
});

// Bulk delete tasks
router.post('/bulk-delete', authenticate, (req: AuthRequest, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
  }

  const placeholders = ids.map(() => '?').join(',');
  
  // Delete related data first
  db.run(`DELETE FROM time_logs WHERE task_id IN (${placeholders})`, ids, (err) => {
    if (err) console.error('Error deleting time logs:', err);
  });
  
  db.run(`DELETE FROM task_dependencies WHERE task_id IN (${placeholders}) OR depends_on_task_id IN (${placeholders})`, [...ids, ...ids], (err) => {
    if (err) console.error('Error deleting dependencies:', err);
  });
  
  db.run(`DELETE FROM task_checklists WHERE task_id IN (${placeholders})`, ids, (err) => {
    if (err) console.error('Error deleting checklists:', err);
  });
  
  db.run(`DELETE FROM tasks WHERE parent_task_id IN (${placeholders})`, ids, (err) => {
    if (err) console.error('Error deleting subtasks:', err);
  });

  // Finally, delete the tasks
  db.run(`DELETE FROM tasks WHERE id IN (${placeholders})`, ids, function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف گروهی تسک‌ها' });
    }
    res.json({ 
      message: `${this.changes} تسک با موفقیت حذف شد`,
      deletedCount: this.changes 
    });
  });
});

// Get single task with details
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT t.*, 
           a.name as account_name,
           d.title as deal_title,
           p.name as project_name,
           u.full_name as assigned_to_name
    FROM tasks t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN deals d ON t.deal_id = d.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.id = ?
  `, [id], (err, task: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تسک' });
    }
    if (!task) {
      return res.status(404).json({ error: 'تسک یافت نشد' });
    }

    // Get checklist
    db.all('SELECT * FROM task_checklists WHERE task_id = ? ORDER BY position', [id], (err, checklist) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت چک‌لیست' });
      }

      // Get subtasks
      db.all('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY position', [id], (err, subtasks) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در دریافت زیرتسک‌ها' });
        }

        // Get dependencies
        db.all(`
          SELECT td.*, t.title as depends_on_title
          FROM task_dependencies td
          LEFT JOIN tasks t ON td.depends_on_task_id = t.id
          WHERE td.task_id = ?
        `, [id], (err, dependencies) => {
          if (err) {
            return res.status(500).json({ error: 'خطا در دریافت وابستگی‌ها' });
          }

          // Get time logs
          db.all(`
            SELECT tl.*, u.username, u.full_name
            FROM time_logs tl
            LEFT JOIN users u ON tl.user_id = u.id
            WHERE tl.task_id = ?
            ORDER BY tl.created_at DESC
          `, [id], (err, timeLogs) => {
            if (err) {
              return res.status(500).json({ error: 'خطا در دریافت لاگ زمان' });
            }

            res.json({
              ...task,
              checklist: checklist || [],
              subtasks: subtasks || [],
              dependencies: dependencies || [],
              timeLogs: timeLogs || []
            });
          });
        });
      });
    });
  });
});

// Kanban view
router.get('/kanban/board', authenticate, (req: AuthRequest, res: Response) => {
  const { project_id, account_id } = req.query;

  let query = `
    SELECT t.*, 
           a.name as account_name,
           p.name as project_name,
           u.full_name as assigned_to_name
    FROM tasks t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (project_id) {
    query += ' AND t.project_id = ?';
    params.push(project_id);
  }

  if (account_id) {
    query += ' AND t.account_id = ?';
    params.push(account_id);
  }

  query += ' ORDER BY t.position ASC, t.created_at DESC';

  db.all(query, params, (err, tasks: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تسک‌ها' });
    }

    // Group by kanban_column
    const board: Record<string, any[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    };

    tasks.forEach(task => {
      const column = task.kanban_column || 'todo';
      if (!board[column]) {
        board[column] = [];
      }
      board[column].push(task);
    });

    res.json(board);
  });
});

// Update task position (for Kanban drag & drop)
router.put('/:id/position', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { position, kanban_column } = req.body;

  // Update both position, kanban_column, and status based on kanban_column
  const statusMap: Record<string, string> = {
    'todo': 'todo',
    'in_progress': 'in_progress',
    'review': 'review',
    'done': 'done'
  };
  const newStatus = statusMap[kanban_column] || 'todo';

  db.run(
    `UPDATE tasks SET position = ?, kanban_column = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [position || 0, kanban_column || 'todo', newStatus, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی موقعیت' });
      }
      res.json({ message: 'موقعیت به‌روزرسانی شد' });
    }
  );
});

// Add dependency
router.post('/:id/dependencies', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { depends_on_task_id, dependency_type } = req.body;

  db.run(
    `INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
     VALUES (?, ?, ?)`,
    [id, depends_on_task_id, dependency_type || 'finish_to_start'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت وابستگی' });
      }
      res.status(201).json({ id: this.lastID, message: 'وابستگی ثبت شد' });
    }
  );
});

// Start time tracking
router.post('/:id/time/start', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO time_logs (task_id, user_id, start_time)
     VALUES (?, ?, ?)`,
    [id, userId, new Date().toISOString()],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در شروع تایمر' });
      }
      res.status(201).json({ id: this.lastID, message: 'تایمر شروع شد' });
    }
  );
});

// Stop time tracking
router.put('/:id/time/:logId/stop', authenticate, (req: AuthRequest, res: Response) => {
  const { id, logId } = req.params;
  const { description, billable, hourly_rate } = req.body;

  db.get('SELECT start_time FROM time_logs WHERE id = ? AND task_id = ?', [logId, id], (err, log: any) => {
    if (err || !log) {
      return res.status(500).json({ error: 'لاگ زمان یافت نشد' });
    }

    const startTime = new Date(log.start_time);
    const endTime = new Date();
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    db.run(
      `UPDATE time_logs SET 
        end_time = ?, duration_minutes = ?, description = ?, billable = ?, hourly_rate = ?
       WHERE id = ?`,
      [
        endTime.toISOString(),
        durationMinutes,
        description || null,
        billable ? 1 : 0,
        hourly_rate || null,
        logId
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در توقف تایمر' });
        }
        res.json({ duration_minutes: durationMinutes, message: 'تایمر متوقف شد' });
      }
    );
  });
});

// Get active time log for task
router.get('/:id/time/active', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.get(`
    SELECT tl.*, u.username, u.full_name
    FROM time_logs tl
    LEFT JOIN users u ON tl.user_id = u.id
    WHERE tl.task_id = ? AND tl.user_id = ? AND tl.end_time IS NULL
    ORDER BY tl.created_at DESC
    LIMIT 1
  `, [id, userId], (err, log) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تایمر فعال' });
    }
    res.json(log || null);
  });
});

// Get time logs for task
router.get('/:id/time', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.all(`
    SELECT tl.*, u.username, u.full_name
    FROM time_logs tl
    LEFT JOIN users u ON tl.user_id = u.id
    WHERE tl.task_id = ?
    ORDER BY tl.created_at DESC
  `, [id], (err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت لاگ زمان' });
    }
    res.json(logs);
  });
});

// ========== Activities ==========
router.get('/activities', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, contact_id, deal_id, lead_id, activity_type } = req.query;
  
  let query = 'SELECT * FROM activities WHERE 1=1';
  const params: any[] = [];

  if (account_id) {
    query += ' AND account_id = ?';
    params.push(account_id);
  }

  if (contact_id) {
    query += ' AND contact_id = ?';
    params.push(contact_id);
  }

  if (deal_id) {
    query += ' AND deal_id = ?';
    params.push(deal_id);
  }

  if (lead_id) {
    query += ' AND lead_id = ?';
    params.push(lead_id);
  }

  if (activity_type) {
    query += ' AND activity_type = ?';
    params.push(activity_type);
  }

  query += ' ORDER BY occurred_at DESC, created_at DESC LIMIT 100';

  db.all(query, params, (err, activities) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فعالیت‌ها' });
    }
    res.json(activities);
  });
});

router.post('/activities', authenticate, (req: AuthRequest, res: Response) => {
  const activity: Activity = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO activities (
      account_id, contact_id, deal_id, lead_id, activity_type, subject, body,
      channel, occurred_at, duration_min, attachments, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.account_id || null,
      activity.contact_id || null,
      activity.deal_id || null,
      activity.lead_id || null,
      activity.activity_type,
      activity.subject || null,
      activity.body || null,
      activity.channel || null,
      activity.occurred_at || new Date().toISOString(),
      activity.duration_min || null,
      activity.attachments || null,
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت فعالیت' });
      }
      res.status(201).json({ id: this.lastID, message: 'فعالیت با موفقیت ثبت شد' });
    }
  );
});

export default router;


