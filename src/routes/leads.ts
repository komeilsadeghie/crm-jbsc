import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Lead } from '../types/extended';

const router = express.Router();

// Get all leads
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { status, source, assigned_to, search, kanban_stage, sortBy = 'created_at', order = 'DESC' } = req.query;
  
  let query = `
    SELECT l.*, 
           u.full_name as assigned_to_name
    FROM leads l
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += ' AND l.status = ?';
    params.push(status);
  }

  if (kanban_stage) {
    query += ' AND l.kanban_stage = ?';
    params.push(kanban_stage);
  }

  if (source) {
    query += ' AND l.source = ?';
    params.push(source);
  }

  if (assigned_to) {
    query += ' AND l.assigned_to = ?';
    params.push(assigned_to);
  }

  if (search) {
    query += ' AND (l.first_name LIKE ? OR l.last_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.company_name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += ` ORDER BY l.${sortBy} ${order}`;

  db.all(query, params, (err, leads) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت سرنخ‌ها' });
    }
    // Ensure we always return an array
    res.json(Array.isArray(leads) ? leads : []);
  });
});

// Get Kanban board
router.get('/kanban/board', authenticate, (req: AuthRequest, res: Response) => {
  db.all(`
    SELECT l.*, u.full_name as assigned_to_name
    FROM leads l
    LEFT JOIN users u ON l.assigned_to = u.id
    ORDER BY l.position ASC, l.created_at DESC
  `, [], (err, leads: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت سرنخ‌ها' });
    }

    // Get custom stages
    db.all('SELECT * FROM lead_stages ORDER BY position', [], (err, stages: any[]) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت مراحل' });
      }

      // Default stages if none exist
      const defaultStages = [
        { name: 'new', label: 'جدید', color: '#3B82F6' },
        { name: 'contacted', label: 'تماس گرفته شده', color: '#8B5CF6' },
        { name: 'qualified', label: 'واجد شرایط', color: '#10B981' },
        { name: 'converted', label: 'تبدیل شده', color: '#059669' }
      ];

      const stageList = stages.length > 0 ? stages : defaultStages.map(s => ({ ...s, id: s.name }));

      // Group by kanban_stage
      const board: Record<string, any> = {};
      
      stageList.forEach((stage: any) => {
        board[stage.name] = {
          stage: stage,
          leads: []
        };
      });

      leads.forEach(lead => {
        const stage = lead.kanban_stage || 'new';
        if (board[stage]) {
          board[stage].leads.push(lead);
        } else {
          if (!board['new']) {
            board['new'] = { stage: defaultStages[0], leads: [] };
          }
          board['new'].leads.push(lead);
        }
      });

      res.json(board);
    });
  });
});

// Update lead position (for Kanban drag & drop)
router.put('/:id/position', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { position, kanban_stage } = req.body;

  db.run(
    `UPDATE leads SET position = ?, kanban_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [position || 0, kanban_stage || 'new', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی موقعیت' });
      }
      res.json({ message: 'موقعیت به‌روزرسانی شد' });
    }
  );
});

// Get single lead
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM leads WHERE id = ?', [id], (err, lead) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت سرنخ' });
    }
    if (!lead) {
      return res.status(404).json({ error: 'سرنخ یافت نشد' });
    }
    res.json(lead);
  });
});

// Create lead
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const lead: any = req.body;
  const userId = req.user?.id;

  // بررسی معتبر بودن userId
  if (!userId) {
    return res.status(401).json({ error: 'کاربر احراز هویت نشده است' });
  }

  db.run(
    `INSERT INTO leads (
      first_name, last_name, email, phone, whatsapp, company_name, source, tags,
      lead_score, status, kanban_stage, position, industry, budget_range, decision_maker_role, notes,
      assigned_to, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lead.first_name,
      lead.last_name || null,
      lead.email || null,
      lead.phone || null,
      lead.whatsapp || null,
      lead.company_name || null,
      lead.source || null,
      lead.tags || null,
      lead.lead_score || 0,
      lead.status || 'new',
      lead.kanban_stage || 'new',
      lead.position || 0,
      lead.industry || null,
      lead.budget_range || null,
      lead.decision_maker_role || null,
      lead.notes || null,
      (lead.assigned_to && Number.isInteger(Number(lead.assigned_to))) ? Number(lead.assigned_to) : null,
      userId
    ],
    function(err) {
      if (err) {
        console.error('Error creating lead:', err);
        return res.status(500).json({ error: 'خطا در ثبت سرنخ: ' + err.message });
      }
      res.status(201).json({ id: this.lastID, message: 'سرنخ با موفقیت ثبت شد' });
    }
  );
});

// Web-to-Lead form submission (public endpoint, no auth required)
router.post('/web-form/:formKey', (req: AuthRequest, res: Response) => {
  const { formKey } = req.params;
  const formData = req.body;

  // Get form configuration
  db.get('SELECT * FROM web_to_lead_forms WHERE form_key = ? AND status = ?', [formKey, 'active'], (err, form: any) => {
    if (err || !form) {
      return res.status(404).json({ error: 'فرم یافت نشد یا غیرفعال است' });
    }

    // Create lead from form data
    db.run(
      `INSERT INTO leads (
        first_name, last_name, email, phone, whatsapp, company_name, source, tags,
        lead_score, status, kanban_stage, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formData.first_name || formData.name || 'Unknown',
        formData.last_name || null,
        formData.email || null,
        formData.phone || null,
        formData.whatsapp || null,
        formData.company_name || formData.company || null,
        formData.source || form.name,
        formData.tags || null,
        0,
        'new',
        'new',
        form.assigned_to || null,
        null // Public form, no user
      ],
      function(createErr) {
        if (createErr) {
          console.error('Error creating lead from web form:', createErr);
          return res.status(500).json({ error: 'خطا در ثبت سرنخ' });
        }

        // Return success message or redirect
        if (form.redirect_url) {
          res.json({ 
            success: true, 
            message: form.success_message || 'با تشکر! اطلاعات شما ثبت شد.',
            redirect_url: form.redirect_url
          });
        } else {
          res.json({ 
            success: true, 
            message: form.success_message || 'با تشکر! اطلاعات شما ثبت شد.'
          });
        }
      }
    );
  });
});

// Get web-to-lead forms
router.get('/web-forms/list', authenticate, (req: AuthRequest, res: Response) => {
  db.all('SELECT id, name, form_key, status, created_at FROM web_to_lead_forms ORDER BY created_at DESC', [], (err, forms) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فرم‌ها' });
    }
    res.json(forms);
  });
});

// Create web-to-lead form
router.post('/web-forms', authenticate, (req: AuthRequest, res: Response) => {
  const form = req.body;
  const formKey = form.form_key || `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  db.run(
    `INSERT INTO web_to_lead_forms (
      name, form_key, fields, success_message, redirect_url, assigned_to, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      form.name,
      formKey,
      JSON.stringify(form.fields || []),
      form.success_message || 'با تشکر! اطلاعات شما ثبت شد.',
      form.redirect_url || null,
      form.assigned_to || null,
      form.status || 'active',
      req.user?.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت فرم' });
      }
      res.status(201).json({ id: this.lastID, form_key: formKey, message: 'فرم با موفقیت ثبت شد' });
    }
  );
});

// Update lead
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const lead: any = req.body;

  db.run(
    `UPDATE leads SET 
      first_name = ?, last_name = ?, email = ?, phone = ?, whatsapp = ?,
      company_name = ?, source = ?, tags = ?, lead_score = ?, status = ?,
      kanban_stage = ?, position = ?,
      industry = ?, budget_range = ?, decision_maker_role = ?, notes = ?,
      assigned_to = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      lead.first_name,
      lead.last_name || null,
      lead.email || null,
      lead.phone || null,
      lead.whatsapp || null,
      lead.company_name || null,
      lead.source || null,
      lead.tags || null,
      lead.lead_score || 0,
      lead.status || 'new',
      lead.kanban_stage || 'new',
      lead.position || 0,
      lead.industry || null,
      lead.budget_range || null,
      lead.decision_maker_role || null,
      lead.notes || null,
      (lead.assigned_to && Number.isInteger(Number(lead.assigned_to))) ? Number(lead.assigned_to) : null,
      id
    ],
    function(err) {
      if (err) {
        console.error('Error updating lead:', err);
        return res.status(500).json({ error: 'خطا در به‌روزرسانی سرنخ: ' + err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'سرنخ یافت نشد' });
      }
      res.json({ message: 'سرنخ با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Convert lead to account
router.post('/:id/convert', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { account_name, contact_name } = req.body;

  db.get('SELECT * FROM leads WHERE id = ?', [id], (err, lead: any) => {
    if (err || !lead) {
      return res.status(404).json({ error: 'سرنخ یافت نشد' });
    }

    // Create account
    db.run(
      `INSERT INTO accounts (name, industry, website, lead_id, acquisition_channel)
       VALUES (?, ?, ?, ?, ?)`,
      [account_name || lead.company_name || `${lead.first_name} ${lead.last_name}`, lead.industry, null, id, lead.source],
      function(accountErr) {
        if (accountErr) {
          return res.status(500).json({ error: 'خطا در ایجاد حساب' });
        }

        const accountId = this.lastID;

        // Create contact
        db.run(
          `INSERT INTO contacts (account_id, first_name, last_name, email, phone, whatsapp, role)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [accountId, lead.first_name, lead.last_name, lead.email, lead.phone, lead.whatsapp, lead.decision_maker_role],
          function(contactErr) {
            if (contactErr) {
              return res.status(500).json({ error: 'خطا در ایجاد مخاطب' });
            }

            // Update lead status
            db.run('UPDATE leads SET status = ? WHERE id = ?', ['converted', id], () => {
              res.json({ 
                message: 'سرنخ با موفقیت تبدیل شد',
                account_id: accountId,
                contact_id: this.lastID
              });
            });
          }
        );
      }
    );
  });
});

// Delete lead
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM leads WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف سرنخ' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'سرنخ یافت نشد' });
    }
    res.json({ message: 'سرنخ با موفقیت حذف شد' });
  });
});

// Bulk delete leads
router.post('/bulk-delete', authenticate, (req: AuthRequest, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM leads WHERE id IN (${placeholders})`;

  db.run(query, ids, function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف گروهی سرنخ‌ها' });
    }
    res.json({ 
      message: `${this.changes} سرنخ با موفقیت حذف شد`,
      deletedCount: this.changes 
    });
  });
});

// Update lead score
router.patch('/:id/score', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { points, event_type, description } = req.body;

  // Record scoring event
  db.run(
    'INSERT INTO lead_scoring_events (lead_id, event_type, points, description) VALUES (?, ?, ?, ?)',
    [id, event_type, points, description],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت رویداد امتیازدهی' });
      }

      // Update lead score
      db.get('SELECT lead_score FROM leads WHERE id = ?', [id], (err, lead: any) => {
        if (err || !lead) {
          return res.status(404).json({ error: 'سرنخ یافت نشد' });
        }

        const newScore = Math.min(100, Math.max(0, (lead.lead_score || 0) + points));
        db.run(
          'UPDATE leads SET lead_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newScore, id],
          function() {
            res.json({ 
              message: 'امتیاز به‌روزرسانی شد',
              new_score: newScore
            });
          }
        );
      });
    }
  );
});

export default router;


