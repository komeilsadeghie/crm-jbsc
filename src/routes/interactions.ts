import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Interaction } from '../types';

const router = express.Router();

// Get all interactions
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { customer_id, type, limit = '100' } = req.query;
  
  let query = 'SELECT * FROM interactions WHERE 1=1';
  const params: any[] = [];

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit as string));

  db.all(query, params, (err, interactions) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تعاملات' });
    }
    res.json(Array.isArray(interactions) ? interactions : []);
  });
});

// Get single interaction
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM interactions WHERE id = ?', [id], (err, interaction) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تعامل' });
    }
    if (!interaction) {
      return res.status(404).json({ error: 'تعامل یافت نشد' });
    }
    res.json(interaction);
  });
});

// Create interaction
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const interaction: Interaction = req.body;
  const userId = req.user?.id;

  db.run(
    `INSERT INTO interactions (
      customer_id, type, subject, description, amount, deposit_date, deposit_stage,
      website_model, website_designer, services, additional_notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      interaction.customer_id,
      interaction.type,
      interaction.subject || null,
      interaction.description || null,
      interaction.amount || null,
      interaction.deposit_date || null,
      interaction.deposit_stage || null,
      interaction.website_model || null,
      interaction.website_designer || null,
      interaction.services || null,
      interaction.additional_notes || null,
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت تعامل' });
      }
      res.status(201).json({ id: this.lastID, message: 'تعامل با موفقیت ثبت شد' });
    }
  );
});

// Update interaction
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const interaction: Interaction = req.body;

  db.run(
    `UPDATE interactions SET 
      type = ?, subject = ?, description = ?, amount = ?, deposit_date = ?,
      deposit_stage = ?, website_model = ?, website_designer = ?, services = ?,
      additional_notes = ?
     WHERE id = ?`,
    [
      interaction.type,
      interaction.subject || null,
      interaction.description || null,
      interaction.amount || null,
      interaction.deposit_date || null,
      interaction.deposit_stage || null,
      interaction.website_model || null,
      interaction.website_designer || null,
      interaction.services || null,
      interaction.additional_notes || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی تعامل' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'تعامل یافت نشد' });
      }
      res.json({ message: 'تعامل با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete interaction
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM interactions WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف تعامل' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'تعامل یافت نشد' });
    }
    res.json({ message: 'تعامل با موفقیت حذف شد' });
  });
});

export default router;



