import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { getUserProfile, listUsersByRole, updateUserProfile } from './profile.service';
import { db } from '../../database/db';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'دسترسی غیرمجاز' });
    }

    const profile = await getUserProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت پروفایل' });
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'دسترسی غیرمجاز' });
    }

    const profile = await updateUserProfile(req.user.id, req.body);
    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در بروزرسانی پروفایل' });
  }
});

router.put('/me/password', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'دسترسی غیرمجاز' });
    }

    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'رمز عبور فعلی و جدید الزامی است' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل 6 کاراکتر باشد' });
    }

    // Get user from database
    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err: any, user: any) => {
      if (err || !user) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }

      // Verify current password
      const isValid = await bcrypt.compare(current_password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (err: any) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
        }
        res.json({ message: 'رمز عبور با موفقیت تغییر یافت' });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
  }
});

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const parsedRole = typeof role === 'string' ? role : undefined;

    const users = await listUsersByRole(parsedRole);
    res.json(Array.isArray(users) ? users : []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت کاربران' });
  }
});

export default router;


