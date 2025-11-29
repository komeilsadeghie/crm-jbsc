import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Helper functions
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

const dbRun = (query: string, params: any[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Get all permissions grouped by module
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const permissions = await dbAll('SELECT * FROM permissions ORDER BY module, capability', []);
    const grouped: Record<string, any[]> = {};
    
    permissions.forEach((perm: any) => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    
    res.json(grouped);
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'خطا در دریافت دسترسی‌ها' });
  }
});

// Get user permissions
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.id !== req.params.userId) {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const userId = req.params.userId;
    const userPermissions = await dbAll(
      `SELECT p.*, up.granted 
       FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = ?`,
      [userId]
    );
    
    res.json(userPermissions);
  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'خطا در دریافت دسترسی‌های کاربر' });
  }
});

// Update user permissions
router.put('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const userId = req.params.userId;
    const { permissions } = req.body; // Array of { permission_id, granted }

    // Delete existing permissions
    await dbRun('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

    // Insert new permissions
    if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        if (perm.granted) {
          await dbRun(
            'INSERT INTO user_permissions (user_id, permission_id, granted) VALUES (?, ?, ?)',
            [userId, perm.permission_id, 1]
          );
        }
      }
    }

    res.json({ message: 'دسترسی‌های کاربر با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی دسترسی‌ها' });
  }
});

// Get user departments
router.get('/user/:userId/departments', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.id !== req.params.userId) {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const userId = req.params.userId;
    const departments = await dbAll(
      `SELECT d.* 
       FROM user_departments ud
       JOIN ticket_departments d ON ud.department_id = d.id
       WHERE ud.user_id = ?`,
      [userId]
    );
    
    res.json(departments);
  } catch (error: any) {
    console.error('Error fetching user departments:', error);
    res.status(500).json({ error: 'خطا در دریافت دپارتمان‌های کاربر' });
  }
});

// Update user departments
router.put('/user/:userId/departments', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const userId = req.params.userId;
    const { department_ids } = req.body; // Array of department IDs

    // Delete existing departments
    await dbRun('DELETE FROM user_departments WHERE user_id = ?', [userId]);

    // Insert new departments
    if (department_ids && Array.isArray(department_ids)) {
      for (const deptId of department_ids) {
        await dbRun(
          'INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)',
          [userId, deptId]
        );
      }
    }

    res.json({ message: 'دپارتمان‌های کاربر با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating user departments:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی دپارتمان‌ها' });
  }
});

export default router;

