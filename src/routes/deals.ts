import express, { Response } from 'express';
import { db, isMySQL } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Deal } from '../types/extended';

const router = express.Router();

// Get all deals
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { stage, account_id, designer_id, search, sortBy = 'created_at', order = 'DESC' } = req.query;
  
  // Use CONCAT for MySQL, || for SQLite
  const contactNameExpr = isMySQL 
    ? "CONCAT(c.first_name, ' ', c.last_name)"
    : "c.first_name || ' ' || c.last_name";
  
  let query = `
    SELECT d.*, 
           a.name as account_name,
           ${contactNameExpr} as contact_name,
           u.full_name as designer_name
    FROM deals d
    LEFT JOIN accounts a ON d.account_id = a.id
    LEFT JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN users u ON d.designer_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (stage) {
    query += ' AND d.stage = ?';
    params.push(stage);
  }

  if (account_id) {
    query += ' AND d.account_id = ?';
    params.push(account_id);
  }

  if (designer_id) {
    query += ' AND d.designer_id = ?';
    params.push(designer_id);
  }

  if (search) {
    query += ' AND (d.title LIKE ? OR a.name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ` ORDER BY d.${sortBy} ${order}`;

  db.all(query, params, (err, deals) => {
    if (err) {
      console.error('Error fetching deals:', err);
      // If table doesn't exist, return empty array instead of error
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
        console.warn('Deals table or related tables do not exist yet, returning empty array');
        return res.json([]);
      }
      return res.status(500).json({ error: 'خطا در دریافت پروژه‌ها' });
    }
    // Ensure we always return an array
    res.json(Array.isArray(deals) ? deals : []);
  });
});

// Get single deal
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Use CONCAT for MySQL, || for SQLite
  const contactNameExpr = isMySQL 
    ? "CONCAT(c.first_name, ' ', c.last_name)"
    : "c.first_name || ' ' || c.last_name";

  db.get(
    `SELECT d.*, 
            a.name as account_name,
            ${contactNameExpr} as contact_name,
            u.full_name as designer_name
     FROM deals d
     LEFT JOIN accounts a ON d.account_id = a.id
     LEFT JOIN contacts c ON d.contact_id = c.id
     LEFT JOIN users u ON d.designer_id = u.id
     WHERE d.id = ?`,
    [id],
    (err, deal) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت پروژه' });
      }
      if (!deal) {
        return res.status(404).json({ error: 'پروژه یافت نشد' });
      }
      res.json(deal);
    }
  );
});

// Create deal
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const deal: Deal = req.body;
  const userId = req.user?.id;

  // Validate account_id if provided
  if (deal.account_id) {
    db.get('SELECT id FROM accounts WHERE id = ?', [deal.account_id], (err, account) => {
      if (err) {
        console.error('Error checking account:', err);
        // If table doesn't exist, allow null account_id
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          console.warn('Accounts table does not exist, creating deal without account_id');
          deal.account_id = null;
        } else {
          return res.status(500).json({ error: 'خطا در بررسی حساب' });
        }
      }
      if (!account && deal.account_id) {
        return res.status(404).json({ error: 'حساب انتخاب شده یافت نشد' });
      }
      
      // Continue with insert
      insertDeal();
    });
  } else {
    insertDeal();
  }
  
  function insertDeal() {
    db.run(
      `INSERT INTO deals (
        account_id, contact_id, title, stage, budget, probability, services,
        site_model, designer_id, start_date, expected_delivery_date, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deal.account_id || null,
        deal.contact_id || null,
        deal.title,
        deal.stage || 'discovery',
        deal.budget || null,
        deal.probability || 0,
        deal.services || null,
        deal.site_model || null,
        deal.designer_id || null,
        deal.start_date || null,
        deal.expected_delivery_date || null,
        deal.notes || null,
        userId
      ],
      function(err) {
        if (err) {
          console.error('Error creating deal:', err);
          return res.status(500).json({ error: 'خطا در ثبت معامله: ' + (err.message || 'خطای نامشخص') });
        }
        res.status(201).json({ id: this.lastID, message: 'معامله با موفقیت ثبت شد' });
      }
    );
  }
});

// Update deal
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const deal: Deal = req.body;

  db.run(
    `UPDATE deals SET 
      account_id = ?, contact_id = ?, title = ?, stage = ?, budget = ?,
      probability = ?, services = ?, site_model = ?, designer_id = ?,
      start_date = ?, expected_delivery_date = ?, actual_delivery_date = ?,
      notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      deal.account_id || null,
      deal.contact_id || null,
      deal.title,
      deal.stage || 'discovery',
      deal.budget || null,
      deal.probability || 0,
      deal.services || null,
      deal.site_model || null,
      deal.designer_id || null,
      deal.start_date || null,
      deal.expected_delivery_date || null,
      deal.actual_delivery_date || null,
      deal.notes || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی پروژه' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'پروژه یافت نشد' });
      }
      res.json({ message: 'پروژه با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete deal
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM deals WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف پروژه' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'پروژه یافت نشد' });
    }
    res.json({ message: 'پروژه با موفقیت حذف شد' });
  });
});

// Bulk delete deals
router.post('/bulk-delete', authenticate, (req: AuthRequest, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM deals WHERE id IN (${placeholders})`;

  db.run(query, ids, function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف گروهی معاملات' });
    }
    res.json({ 
      message: `${this.changes} معامله با موفقیت حذف شد`,
      deletedCount: this.changes 
    });
  });
});

// Get deal pipeline (funnel)
router.get('/analytics/pipeline', authenticate, (req: AuthRequest, res: Response) => {
  db.all(
    `SELECT 
      stage,
      COUNT(*) as count,
      SUM(budget) as total_value,
      SUM(budget * probability / 100.0) as weighted_value
     FROM deals
     WHERE stage NOT IN ('support')
     GROUP BY stage
     ORDER BY 
       CASE stage
         WHEN 'discovery' THEN 1
         WHEN 'proposal' THEN 2
         WHEN 'contract' THEN 3
         WHEN 'design' THEN 4
         WHEN 'development' THEN 5
         WHEN 'qa' THEN 6
         WHEN 'delivery' THEN 7
         ELSE 8
       END`,
    [],
    (err, pipeline) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت قیف فروش' });
      }
      // Ensure we always return an array
      res.json(Array.isArray(pipeline) ? pipeline : []);
    }
  );
});

export default router;


