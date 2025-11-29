import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('فقط فایل‌های تصویری مجاز هستند'));
  }
});

// Helper function to promisify db.get
const dbGet = (query: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper function to promisify db.all
const dbAll = (query: string, params: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Helper function to promisify db.run
const dbRun = (query: string, params: any[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Get all settings (public endpoint for logo and company name, full settings for admin)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await dbAll('SELECT key, value FROM settings', []);
    const settingsObj: Record<string, string> = {};
    settings.forEach((s: any) => {
      settingsObj[s.key] = s.value || '';
    });
    
    // If user is not admin, only return public settings (logo and company name)
    if (req.user?.role !== 'admin') {
      const publicSettings: Record<string, string> = {};
      if (settingsObj.company_name) publicSettings.company_name = settingsObj.company_name;
      if (settingsObj.logo_main) publicSettings.logo_main = settingsObj.logo_main;
      if (settingsObj.logo_text) publicSettings.logo_text = settingsObj.logo_text;
      if (settingsObj.logo_favicon) publicSettings.logo_favicon = settingsObj.logo_favicon;
      return res.json(publicSettings);
    }
    
    res.json(settingsObj);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'خطا در دریافت تنظیمات' });
  }
});

// Get single setting
router.get('/:key', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const setting = await dbGet('SELECT key, value FROM settings WHERE key = ?', [req.params.key]);
    if (!setting) {
      return res.status(404).json({ error: 'تنظیمات یافت نشد' });
    }
    res.json({ key: setting.key, value: setting.value });
  } catch (error: any) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'خطا در دریافت تنظیمات' });
  }
});

// Update settings (bulk)
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const settings = req.body;
    const updates: Promise<void>[] = [];

    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        dbRun(
          `INSERT INTO settings (key, value, updated_at) 
           VALUES (?, ?, CURRENT_TIMESTAMP) 
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
          [key, String(value)]
        )
      );
    }

    await Promise.all(updates);
    res.json({ message: 'تنظیمات با موفقیت به‌روزرسانی شد' });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی تنظیمات' });
  }
});

// Upload logo
router.post('/upload-logo', authenticate, upload.single('logo'), async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'فایل ارسال نشد' });
  }

  try {
    const logoType = req.body.type || 'main'; // main, text, favicon
    const logoPath = `/uploads/logos/${req.file.filename}`;
    
    await dbRun(
      `INSERT INTO settings (key, value, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP) 
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [`logo_${logoType}`, logoPath]
    );

    res.json({ 
      message: 'لوگو با موفقیت آپلود شد',
      path: logoPath,
      type: logoType
    });
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'خطا در آپلود لوگو' });
  }
});

// Delete logo
router.delete('/logo/:type', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  try {
    const logoType = req.params.type; // main, text, favicon
    const setting = await dbGet('SELECT value FROM settings WHERE key = ?', [`logo_${logoType}`]);
    
    if (setting && setting.value) {
      const filePath = path.join(__dirname, '../../', setting.value);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await dbRun(
      `UPDATE settings SET value = '', updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
      [`logo_${logoType}`]
    );

    res.json({ message: 'لوگو با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'خطا در حذف لوگو' });
  }
});

export default router;

