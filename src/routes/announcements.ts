import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';

const router = express.Router();

// Get all announcements (for admin) or active announcements (for users)
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { search } = req.query;
  const isAdmin = req.user?.role === 'admin';
  
  let query = `
    SELECT a.*, u.username as created_by_username, u.full_name as created_by_name
    FROM announcements a
    LEFT JOIN users u ON a.created_by = u.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  // Non-admin users only see active announcements within date range
  if (!isAdmin) {
    query += ` AND a.is_active = 1 AND (a.start_date IS NULL OR DATE(a.start_date) <= DATE('now')) AND (a.end_date IS NULL OR DATE(a.end_date) >= DATE('now'))`;
  }
  
  if (search) {
    query += ` AND (a.title LIKE ? OR a.message LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += ` ORDER BY a.created_at DESC`;
  
  db.all(query, params, (err, announcements) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت اعلانات' });
    }
    res.json(announcements);
  });
});

// Create announcement (admin only)
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }
  
  const { title, message, start_date, end_date, is_active } = req.body;
  const userId = req.user?.id;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'عنوان و متن اعلان الزامی است' });
  }
  
  db.run(
    `INSERT INTO announcements (title, message, start_date, end_date, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title,
      message,
      start_date || null,
      end_date || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ایجاد اعلان: ' + err.message });
      }
      
      const announcementId = this.lastID;
      
      // Log activity
      const clientInfo = getClientInfo(req);
      if (userId) {
        logActivity({
          userId: parseInt(userId),
          action: 'create',
          entityType: 'announcement',
          entityId: announcementId,
          entityTitle: title,
          ...clientInfo
        });
      }
      
      // Create notifications for all users
      db.all('SELECT id FROM users', [], (err, users: any[]) => {
        if (!err && users && users.length > 0) {
          const stmt = db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read)
            VALUES (?, ?, ?, ?, ?, ?, 0)
          `);
          
          users.forEach((user: any) => {
            stmt.run([
              user.id,
              'announcement',
              title,
              message,
              'announcement',
              announcementId
            ]);
          });
          
          stmt.finalize();
        }
      });
      
      res.status(201).json({ id: announcementId, message: 'اعلان با موفقیت ایجاد شد' });
    }
  );
});

// Update announcement (admin only)
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }
  
  const { id } = req.params;
  const { title, message, start_date, end_date, is_active } = req.body;
  const userId = req.user?.id;
  
  db.run(
    `UPDATE announcements 
     SET title = ?, message = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title,
      message,
      start_date || null,
      end_date || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی اعلان: ' + err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'اعلان یافت نشد' });
      }
      
      // Log activity
      const clientInfo = getClientInfo(req);
      if (userId) {
        logActivity({
          userId: parseInt(userId),
          action: 'update',
          entityType: 'announcement',
          entityId: parseInt(id),
          entityTitle: title,
          ...clientInfo
        });
      }
      
      res.json({ message: 'اعلان با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete announcement (admin only)
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }
  
  const { id } = req.params;
  const userId = req.user?.id;
  
  db.run('DELETE FROM announcements WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف اعلان: ' + err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'اعلان یافت نشد' });
    }
    
    // Log activity
    const clientInfo = getClientInfo(req);
    if (userId) {
      logActivity({
        userId: parseInt(userId),
        action: 'delete',
        entityType: 'announcement',
        entityId: parseInt(id),
        ...clientInfo
      });
    }
    
    res.json({ message: 'اعلان با موفقیت حذف شد' });
  });
});

export default router;

