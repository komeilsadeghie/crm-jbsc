import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
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
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'unassign',
        entityType: 'task',
        entityId: parseInt(id),
        description: `Unassigned user ${assigneeUserId} from task`,
        metadata: { unassigned_user_id: assigneeUserId },
        ...clientInfo
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

export default router;

