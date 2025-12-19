import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun, isDatabaseReady, testDatabaseConnection } from '../database/db';

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

router.post('/login', async (req: Request, res: Response) => {
  try {
    // Check if database is ready
    if (!isDatabaseReady()) {
      return res.status(503).json({ 
        error: 'Database connection not available. Please try again in a moment.',
        code: 'DATABASE_NOT_READY'
      });
    }

    const { username, password } = req.body as { username: string; password: string };

    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
    }

    const normalizedUsername = username.toLowerCase();
    
    let user: User | undefined;
    try {
      user = await dbGet(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [normalizedUsername, normalizedUsername]
      ) as User | undefined;
    } catch (dbError: any) {
      console.error('Database error in login:', dbError);
      return res.status(503).json({ 
        error: 'Database error. Please try again.',
        code: 'DATABASE_ERROR'
      });
    }

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
  } catch (error: any) {
    console.error('Login error:', error);
    // Don't expose internal errors in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'خطا در ورود به سیستم';
    res.status(500).json({ 
      error: errorMessage,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    // Check if database is ready
    if (!isDatabaseReady()) {
      console.error('❌ Database not ready - pool not initialized');
      return res.status(503).json({ 
        error: 'Database connection not available. Please try again in a moment.',
        code: 'DATABASE_NOT_READY'
      });
    }

    // Test actual database connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Database connection test failed');
      return res.status(503).json({ 
        error: 'Database connection test failed. Please check MySQL service.',
        code: 'DATABASE_CONNECTION_FAILED'
      });
    }

    const { username, email, password, fullName, phone, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'فیلدهای الزامی را پر کنید' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();
    const selectedRole = (role || 'user').toLowerCase();

    // Check if user exists
    let existingUser: User | undefined;
    try {
      existingUser = await dbGet(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [normalizedUsername, normalizedEmail]
      ) as User | undefined;
    } catch (dbError: any) {
      console.error('Database error in register (checking user):', dbError);
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      
      // Check for specific MySQL errors
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
        return res.status(503).json({ 
          error: 'Cannot connect to MySQL server. Please check MySQL service status.',
          code: 'DATABASE_CONNECTION_REFUSED'
        });
      }
      
      if (dbError.code === 'ER_ACCESS_DENIED_ERROR' || dbError.code === 'ER_BAD_DB_ERROR') {
        return res.status(503).json({ 
          error: 'Database access denied. Please check DATABASE_URL configuration.',
          code: 'DATABASE_ACCESS_DENIED'
        });
      }

      return res.status(503).json({ 
        error: 'Database error. Please try again.',
        code: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'نام کاربری یا ایمیل تکراری است' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let result;
    try {
      result = await dbRun(
        'INSERT INTO users (username, email, password, role, full_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [normalizedUsername, normalizedEmail, hashedPassword, selectedRole, fullName || null, phone || null]
      );
    } catch (dbError: any) {
      console.error('Database error inserting user:', dbError);
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      
      // Check for specific MySQL errors
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
        return res.status(503).json({ 
          error: 'Cannot connect to MySQL server. Please check MySQL service status.',
          code: 'DATABASE_CONNECTION_REFUSED'
        });
      }
      
      if (dbError.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ 
          error: 'نام کاربری یا ایمیل تکراری است',
          code: 'DUPLICATE_ENTRY'
        });
      }

      if (dbError.code === 'ER_NO_SUCH_TABLE') {
        return res.status(503).json({ 
          error: 'Database tables not initialized. Please wait for initialization to complete.',
          code: 'DATABASE_TABLES_NOT_INITIALIZED'
        });
      }

      return res.status(503).json({ 
        error: 'Database error. Please try again.',
        code: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    res.status(201).json({
      message: 'کاربر با موفقیت ثبت شد',
      id: result.lastID || result.insertId,
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    console.error('Error details:', error.message);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'خطا در ثبت نام';
    res.status(500).json({ 
      error: errorMessage,
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
