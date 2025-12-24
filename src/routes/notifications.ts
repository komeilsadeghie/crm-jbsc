import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user's notifications
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { unread_only } = req.query;
  
  let query = `
    SELECT * FROM notifications
    WHERE user_id = ?
  `;
  
  const params: any[] = [userId];
  
  if (unread_only === 'true') {
    query += ` AND is_read = 0`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT 50`;
  
  db.all(query, params, (err, notifications) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      // If table doesn't exist, return empty array instead of error
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
        console.warn('notifications table does not exist yet, returning empty array');
        return res.json([]);
      }
      return res.status(500).json({ error: 'خطا در دریافت اعلان‌ها' });
    }
    res.json(Array.isArray(notifications) ? notifications : []);
  });
});

// Mark notification as read
router.put('/:id/read', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [id, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی اعلان' });
      }
      res.json({ message: 'اعلان خوانده شد' });
    }
  );
});

// Mark all notifications as read
router.put('/read-all', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی اعلان‌ها' });
      }
      res.json({ message: 'همه اعلان‌ها خوانده شدند' });
    }
  );
});

// Get unread count
router.get('/unread-count', authenticate, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
    (err, row: any) => {
      if (err) {
        console.error('Error fetching unread count:', err);
        // If table doesn't exist, return 0
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          console.warn('notifications table does not exist yet, returning 0');
          return res.json({ count: 0 });
        }
        return res.status(500).json({ error: 'خطا در دریافت تعداد اعلان‌ها' });
      }
      res.json({ count: row?.count || 0 });
    }
  );
});

export default router;




