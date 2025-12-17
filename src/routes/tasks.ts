import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Task, Activity } from '../types/extended';
import { logActivity, getClientInfo } from '../utils/activityLogger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/tasks/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|zip|rar|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('نوع فایل مجاز نیست'));
    }
  }
});

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
      
      // Log activity
      const clientInfo = getClientInfo(req);
      if (userId) {
        logActivity({
          userId: parseInt(userId),
          action: 'create',
          entityType: 'task',
          entityId: taskId,
          entityTitle: task.title,
          metadata: { status: task.status || 'todo', priority: task.priority || 'medium' },
          ...clientInfo
        });
      }

      // Create notification for assigned user if task is assigned
      if (task.assigned_to && task.assigned_to !== userId) {
        db.run(
          `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
          [
            task.assigned_to,
            'task_assigned',
            'تسک جدید به شما اختصاص داده شد',
            `تسک "${task.title}" به شما اختصاص داده شد`,
            'task',
            taskId
          ],
          (err) => {
            if (err) console.error('Error creating notification:', err);
          }
        );
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

// ========== Task Multi-Assign ==========

// Get task assignees
router.get('/:id/assignees', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.all(`
    SELECT ta.*, u.full_name, u.email, u.username
    FROM task_assignees ta
    LEFT JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = ?
    ORDER BY ta.is_primary DESC, ta.created_at ASC
  `, [id], (err, assignees) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت مسئولان تسک' });
    }
    res.json(assignees);
  });
});

// Add assignee to task
router.post('/:id/assignees', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { user_id, is_primary = false } = req.body;
  const userId = req.user?.id;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id الزامی است' });
  }

  db.run(
    `INSERT OR IGNORE INTO task_assignees (task_id, user_id, is_primary)
     VALUES (?, ?, ?)`,
    [id, user_id, is_primary ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در افزودن مسئول' });
      }

      // If this is primary, unset other primary assignees
      if (is_primary) {
        db.run(
          `UPDATE task_assignees SET is_primary = 0 
           WHERE task_id = ? AND user_id != ? AND is_primary = 1`,
          [id, user_id]
        );
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'assign',
        entityType: 'task',
        entityId: parseInt(id),
        description: `Assigned user ${user_id} to task`,
        metadata: { assigned_user_id: user_id, is_primary },
        ...clientInfo
      });

      res.status(201).json({ id: this.lastID, message: 'مسئول با موفقیت اضافه شد' });
    }
  );
});

// Remove assignee from task
router.delete('/:id/assignees/:userId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, userId: assigneeUserId } = req.params;
  const userId = req.user?.id;

  db.run(
    'DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?',
    [id, assigneeUserId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف مسئول' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'مسئول یافت نشد' });
      }

      const clientInfo = getClientInfo(req);
      // Get user name for description
      db.get('SELECT full_name, username FROM users WHERE id = ?', [assigneeUserId], (err, user: any) => {
        const userName = user?.full_name || user?.username || `کاربر #${assigneeUserId}`;
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'unassign',
          entityType: 'task',
          entityId: parseInt(id),
          metadata: { unassigned_user_id: assigneeUserId, unassignedTo: userName },
          ...clientInfo
        });
      });

      res.json({ message: 'مسئول با موفقیت حذف شد' });
    }
  );
});

// Set primary assignee
router.put('/:id/assignees/:userId/primary', authenticate, (req: AuthRequest, res: Response) => {
  const { id, userId: assigneeUserId } = req.params;
  const userId = req.user?.id;

  db.serialize(() => {
    // Unset all primary assignees
    db.run(
      'UPDATE task_assignees SET is_primary = 0 WHERE task_id = ?',
      [id],
      () => {
        // Set this one as primary
        db.run(
          'UPDATE task_assignees SET is_primary = 1 WHERE task_id = ? AND user_id = ?',
          [id, assigneeUserId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'خطا در تنظیم مسئول اصلی' });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'مسئول یافت نشد' });
            }

            const clientInfo = getClientInfo(req);
            logActivity({
              userId: parseInt(String(userId!)),
              action: 'set_primary',
              entityType: 'task',
              entityId: parseInt(id),
              description: `Set user ${assigneeUserId} as primary assignee`,
              metadata: { primary_user_id: assigneeUserId },
              ...clientInfo
            });

            res.json({ message: 'مسئول اصلی با موفقیت تنظیم شد' });
          }
        );
      }
    );
  });
});

// ========== Task Followers ==========

// Get task followers
router.get('/:id/followers', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.all(`
    SELECT tf.*, u.full_name, u.email, u.username
    FROM task_followers tf
    LEFT JOIN users u ON tf.user_id = u.id
    WHERE tf.task_id = ?
    ORDER BY tf.created_at ASC
  `, [id], (err, followers) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت دنبال‌کنندگان' });
    }
    res.json(followers);
  });
});

// Add follower to task
router.post('/:id/followers', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { user_id } = req.body;
  const userId = req.user?.id;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id الزامی است' });
  }

  db.run(
    `INSERT OR IGNORE INTO task_followers (task_id, user_id)
     VALUES (?, ?)`,
    [id, user_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در افزودن دنبال‌کننده' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'follow',
        entityType: 'task',
        entityId: parseInt(id),
        description: `User ${user_id} started following task`,
        metadata: { follower_user_id: user_id },
        ...clientInfo
      });

      res.status(201).json({ id: this.lastID, message: 'دنبال‌کننده با موفقیت اضافه شد' });
    }
  );
});

// Remove follower from task
router.delete('/:id/followers/:userId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, userId: followerUserId } = req.params;
  const userId = req.user?.id;

  db.run(
    'DELETE FROM task_followers WHERE task_id = ? AND user_id = ?',
    [id, followerUserId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف دنبال‌کننده' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'دنبال‌کننده یافت نشد' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'unfollow',
        entityType: 'task',
        entityId: parseInt(id),
        description: `User ${followerUserId} stopped following task`,
        metadata: { unfollower_user_id: followerUserId },
        ...clientInfo
      });

      res.json({ message: 'دنبال‌کننده با موفقیت حذف شد' });
    }
  );
});

// ========== Task Comments ==========

// Get task comments
router.get('/:id/comments', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { include_internal = 'false' } = req.query;

  let query = `
    SELECT tc.*, u.full_name, u.email, u.username
    FROM task_comments tc
    LEFT JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ?
  `;
  const params: any[] = [id];

  if (include_internal !== 'true') {
    query += ' AND tc.is_internal = 0';
  }

  query += ' ORDER BY tc.created_at ASC';

  db.all(query, params, (err, comments) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت نظرات' });
    }
    res.json(comments);
  });
});

// Add comment to task
router.post('/:id/comments', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { comment, is_internal = false } = req.body;
  const userId = req.user?.id;

  if (!comment || comment.trim() === '') {
    return res.status(400).json({ error: 'نظر الزامی است' });
  }

  db.run(
    `INSERT INTO task_comments (task_id, user_id, comment, is_internal)
     VALUES (?, ?, ?, ?)`,
    [id, userId ? parseInt(String(userId)) : null, comment.trim(), is_internal ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در افزودن نظر' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'comment',
        entityType: 'task',
        entityId: parseInt(id),
        description: `Added comment to task`,
        metadata: { is_internal },
        ...clientInfo
      });

      res.status(201).json({ id: this.lastID, message: 'نظر با موفقیت اضافه شد' });
    }
  );
});

// Update comment
router.put('/:id/comments/:commentId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, commentId } = req.params;
  const { comment } = req.body;
  const userId = req.user?.id;

  if (!comment || comment.trim() === '') {
    return res.status(400).json({ error: 'نظر الزامی است' });
  }

  // Check if user owns the comment
  db.get('SELECT user_id FROM task_comments WHERE id = ? AND task_id = ?', [commentId, id], (err, commentData: any) => {
    if (err || !commentData) {
      return res.status(404).json({ error: 'نظر یافت نشد' });
    }

    if (commentData.user_id !== parseInt(String(userId))) {
      return res.status(403).json({ error: 'شما اجازه ویرایش این نظر را ندارید' });
    }

    db.run(
      `UPDATE task_comments SET comment = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND task_id = ?`,
      [comment.trim(), commentId, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در به‌روزرسانی نظر' });
        }

        const clientInfo = getClientInfo(req);
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'update_comment',
          entityType: 'task',
          entityId: parseInt(id),
          description: `Updated comment ${commentId}`,
          ...clientInfo
        });

        res.json({ message: 'نظر با موفقیت به‌روزرسانی شد' });
      }
    );
  });
});

// Delete comment
router.delete('/:id/comments/:commentId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, commentId } = req.params;
  const userId = req.user?.id;

  // Check if user owns the comment or is admin
  db.get('SELECT user_id FROM task_comments WHERE id = ? AND task_id = ?', [commentId, id], (err, commentData: any) => {
    if (err || !commentData) {
      return res.status(404).json({ error: 'نظر یافت نشد' });
    }

    const isOwner = commentData.user_id === parseInt(String(userId));
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'شما اجازه حذف این نظر را ندارید' });
    }

    db.run('DELETE FROM task_comments WHERE id = ? AND task_id = ?', [commentId, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف نظر' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'delete_comment',
        entityType: 'task',
        entityId: parseInt(id),
        description: `Deleted comment ${commentId}`,
        ...clientInfo
      });

      res.json({ message: 'نظر با موفقیت حذف شد' });
    });
  });
});

// ========== Task Attachments ==========

// Get task attachments
router.get('/:id/attachments', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.all(`
    SELECT ta.*, u.full_name as uploaded_by_name
    FROM task_attachments ta
    LEFT JOIN users u ON ta.uploaded_by = u.id
    WHERE ta.task_id = ?
    ORDER BY ta.created_at DESC
  `, [id], (err, attachments) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت ضمیمه‌ها' });
    }
    res.json(attachments);
  });
});

// Upload attachment to task
router.post('/:id/attachments', authenticate, upload.single('file'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!req.file) {
    return res.status(400).json({ error: 'فایل ارسال نشده است' });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const fileSize = req.file.size;
  const mimeType = req.file.mimetype;

  db.run(
    `INSERT INTO task_attachments (task_id, file_name, file_path, file_size, mime_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, fileName, filePath, fileSize, mimeType, userId ? parseInt(String(userId)) : null],
    function(err) {
      if (err) {
        // Delete uploaded file if database insert fails
        fs.unlinkSync(filePath);
        return res.status(500).json({ error: 'خطا در ثبت ضمیمه' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'upload_attachment',
        entityType: 'task',
        entityId: parseInt(id),
        description: `Uploaded attachment: ${fileName}`,
        metadata: { file_name: fileName, file_size: fileSize },
        ...clientInfo
      });

      res.status(201).json({ id: this.lastID, message: 'ضمیمه با موفقیت اضافه شد' });
    }
  );
});

// Download attachment
router.get('/:id/attachments/:attachmentId/download', authenticate, (req: AuthRequest, res: Response) => {
  const { id, attachmentId } = req.params;

  db.get('SELECT * FROM task_attachments WHERE id = ? AND task_id = ?', [attachmentId, id], (err, attachment: any) => {
    if (err || !attachment) {
      return res.status(404).json({ error: 'ضمیمه یافت نشد' });
    }

    const filePath = path.join(__dirname, '../../', attachment.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'فایل یافت نشد' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.sendFile(path.resolve(filePath));
  });
});

// Delete attachment
router.delete('/:id/attachments/:attachmentId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, attachmentId } = req.params;
  const userId = req.user?.id;

  db.get('SELECT * FROM task_attachments WHERE id = ? AND task_id = ?', [attachmentId, id], (err, attachment: any) => {
    if (err || !attachment) {
      return res.status(404).json({ error: 'ضمیمه یافت نشد' });
    }

    const filePath = path.join(__dirname, '../../', attachment.file_path);

    db.run('DELETE FROM task_attachments WHERE id = ? AND task_id = ?', [attachmentId, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف ضمیمه' });
      }

      // Delete file from filesystem
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'delete_attachment',
        entityType: 'task',
        entityId: parseInt(id),
        description: `Deleted attachment: ${attachment.file_name}`,
        ...clientInfo
      });

      res.json({ message: 'ضمیمه با موفقیت حذف شد' });
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


