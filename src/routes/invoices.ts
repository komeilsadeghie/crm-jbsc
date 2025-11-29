import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Invoice, Payment } from '../types/extended';
import { logActivity, getClientInfo } from '../utils/activityLogger';

const router = express.Router();

// Get all invoices
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, deal_id, status, sortBy = 'created_at', order = 'DESC' } = req.query;
  
  let query = `
    SELECT i.*, 
           a.name as account_name,
           d.title as deal_title
    FROM invoices i
    LEFT JOIN accounts a ON i.account_id = a.id
    LEFT JOIN deals d ON i.deal_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND i.account_id = ?';
    params.push(account_id);
  }

  if (deal_id) {
    query += ' AND i.deal_id = ?';
    params.push(deal_id);
  }

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  query += ` ORDER BY i.${sortBy} ${order}`;

  db.all(query, params, (err, invoices) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فاکتورها' });
    }
    res.json(invoices);
  });
});

// Get single invoice with payments and items
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, invoice: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فاکتور' });
    }
    if (!invoice) {
      return res.status(404).json({ error: 'فاکتور یافت نشد' });
    }

    // Get payments and items in parallel
    db.all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC', [id], (err, payments) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت پرداخت‌ها' });
      }

      db.all('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY position', [id], (err, items) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در دریافت آیتم‌ها' });
        }

        res.json({
          ...invoice,
          payments: payments || [],
          items: items || []
        });
      });
    });
  });
});

// Create invoice
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const invoice: any = req.body;
  const userId = req.user?.id;

  // Generate invoice number if not provided
  const invoiceNumber = invoice.invoice_number || `INV-${Date.now()}`;

  // Calculate total from items if provided
  let totalAmount = invoice.amount || 0;
  if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
    totalAmount = invoice.items.reduce((sum: number, item: any) => {
      const quantity = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.unit_price || 0);
      const taxRate = parseFloat(item.tax_rate || 0);
      const subtotal = quantity * unitPrice;
      const taxAmount = subtotal * (taxRate / 100);
      return sum + subtotal + taxAmount;
    }, 0);
  }

  db.run(
    `INSERT INTO invoices (
      deal_id, account_id, invoice_number, amount, currency, status,
      due_date, payment_stage, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice.deal_id || null,
      invoice.account_id || null,
      invoiceNumber,
      totalAmount,
      invoice.currency || 'IRR',
      invoice.status || 'draft',
      invoice.due_date || null,
      invoice.payment_stage || null,
      invoice.notes || null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت فاکتور' });
      }

      const invoiceId = this.lastID;

      // Insert items if provided
      if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO invoice_items (
            invoice_id, item_name, description, quantity, unit_price,
            tax_rate, tax_amount, total_amount, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        invoice.items.forEach((item: any, index: number) => {
          const quantity = parseFloat(item.quantity || 1);
          const unitPrice = parseFloat(item.unit_price || 0);
          const taxRate = parseFloat(item.tax_rate || 0);
          const subtotal = quantity * unitPrice;
          const taxAmount = subtotal * (taxRate / 100);
          const total = subtotal + taxAmount;

          itemStmt.run([
            invoiceId,
            item.item_name,
            item.description || null,
            quantity,
            unitPrice,
            taxRate,
            taxAmount,
            total,
            item.position || index
          ]);
        });

        itemStmt.finalize((err) => {
          if (err) {
            console.error('Error inserting invoice items:', err);
          }

          // Log activity
          const clientInfo = getClientInfo(req);
          logActivity({
            userId: parseInt(String(userId!)),
            action: 'create',
            entityType: 'invoice',
            entityId: invoiceId,
            description: `Created invoice ${invoiceNumber}`,
            ...clientInfo
          });

          res.status(201).json({ id: invoiceId, invoice_number: invoiceNumber, message: 'فاکتور با موفقیت ثبت شد' });
        });
      } else {
        // Log activity
        const clientInfo = getClientInfo(req);
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'create',
          entityType: 'invoice',
          entityId: invoiceId,
          description: `Created invoice ${invoiceNumber}`,
          ...clientInfo
        });

        res.status(201).json({ id: invoiceId, invoice_number: invoiceNumber, message: 'فاکتور با موفقیت ثبت شد' });
      }
    }
  );
});

// Update invoice
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const invoice: Invoice = req.body;

  db.run(
    `UPDATE invoices SET 
      deal_id = ?, account_id = ?, amount = ?, currency = ?, status = ?,
      due_date = ?, payment_stage = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      invoice.deal_id || null,
      invoice.account_id || null,
      invoice.amount,
      invoice.currency || 'IRR',
      invoice.status || 'draft',
      invoice.due_date || null,
      invoice.payment_stage || null,
      invoice.notes || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی فاکتور' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'فاکتور یافت نشد' });
      }
      res.json({ message: 'فاکتور با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Add payment to invoice
router.post('/:id/payments', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const payment: Payment = req.body;

  db.run(
    `INSERT INTO payments (invoice_id, deal_id, amount, currency, payment_method, paid_at, reference_number, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      payment.deal_id || null,
      payment.amount,
      payment.currency || 'IRR',
      payment.payment_method || null,
      payment.paid_at || new Date().toISOString(),
      payment.reference_number || null,
      payment.notes || null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت پرداخت' });
      }

      // Update invoice paid amount and status
      db.get('SELECT amount, paid_amount FROM invoices WHERE id = ?', [id], (err, invoice: any) => {
        if (err || !invoice) {
          return res.status(500).json({ error: 'خطا در به‌روزرسانی فاکتور' });
        }

        const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
        let newStatus = invoice.status;

        if (newPaidAmount >= invoice.amount) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        // Check if overdue
        if (newStatus !== 'paid') {
          db.get('SELECT due_date FROM invoices WHERE id = ?', [id], (err, inv: any) => {
            if (inv && inv.due_date && new Date(inv.due_date) < new Date()) {
              newStatus = 'overdue';
            }

            db.run(
              'UPDATE invoices SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [newPaidAmount, newStatus, id],
              () => {
                res.status(201).json({ id: this.lastID, message: 'پرداخت با موفقیت ثبت شد' });
              }
            );
          });
        } else {
          db.run(
            'UPDATE invoices SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPaidAmount, newStatus, id],
            () => {
              res.status(201).json({ id: this.lastID, message: 'پرداخت با موفقیت ثبت شد' });
            }
          );
        }
      });
    }
  );
});

// Invoice Items CRUD
router.get('/:id/items', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  db.all('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY position', [id], (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت آیتم‌ها' });
    }
    res.json(items);
  });
});

router.post('/:id/items', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const item: any = req.body;

  const quantity = parseFloat(item.quantity || 1);
  const unitPrice = parseFloat(item.unit_price || 0);
  const taxRate = parseFloat(item.tax_rate || 0);
  const subtotal = quantity * unitPrice;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  db.run(
    `INSERT INTO invoice_items (
      invoice_id, item_name, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      item.item_name,
      item.description || null,
      quantity,
      unitPrice,
      taxRate,
      taxAmount,
      total,
      item.position || 0
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت آیتم' });
      }

      // Update invoice total
      db.all('SELECT SUM(total_amount) as total FROM invoice_items WHERE invoice_id = ?', [id], (err, result: any[]) => {
        if (!err && result && result[0]) {
          const newTotal = result[0].total || 0;
          db.run('UPDATE invoices SET amount = ? WHERE id = ?', [newTotal, id]);
        }
      });

      res.status(201).json({ id: this.lastID, message: 'آیتم با موفقیت اضافه شد' });
    }
  );
});

router.put('/:id/items/:itemId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, itemId } = req.params;
  const item: any = req.body;

  const quantity = parseFloat(item.quantity || 1);
  const unitPrice = parseFloat(item.unit_price || 0);
  const taxRate = parseFloat(item.tax_rate || 0);
  const subtotal = quantity * unitPrice;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  db.run(
    `UPDATE invoice_items SET 
      item_name = ?, description = ?, quantity = ?, unit_price = ?,
      tax_rate = ?, tax_amount = ?, total_amount = ?, position = ?
     WHERE id = ? AND invoice_id = ?`,
    [
      item.item_name,
      item.description || null,
      quantity,
      unitPrice,
      taxRate,
      taxAmount,
      total,
      item.position || 0,
      itemId,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی آیتم' });
      }

      // Update invoice total
      db.all('SELECT SUM(total_amount) as total FROM invoice_items WHERE invoice_id = ?', [id], (err, result: any[]) => {
        if (!err && result && result[0]) {
          const newTotal = result[0].total || 0;
          db.run('UPDATE invoices SET amount = ? WHERE id = ?', [newTotal, id]);
        }
      });

      res.json({ message: 'آیتم با موفقیت به‌روزرسانی شد' });
    }
  );
});

router.delete('/:id/items/:itemId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, itemId } = req.params;

  db.run('DELETE FROM invoice_items WHERE id = ? AND invoice_id = ?', [itemId, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف آیتم' });
    }

    // Update invoice total
    db.all('SELECT SUM(total_amount) as total FROM invoice_items WHERE invoice_id = ?', [id], (err, result: any[]) => {
      if (!err && result && result[0]) {
        const newTotal = result[0].total || 0;
        db.run('UPDATE invoices SET amount = ? WHERE id = ?', [newTotal, id]);
      }
    });

    res.json({ message: 'آیتم با موفقیت حذف شد' });
  });
});

// Get payment analytics
router.get('/analytics/revenue', authenticate, (req: AuthRequest, res: Response) => {
  const { period = 'month' } = req.query;

  let dateFormat = '%Y-%m';
  if (period === 'day') dateFormat = '%Y-%m-%d';
  else if (period === 'week') dateFormat = '%Y-%W';
  else if (period === 'year') dateFormat = '%Y';

  db.all(
    `SELECT 
      strftime('${dateFormat}', paid_at) as period,
      SUM(amount) as total_revenue,
      COUNT(*) as payment_count
     FROM payments
     WHERE paid_at IS NOT NULL
     GROUP BY period
     ORDER BY period DESC
     LIMIT 12`,
    [],
    (err, revenue) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت آمار درآمد' });
      }
      res.json(revenue);
    }
  );
});

// Delete invoice
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Delete invoice items first
  db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting invoice items:', err);
    }
  });

  // Delete payments
  db.run('DELETE FROM payments WHERE invoice_id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting payments:', err);
    }
  });

  // Delete invoice
  db.run('DELETE FROM invoices WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف فاکتور' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'فاکتور یافت نشد' });
    }
    res.json({ message: 'فاکتور با موفقیت حذف شد' });
  });
});

// Bulk delete invoices
router.post('/bulk-delete', authenticate, (req: AuthRequest, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
  }

  const placeholders = ids.map(() => '?').join(',');

  // Delete related data first
  db.run(`DELETE FROM invoice_items WHERE invoice_id IN (${placeholders})`, ids, (err) => {
    if (err) console.error('Error deleting invoice items:', err);
  });
  
  db.run(`DELETE FROM payments WHERE invoice_id IN (${placeholders})`, ids, (err) => {
    if (err) console.error('Error deleting payments:', err);
  });

  // Delete invoices
  db.run(`DELETE FROM invoices WHERE id IN (${placeholders})`, ids, function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف گروهی فاکتورها' });
    }
    res.json({ 
      message: `${this.changes} فاکتور با موفقیت حذف شد`,
      deletedCount: this.changes 
    });
  });
});

export default router;


