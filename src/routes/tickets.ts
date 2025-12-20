import express, { Response } from 'express';
import { db, isMySQL } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all tickets
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, status, priority, department_id, assigned_to } = req.query;
  
  // Use CONCAT for MySQL, || for SQLite
  const contactNameExpr = isMySQL 
    ? "CONCAT(c.first_name, ' ', c.last_name)"
    : "c.first_name || ' ' || c.last_name";
  
  let query = `
    SELECT t.*, 
           a.name as account_name,
           ${contactNameExpr} as contact_name,
           d.name as department_name,
           u.username as assigned_username
    FROM tickets t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN ticket_departments d ON t.department_id = d.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND t.account_id = ?';
    params.push(account_id);
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  if (department_id) {
    query += ' AND t.department_id = ?';
    params.push(department_id);
  }

  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY t.created_at DESC';

  db.all(query, params, (err, tickets) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
    }
    res.json(tickets);
  });
});

// Get ticket departments - MUST BE BEFORE /:id route
router.get('/departments', authenticate, (req: AuthRequest, res: Response) => {
  db.all('SELECT * FROM ticket_departments ORDER BY name', [], (err, departments) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت دپارتمان‌ها' });
    }
    res.json(departments);
  });
});

// Get single ticket with replies
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM tickets WHERE id = ?', [id], (err, ticket) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تیکت' });
    }
    if (!ticket) {
      return res.status(404).json({ error: 'تیکت یافت نشد' });
    }

    // Get replies
    // Use CONCAT for MySQL, || for SQLite
    const contactNameExpr = isMySQL 
      ? "CONCAT(c.first_name, ' ', c.last_name)"
      : "c.first_name || ' ' || c.last_name";
    
    db.all(`
      SELECT tr.*, 
             u.username as user_username, u.full_name as user_full_name, u.role as user_role,
             ${contactNameExpr} as contact_name
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      LEFT JOIN contacts c ON tr.contact_id = c.id
      WHERE tr.ticket_id = ?
      ORDER BY tr.created_at ASC
    `, [id], (err, replies) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت پاسخ‌ها' });
      }

      res.json({
        ...(ticket as any),
        replies
      });
    });
  });
});

// Create ticket
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const ticket = req.body;
  const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  db.run(
    `INSERT INTO tickets (
      ticket_number, account_id, contact_id, department_id,
      subject, priority, status, assigned_to, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticketNumber,
      ticket.account_id || null,
      ticket.contact_id || null,
      ticket.department_id || null,
      ticket.subject,
      ticket.priority || 'medium',
      ticket.status || 'open',
      ticket.assigned_to || null,
      req.user?.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت تیکت' });
      }
      res.status(201).json({ id: this.lastID, ticket_number: ticketNumber, message: 'تیکت با موفقیت ثبت شد' });
    }
  );
});

// Add reply to ticket
router.post('/:id/replies', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { message, is_internal, attachments } = req.body;

  db.run(
    `INSERT INTO ticket_replies (ticket_id, user_id, message, is_internal, attachments)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      req.user?.id,
      message,
      is_internal ? 1 : 0,
      attachments || null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت پاسخ' });
      }

      // Update ticket status if needed
      if (!is_internal) {
        db.run(
          `UPDATE tickets SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [id]
        );
      }

      res.status(201).json({ id: this.lastID, message: 'پاسخ با موفقیت ثبت شد' });
    }
  );
});

// Get canned replies
router.get('/canned-replies/list', authenticate, (req: AuthRequest, res: Response) => {
  const { department_id } = req.query;
  
  let query = 'SELECT * FROM canned_replies WHERE 1=1';
  const params: any[] = [];

  if (department_id) {
    query += ' AND (department_id = ? OR department_id IS NULL)';
    params.push(department_id);
  }

  query += ' ORDER BY title';

  db.all(query, params, (err, replies) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پاسخ‌های آماده' });
    }
    res.json(replies);
  });
});

// Create canned reply
router.post('/canned-replies', authenticate, (req: AuthRequest, res: Response) => {
  const { title, content, department_id } = req.body;

  db.run(
    `INSERT INTO canned_replies (title, content, department_id, created_by)
     VALUES (?, ?, ?, ?)`,
    [title, content, department_id || null, req.user?.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت پاسخ آماده' });
      }
      res.status(201).json({ id: this.lastID, message: 'پاسخ آماده با موفقیت ثبت شد' });
    }
  );
});

// Update canned reply
router.put('/canned-replies/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content, department_id } = req.body;

  db.run(
    `UPDATE canned_replies SET title = ?, content = ?, department_id = ? WHERE id = ?`,
    [title, content, department_id || null, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی پاسخ آماده' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'پاسخ آماده یافت نشد' });
      }
      res.json({ message: 'پاسخ آماده با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete canned reply
router.delete('/canned-replies/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM canned_replies WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف پاسخ آماده' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'پاسخ آماده یافت نشد' });
    }
    res.json({ message: 'پاسخ آماده با موفقیت حذف شد' });
  });
});

// Create ticket department
router.post('/departments', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { name, email, description, is_active } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'نام دپارتمان الزامی است' });
  }

  db.run(
    `INSERT INTO ticket_departments (name, email, description, is_active) VALUES (?, ?, ?, ?)`,
    [name.trim(), email || null, description || null, is_active !== undefined ? (is_active ? 1 : 0) : 1],
    function(err) {
      if (err) {
        console.error('Error inserting department:', err);
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'دپارتمانی با این نام قبلاً ثبت شده است' });
        }
        return res.status(500).json({ error: 'خطا در ثبت دپارتمان: ' + err.message });
      }
      // Return the created department data
      db.get('SELECT * FROM ticket_departments WHERE id = ?', [this.lastID], (err, dept) => {
        if (err) {
          console.error('Error fetching created department:', err);
          return res.status(201).json({ id: this.lastID, message: 'دپارتمان با موفقیت ثبت شد' });
        }
        res.status(201).json({ id: this.lastID, department: dept, message: 'دپارتمان با موفقیت ثبت شد' });
      });
    }
  );
});

// Update ticket department
router.put('/departments/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;
  const { name, email, description, is_active } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'نام دپارتمان الزامی است' });
  }

  db.run(
    `UPDATE ticket_departments 
     SET name = ?, email = ?, description = ?, is_active = ?
     WHERE id = ?`,
    [
      name.trim(),
      email || null,
      description || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      id
    ],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'دپارتمانی با این نام قبلاً ثبت شده است' });
        }
        return res.status(500).json({ error: 'خطا در به‌روزرسانی دپارتمان' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'دپارتمان یافت نشد' });
      }
      res.json({ message: 'دپارتمان با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete ticket department
router.delete('/departments/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;

  // Check if department is used in any tickets
  db.get('SELECT COUNT(*) as count FROM tickets WHERE department_id = ?', [id], (err, result: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی استفاده از دپارتمان' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'این دپارتمان در تیکت‌ها استفاده شده و نمی‌توان آن را حذف کرد' });
    }

    db.run('DELETE FROM ticket_departments WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف دپارتمان' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'دپارتمان یافت نشد' });
      }
      res.json({ message: 'دپارتمان با موفقیت حذف شد' });
    });
  });
});

export default router;

