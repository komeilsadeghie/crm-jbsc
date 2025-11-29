import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get permissions for contact
router.get('/contact/:contactId', authenticate, (req: AuthRequest, res: Response) => {
  const { contactId } = req.params;

  db.all('SELECT * FROM contact_permissions WHERE contact_id = ?', [contactId], (err, permissions) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت دسترسی‌ها' });
    }
    res.json(permissions);
  });
});

// Set permission for contact
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const { contact_id, module, can_view, can_edit } = req.body;

  db.run(
    `INSERT OR REPLACE INTO contact_permissions (contact_id, module, can_view, can_edit)
     VALUES (?, ?, ?, ?)`,
    [
      contact_id,
      module,
      can_view ? 1 : 0,
      can_edit ? 1 : 0
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت دسترسی' });
      }
      res.json({ message: 'دسترسی با موفقیت ثبت شد' });
    }
  );
});

// Check if contact has permission
router.get('/check/:contactId/:module', authenticate, (req: AuthRequest, res: Response) => {
  const { contactId, module } = req.params;
  const { action } = req.query; // 'view' or 'edit'

  db.get(
    'SELECT * FROM contact_permissions WHERE contact_id = ? AND module = ?',
    [contactId, module],
    (err, perm: any) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در بررسی دسترسی' });
      }

      if (!perm) {
        return res.json({ has_permission: false });
      }

      const hasPermission = action === 'edit' 
        ? perm.can_edit === 1 
        : perm.can_view === 1;

      res.json({ has_permission: hasPermission });
    }
  );
});

export default router;


