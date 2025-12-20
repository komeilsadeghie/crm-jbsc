import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all templates
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { template_type, is_active } = req.query;
  
  let query = `
    SELECT et.*, u.username as creator_username
    FROM email_templates et
    LEFT JOIN users u ON et.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (template_type) {
    query += ' AND et.template_type = ?';
    params.push(template_type);
  }

  if (is_active !== undefined) {
    query += ' AND et.is_active = ?';
    params.push(is_active === 'true' ? 1 : 0);
  }

  query += ' ORDER BY et.created_at DESC';

  db.all(query, params, (err, templates) => {
    if (err) {
      console.error('Error fetching email templates:', err);
      // If table doesn't exist, return empty array instead of error
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
        console.warn('email_templates table does not exist yet, returning empty array');
        return res.json([]);
      }
      return res.status(500).json({ error: 'خطا در دریافت قالب‌ها' });
    }
    res.json(Array.isArray(templates) ? templates : []);
  });
});

// Get single template
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM email_templates WHERE id = ?', [id], (err, template) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت قالب' });
    }
    if (!template) {
      return res.status(404).json({ error: 'قالب یافت نشد' });
    }
    res.json(template);
  });
});

// Create template
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const template = req.body;

  db.run(
    `INSERT INTO email_templates (
      name, subject, body, template_type, merge_fields, is_active, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      template.name,
      template.subject,
      template.body,
      template.template_type || 'custom',
      JSON.stringify(template.merge_fields || []),
      template.is_active !== undefined ? (template.is_active ? 1 : 0) : 1,
      req.user?.id
    ],
    function(err) {
      if (err) {
        console.error('Error creating email template:', err);
        // If table doesn't exist, return helpful error
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          return res.status(500).json({ error: 'جدول قالب‌های ایمیل وجود ندارد. لطفاً دیتابیس را migrate کنید.' });
        }
        return res.status(500).json({ error: 'خطا در ثبت قالب: ' + (err.message || 'خطای نامشخص') });
      }
      res.status(201).json({ id: this.lastID, message: 'قالب با موفقیت ثبت شد' });
    }
  );
});

// Update template
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const template = req.body;

  db.run(
    `UPDATE email_templates SET 
      name = ?, subject = ?, body = ?, template_type = ?,
      merge_fields = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      template.name,
      template.subject,
      template.body,
      template.template_type || 'custom',
      JSON.stringify(template.merge_fields || []),
      template.is_active !== undefined ? (template.is_active ? 1 : 0) : 1,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی قالب' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'قالب یافت نشد' });
      }
      res.json({ message: 'قالب با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Send email using template
router.post('/:id/send', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { recipient, merge_data } = req.body;

  db.get('SELECT * FROM email_templates WHERE id = ? AND is_active = 1', [id], (err, template: any) => {
    if (err || !template) {
      return res.status(404).json({ error: 'قالب یافت نشد یا غیرفعال است' });
    }

    // Replace merge fields
    let subject = template.subject;
    let body = template.body;

    if (merge_data) {
      Object.keys(merge_data).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, merge_data[key]);
        body = body.replace(regex, merge_data[key]);
      });
    }

    // TODO: Integrate with email service (nodemailer)
    // For now, just return the processed template
    res.json({
      message: 'ایمیل آماده ارسال است',
      subject,
      body,
      recipient
    });
  });
});

export default router;


