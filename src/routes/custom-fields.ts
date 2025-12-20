import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get custom fields for entity type
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { entity_type } = req.query;
  
  let query = 'SELECT * FROM custom_fields WHERE 1=1';
  const params: any[] = [];

  if (entity_type) {
    query += ' AND entity_type = ?';
    params.push(entity_type);
  }

  query += ' ORDER BY position, created_at';

  db.all(query, params, (err, fields) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فیلدهای سفارشی' });
    }
    res.json(fields);
  });
});

// Create custom field
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const field = req.body;

  db.run(
    `INSERT INTO custom_fields (
      entity_type, field_name, field_type, field_options, is_required, position
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      field.entity_type,
      field.field_name,
      field.field_type,
      JSON.stringify(field.field_options || []),
      field.is_required ? 1 : 0,
      field.position || 0
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت فیلد سفارشی' });
      }
      res.status(201).json({ id: this.lastID, message: 'فیلد سفارشی با موفقیت ثبت شد' });
    }
  );
});

// Get custom field values for entity
router.get('/values/:entity_type/:entity_id', authenticate, (req: AuthRequest, res: Response) => {
  const { entity_type, entity_id } = req.params;

  db.all(`
    SELECT cfv.*, cf.field_name, cf.field_type
    FROM custom_field_values cfv
    JOIN custom_fields cf ON cfv.field_id = cf.id
    WHERE cfv.entity_type = ? AND cfv.entity_id = ?
  `, [entity_type, entity_id], (err, values) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت مقادیر' });
    }
    res.json(values);
  });
});

// Set custom field value
router.post('/values', authenticate, (req: AuthRequest, res: Response) => {
  const { field_id, entity_type, entity_id, field_value } = req.body;

  db.run(
    `INSERT INTO custom_field_values (field_id, entity_type, entity_id, field_value)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE field_value = ?`,
    [field_id, entity_type, entity_id, field_value, field_value],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت مقدار' });
      }
      res.json({ message: 'مقدار با موفقیت ثبت شد' });
    }
  );
});

export default router;


