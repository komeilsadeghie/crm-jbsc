import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Client login (for contacts)
router.post('/login', async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی است' });
  }

  db.get(
    `SELECT c.*, a.name as account_name 
     FROM contacts c
     LEFT JOIN accounts a ON c.account_id = a.id
     WHERE c.email = ? AND c.portal_enabled = 1`,
    [email],
    async (err, contact: any) => {
      if (err || !contact) {
        return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
      }

      // Check password
      if (!contact.portal_password) {
        return res.status(401).json({ error: 'رمز عبور تنظیم نشده است' });
      }

      const isValid = await bcrypt.compare(password, contact.portal_password);
      if (!isValid) {
        return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
      }

      // Generate token
      const token = jwt.sign(
        { 
          id: contact.id, 
          type: 'contact',
          account_id: contact.account_id 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      res.json({
        token,
        contact: {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          account_id: contact.account_id,
          account_name: contact.account_name
        }
      });
    }
  );
});

// Middleware to authenticate contact
const authenticateContact = async (req: AuthRequest, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'توکن احراز هویت یافت نشد' });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'contact') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    db.get('SELECT * FROM contacts WHERE id = ? AND portal_enabled = 1', [decoded.id], (err, contact) => {
      if (err || !contact) {
        return res.status(401).json({ error: 'مخاطب یافت نشد' });
      }
      req.user = decoded;
      req.contact = contact;
      next();
    });
  } catch (error) {
    return res.status(401).json({ error: 'توکن نامعتبر است' });
  }
};

// Get contact's invoices
router.get('/invoices', authenticateContact, (req: AuthRequest, res: Response) => {
  const contactId = req.user?.id;
  const accountId = req.contact?.account_id;

  db.all(
    `SELECT i.*, a.name as account_name
     FROM invoices i
     LEFT JOIN accounts a ON i.account_id = a.id
     WHERE i.account_id = ? OR i.contact_id = ?
     ORDER BY i.created_at DESC`,
    [accountId, contactId],
    (err, invoices) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت فاکتورها' });
      }
      res.json(invoices);
    }
  );
});

// Get single invoice
router.get('/invoices/:id', authenticateContact, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const accountId = req.contact?.account_id;

  db.get(
    `SELECT i.*, a.name as account_name
     FROM invoices i
     LEFT JOIN accounts a ON i.account_id = a.id
     WHERE i.id = ? AND (i.account_id = ? OR i.contact_id = ?)`,
    [id, accountId, req.user?.id],
    (err, invoice) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت فاکتور' });
      }
      if (!invoice) {
        return res.status(404).json({ error: 'فاکتور یافت نشد' });
      }
      res.json(invoice);
    }
  );
});

// Get contact's estimates
router.get('/estimates', authenticateContact, (req: AuthRequest, res: Response) => {
  const accountId = req.contact?.account_id;

  db.all(
    `SELECT e.*, a.name as account_name
     FROM estimates e
     LEFT JOIN accounts a ON e.account_id = a.id
     WHERE e.account_id = ?
     ORDER BY e.created_at DESC`,
    [accountId],
    (err, estimates) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت پیش‌فاکتورها' });
      }
      res.json(estimates);
    }
  );
});

// Accept estimate
router.post('/estimates/:id/accept', authenticateContact, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.run(
    'UPDATE estimates SET status = ? WHERE id = ?',
    ['accepted', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در قبول پیش‌فاکتور' });
      }
      res.json({ message: 'پیش‌فاکتور با موفقیت قبول شد' });
    }
  );
});

// Get contact's tickets
router.get('/tickets', authenticateContact, (req: AuthRequest, res: Response) => {
  const contactId = req.user?.id;

  db.all(
    `SELECT t.*, td.name as department_name
     FROM tickets t
     LEFT JOIN ticket_departments td ON t.department_id = td.id
     WHERE t.contact_id = ?
     ORDER BY t.created_at DESC`,
    [contactId],
    (err, tickets) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
      }
      res.json(tickets);
    }
  );
});

// Create ticket
router.post('/tickets', authenticateContact, (req: AuthRequest, res: Response) => {
  const ticket = req.body;
  const contactId = req.user?.id;

  db.run(
    `INSERT INTO tickets (
      contact_id, department_id, subject, description, priority, status
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      contactId,
      ticket.department_id || null,
      ticket.subject,
      ticket.description,
      ticket.priority || 'medium',
      'open'
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت تیکت' });
      }
      res.status(201).json({ id: this.lastID, message: 'تیکت با موفقیت ثبت شد' });
    }
  );
});

// Get contact's files
router.get('/files', authenticateContact, (req: AuthRequest, res: Response) => {
  const accountId = req.contact?.account_id;

  db.all(
    `SELECT pf.*, p.name as project_name
     FROM project_files pf
     LEFT JOIN projects p ON pf.project_id = p.id
     WHERE p.account_id = ?
     ORDER BY pf.created_at DESC`,
    [accountId],
    (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت فایل‌ها' });
      }
      res.json(files);
    }
  );
});

export default router;


