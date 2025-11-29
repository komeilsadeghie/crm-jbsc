import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all templates
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { template_type, is_active } = req.query;
  
  let query = `
    SELECT st.*, u.username as creator_username
    FROM sms_templates st
    LEFT JOIN users u ON st.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (template_type) {
    query += ' AND st.template_type = ?';
    params.push(template_type);
  }

  if (is_active !== undefined) {
    query += ' AND st.is_active = ?';
    params.push(is_active === 'true' ? 1 : 0);
  }

  query += ' ORDER BY st.created_at DESC';

  db.all(query, params, (err, templates) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت قالب‌ها' });
    }
    res.json(templates);
  });
});

// Create template
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const template = req.body;

  db.run(
    `INSERT INTO sms_templates (
      name, content, template_type, merge_fields, is_active, created_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      template.name,
      template.content,
      template.template_type || 'custom',
      JSON.stringify(template.merge_fields || []),
      template.is_active !== undefined ? (template.is_active ? 1 : 0) : 1,
      req.user?.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت قالب' });
      }
      res.status(201).json({ id: this.lastID, message: 'قالب با موفقیت ثبت شد' });
    }
  );
});

// Send SMS using template
router.post('/:id/send', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { recipient, merge_data } = req.body;

  db.get('SELECT * FROM sms_templates WHERE id = ? AND is_active = 1', [id], (err, template: any) => {
    if (err || !template) {
      return res.status(404).json({ error: 'قالب یافت نشد یا غیرفعال است' });
    }

    // Replace merge fields
    let content = template.content;

    if (merge_data) {
      Object.keys(merge_data).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, merge_data[key]);
      });
    }

    // TODO: Integrate with SMS service (Twilio)
    // For now, just return the processed template
    res.json({
      message: 'پیامک آماده ارسال است',
      content,
      recipient
    });
  });
});

export default router;


