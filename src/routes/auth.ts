import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';

const router = express.Router();

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

const normalizeRole = (role: string): string => {
  const normalized = role.toLowerCase();
  // Map 'sales_manager' to 'sales' for backward compatibility
  if (normalized === 'sales_manager') {
    return 'sales_manager';
  }
  return normalized;
};

// Helper function to promisify db.get
const dbGet = (query: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper function to promisify db.run
const dbRun = (query: string, params: any[]): Promise<{ lastID?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username: string; password: string };

    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
    }

    const normalizedUsername = username.toLowerCase();
    
    const user = await dbGet(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [normalizedUsername, normalizedUsername]
    ) as User | undefined;

    if (!user) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const tokenPayload = {
      id: user.id.toString(),
      username: user.username,
      role: normalizeRole(user.role),
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name || null,
        phone: user.phone || null,
        avatarUrl: user.avatar_url || null,
        role: normalizeRole(user.role),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در ورود به سیستم' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, fullName, phone, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'فیلدهای الزامی را پر کنید' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();
    const selectedRole = (role || 'user').toLowerCase();

    // Check if user exists
    const existingUser = await dbGet(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [normalizedUsername, normalizedEmail]
    ) as User | undefined;

    if (existingUser) {
      return res.status(400).json({ error: 'نام کاربری یا ایمیل تکراری است' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await dbRun(
      'INSERT INTO users (username, email, password, role, full_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [normalizedUsername, normalizedEmail, hashedPassword, selectedRole, fullName || null, phone || null]
    );

    res.status(201).json({
      message: 'کاربر با موفقیت ثبت شد',
      id: result.lastID,
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'خطا در ثبت نام',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
