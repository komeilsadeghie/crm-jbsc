import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Contact } from '../types/extended';

const router = express.Router();

// Get all contacts
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, search, sortBy = 'created_at', order = 'DESC' } = req.query;
  
  let query = `
    SELECT c.*, a.name as account_name
    FROM contacts c
    LEFT JOIN accounts a ON c.account_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND c.account_id = ?';
    params.push(account_id);
  }

  if (search) {
    query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += ` ORDER BY c.${sortBy} ${order}`;

  db.all(query, params, (err, contacts) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت مخاطبین' });
    }
    res.json(contacts);
  });
});

// Get single contact
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(
    `SELECT c.*, a.name as account_name
     FROM contacts c
     LEFT JOIN accounts a ON c.account_id = a.id
     WHERE c.id = ?`,
    [id],
    (err, contact) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت مخاطب' });
      }
      if (!contact) {
        return res.status(404).json({ error: 'مخاطب یافت نشد' });
      }
      res.json(contact);
    }
  );
});

// Create contact
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const contact: Contact = req.body;

  db.run(
    `INSERT INTO contacts (
      account_id, first_name, last_name, email, phone, whatsapp,
      role, opt_in, communication_preference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contact.account_id || null,
      contact.first_name,
      contact.last_name || null,
      contact.email || null,
      contact.phone || null,
      contact.whatsapp || null,
      contact.role || null,
      contact.opt_in ? 1 : 0,
      contact.communication_preference || null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت مخاطب' });
      }
      res.status(201).json({ id: this.lastID, message: 'مخاطب با موفقیت ثبت شد' });
    }
  );
});

// Update contact
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const contact: Contact = req.body;

  db.run(
    `UPDATE contacts SET 
      account_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?,
      whatsapp = ?, role = ?, opt_in = ?, communication_preference = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      contact.account_id || null,
      contact.first_name,
      contact.last_name || null,
      contact.email || null,
      contact.phone || null,
      contact.whatsapp || null,
      contact.role || null,
      contact.opt_in ? 1 : 0,
      contact.communication_preference || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی مخاطب' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'مخاطب یافت نشد' });
      }
      res.json({ message: 'مخاطب با موفقیت به‌روزرسانی شد' });
    }
  );
});

export default router;


