import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get assignable users (for task assignment - available to all authenticated users)
router.get('/assignable', authenticate, (req: AuthRequest, res: Response) => {
  // Return only basic info needed for assignment
  db.all(`SELECT id, username, full_name, first_name, last_name, role, avatar_url, voip_extension 
          FROM users 
          WHERE is_staff = 1 OR is_admin = 1
          ORDER BY full_name ASC, username ASC`, [], (err, users) => {
    if (err) {
      console.error('Error fetching assignable users:', err);
      return res.status(500).json({ error: 'خطا در دریافت کاربران' });
    }
    // Format user display name
    const formattedUsers = (users || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
      role: user.role,
      avatar_url: user.avatar_url,
      voip_extension: user.voip_extension || null,
    }));
    res.json(formattedUsers);
  });
});

// Get all users (admin only)
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  db.all(`SELECT id, username, email, full_name, first_name, last_name, phone, role, 
          hourly_rate, facebook, linkedin, skype, email_signature, default_language, 
          direction, is_admin, is_staff, avatar_url, voip_extension, created_at 
          FROM users ORDER BY created_at DESC`, [], (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'خطا در دریافت کاربران' });
    }
    res.json(users || []);
  });
});

// Get single user
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  // Users can only view their own profile unless admin
  if (req.user?.role !== 'admin' && req.user?.id !== id) {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  db.get(`SELECT id, username, email, full_name, first_name, last_name, phone, role, 
          hourly_rate, facebook, linkedin, skype, email_signature, default_language, 
          direction, is_admin, is_staff, avatar_url, voip_extension, created_at 
          FROM users WHERE id = ?`, [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت کاربر' });
    }
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }
    res.json(user);
  });
});

// Create user (admin only)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { 
    username, email, password, full_name, first_name, last_name, phone, role,
    hourly_rate, facebook, linkedin, skype, email_signature, default_language,
    direction, is_admin, is_staff, voip_extension
  } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'فیلدهای الزامی را پر کنید' });
  }

  try {
    // Check if username or email already exists using Promise
    const dbGet = (query: string, params: any[]): Promise<any> => {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
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

    const existing = await dbGet(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username.toLowerCase(), email.toLowerCase()]
    );

    if (existing) {
      return res.status(400).json({ error: 'نام کاربری یا ایمیل تکراری است' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert with basic fields using Promise
    const result = await dbRun(
      `INSERT INTO users (
        username, email, password, role, full_name, phone
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        username.toLowerCase(), 
        email.toLowerCase(), 
        hashedPassword, 
        role || 'user',
        full_name || null,
        phone || null,
      ]
    );
    
    const userId = result.lastID;
    
    if (!userId) {
      return res.status(500).json({ error: 'خطا در ایجاد کاربر: شناسه کاربر ایجاد نشد' });
    }
    
    // Update additional fields if they were provided (these columns may not exist in older schemas)
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name || null);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name || null);
    }
    if (hourly_rate !== undefined) {
      updateFields.push('hourly_rate = ?');
      updateValues.push(hourly_rate || 0);
    }
    if (facebook !== undefined) {
      updateFields.push('facebook = ?');
      updateValues.push(facebook || null);
    }
    if (linkedin !== undefined) {
      updateFields.push('linkedin = ?');
      updateValues.push(linkedin || null);
    }
    if (skype !== undefined) {
      updateFields.push('skype = ?');
      updateValues.push(skype || null);
    }
    if (email_signature !== undefined) {
      updateFields.push('email_signature = ?');
      updateValues.push(email_signature || null);
    }
    if (default_language !== undefined) {
      updateFields.push('default_language = ?');
      updateValues.push(default_language || 'fa');
    }
    if (direction !== undefined) {
      updateFields.push('direction = ?');
      updateValues.push(direction || 'rtl');
    }
    if (is_admin !== undefined) {
      updateFields.push('is_admin = ?');
      updateValues.push(is_admin ? 1 : 0);
    }
    if (is_staff !== undefined) {
      updateFields.push('is_staff = ?');
      updateValues.push(is_staff ? 1 : 0);
    }
    if (voip_extension !== undefined) {
      updateFields.push('voip_extension = ?');
      updateValues.push(voip_extension || null);
    }
    
    // Only update if there are fields to update - wait for completion
    if (updateFields.length > 0) {
      updateValues.push(userId);
      try {
        await dbRun(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      } catch (updateErr: any) {
        // Log error but don't fail - these are optional fields
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Could not update additional user fields:', updateErr.message);
        }
      }
    }
    
    res.status(201).json({ id: userId, message: 'کاربر با موفقیت ایجاد شد' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'خطا در ایجاد کاربر',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  // Users can only update their own profile unless admin
  if (req.user?.role !== 'admin' && req.user?.id !== id) {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { 
    username, email, full_name, first_name, last_name, phone, role, password,
    hourly_rate, facebook, linkedin, skype, email_signature, default_language,
    direction, is_admin, is_staff, voip_extension
  } = req.body;

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];

  if (username) {
    updates.push('username = ?');
    params.push(username.toLowerCase());
  }
  if (email) {
    updates.push('email = ?');
    params.push(email.toLowerCase());
  }
  if (full_name !== undefined) {
    updates.push('full_name = ?');
    params.push(full_name || null);
  }
  if (first_name !== undefined) {
    updates.push('first_name = ?');
    params.push(first_name || null);
  }
  if (last_name !== undefined) {
    updates.push('last_name = ?');
    params.push(last_name || null);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone || null);
  }
  if (hourly_rate !== undefined) {
    updates.push('hourly_rate = ?');
    params.push(hourly_rate || 0);
  }
  if (facebook !== undefined) {
    updates.push('facebook = ?');
    params.push(facebook || null);
  }
  if (linkedin !== undefined) {
    updates.push('linkedin = ?');
    params.push(linkedin || null);
  }
  if (skype !== undefined) {
    updates.push('skype = ?');
    params.push(skype || null);
  }
  if (email_signature !== undefined) {
    updates.push('email_signature = ?');
    params.push(email_signature || null);
  }
  if (default_language !== undefined) {
    updates.push('default_language = ?');
    params.push(default_language || 'fa');
  }
  if (direction !== undefined) {
    updates.push('direction = ?');
    params.push(direction || 'rtl');
  }
  if (is_admin !== undefined && req.user?.role === 'admin') {
    updates.push('is_admin = ?');
    params.push(is_admin ? 1 : 0);
  }
  if (is_staff !== undefined && req.user?.role === 'admin') {
    updates.push('is_staff = ?');
    params.push(is_staff ? 1 : 0);
  }
  if (voip_extension !== undefined) {
    updates.push('voip_extension = ?');
    params.push(voip_extension || null);
  }
  if (role && req.user?.role === 'admin') {
    updates.push('role = ?');
    params.push(role);
  }
  if (password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    } catch (error) {
      return res.status(500).json({ error: 'خطا در هش کردن رمز عبور' });
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ error: 'خطا در به‌روزرسانی کاربر' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }
      res.json({ message: 'کاربر با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete user (admin only)
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;

  // Prevent deleting yourself
  if (req.user?.id === id) {
    return res.status(400).json({ error: 'نمی‌توانید خودتان را حذف کنید' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ error: 'خطا در حذف کاربر' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }
    res.json({ message: 'کاربر با موفقیت حذف شد' });
  });
});

export default router;

