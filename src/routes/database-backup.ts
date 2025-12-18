import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Helper function to get database path
const getDbPath = (): string => {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  
  const isProduction = __dirname.includes('dist');
  if (isProduction) {
    return path.join(__dirname, '../../database/crm.db');
  } else {
    return path.join(__dirname, '../../database/crm.db');
  }
};

// Helper function to get backups directory
const getBackupsDir = (): string => {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  const backupsDir = path.join(dbDir, 'backups');
  
  // Ensure backups directory exists
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  return backupsDir;
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

// Get all backups
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const backupsDir = getBackupsDir();
    
    if (!fs.existsSync(backupsDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(backupsDir);
    const backups = files
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        return {
          id: file,
          filename: file,
          size: stats.size,
          created_at: stats.birthtime.toISOString(),
          path: filePath
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    res.json(backups);
  } catch (error: any) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'خطا در دریافت پشتیبان‌ها' });
  }
});

// Create backup
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dbPath = getDbPath();
    const backupsDir = getBackupsDir();
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'فایل دیتابیس یافت نشد' });
    }
    
    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `crm-backup-${timestamp}.db`;
    const backupPath = path.join(backupsDir, backupFilename);
    
    // Copy database file to backup location
    fs.copyFileSync(dbPath, backupPath);
    
    // Get backup stats
    const stats = fs.statSync(backupPath);
    
    res.status(201).json({
      id: backupFilename,
      filename: backupFilename,
      size: stats.size,
      created_at: stats.birthtime.toISOString(),
      message: 'پشتیبان با موفقیت ایجاد شد'
    });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'خطا در ایجاد پشتیبان: ' + (error.message || 'خطای نامشخص') });
  }
});

// Download backup
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const backupsDir = getBackupsDir();
    const backupPath = path.join(backupsDir, id);
    
    // Security: prevent path traversal
    if (!backupPath.startsWith(backupsDir)) {
      return res.status(400).json({ error: 'نام فایل نامعتبر است' });
    }
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'پشتیبان یافت نشد' });
    }
    
    res.download(backupPath, id, (err) => {
      if (err) {
        console.error('Error downloading backup:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'خطا در دانلود پشتیبان' });
        }
      }
    });
  } catch (error: any) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'خطا در دانلود پشتیبان' });
  }
});

// Delete backup
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const backupsDir = getBackupsDir();
    const backupPath = path.join(backupsDir, id);
    
    // Security: prevent path traversal
    if (!backupPath.startsWith(backupsDir)) {
      return res.status(400).json({ error: 'نام فایل نامعتبر است' });
    }
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'پشتیبان یافت نشد' });
    }
    
    fs.unlinkSync(backupPath);
    
    res.json({ message: 'پشتیبان با موفقیت حذف شد' });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'خطا در حذف پشتیبان' });
  }
});

export default router;

