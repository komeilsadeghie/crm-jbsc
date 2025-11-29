import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';

const router = express.Router();

// Get all recurring invoices
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, is_active } = req.query;

  let query = `
    SELECT ri.*, 
           a.name as account_name,
           i.invoice_number as template_invoice_number
    FROM recurring_invoices ri
    LEFT JOIN accounts a ON ri.account_id = a.id
    LEFT JOIN invoices i ON ri.template_invoice_id = i.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND ri.account_id = ?';
    params.push(account_id);
  }

  if (is_active !== undefined) {
    query += ' AND ri.is_active = ?';
    params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
  }

  query += ' ORDER BY ri.next_invoice_date ASC';

  db.all(query, params, (err, recurringInvoices) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فاکتورهای تکراری' });
    }
    res.json(recurringInvoices);
  });
});

// Get single recurring invoice
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT ri.*, 
           a.name as account_name,
           i.invoice_number as template_invoice_number
    FROM recurring_invoices ri
    LEFT JOIN accounts a ON ri.account_id = a.id
    LEFT JOIN invoices i ON ri.template_invoice_id = i.id
    WHERE ri.id = ?
  `, [id], (err, recurringInvoice) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فاکتور تکراری' });
    }
    if (!recurringInvoice) {
      return res.status(404).json({ error: 'فاکتور تکراری یافت نشد' });
    }
    res.json(recurringInvoice);
  });
});

// Create recurring invoice
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const recurringInvoice: any = req.body;
  const userId = req.user?.id;

  const {
    account_id,
    template_invoice_id,
    frequency,
    interval = 1,
    start_date,
    end_date,
    total_cycles,
    is_active = 1
  } = recurringInvoice;

  if (!account_id || !frequency || !start_date) {
    return res.status(400).json({ error: 'فیلدهای الزامی: account_id, frequency, start_date' });
  }

  // Calculate next invoice date
  const startDate = new Date(start_date);
  let nextDate = new Date(startDate);

  db.run(
    `INSERT INTO recurring_invoices (
      account_id, template_invoice_id, frequency, interval, start_date, end_date,
      next_invoice_date, total_cycles, is_active, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account_id,
      template_invoice_id || null,
      frequency,
      interval,
      start_date,
      end_date || null,
      start_date, // next_invoice_date starts as start_date
      total_cycles || null,
      is_active ? 1 : 0,
      userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت فاکتور تکراری' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'create',
        entityType: 'recurring_invoice',
        entityId: this.lastID,
        description: `Created recurring invoice for account ${account_id}`,
        ...clientInfo
      });

      res.status(201).json({ id: this.lastID, message: 'فاکتور تکراری با موفقیت ثبت شد' });
    }
  );
});

// Update recurring invoice
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const recurringInvoice: any = req.body;
  const userId = req.user?.id;

  const {
    frequency,
    interval,
    start_date,
    end_date,
    next_invoice_date,
    total_cycles,
    is_active
  } = recurringInvoice;

  db.run(
    `UPDATE recurring_invoices SET 
      frequency = COALESCE(?, frequency),
      interval = COALESCE(?, interval),
      start_date = COALESCE(?, start_date),
      end_date = ?,
      next_invoice_date = COALESCE(?, next_invoice_date),
      total_cycles = ?,
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      frequency || null,
      interval || null,
      start_date || null,
      end_date || null,
      next_invoice_date || null,
      total_cycles || null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی فاکتور تکراری' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'فاکتور تکراری یافت نشد' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'update',
        entityType: 'recurring_invoice',
        entityId: parseInt(id),
        description: `Updated recurring invoice ${id}`,
        ...clientInfo
      });

      res.json({ message: 'فاکتور تکراری با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete recurring invoice
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.run('DELETE FROM recurring_invoices WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف فاکتور تکراری' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'فاکتور تکراری یافت نشد' });
    }

    const clientInfo = getClientInfo(req);
    logActivity({
      userId: parseInt(String(userId!)),
      action: 'delete',
      entityType: 'recurring_invoice',
      entityId: parseInt(id),
      description: `Deleted recurring invoice ${id}`,
      ...clientInfo
    });

    res.json({ message: 'فاکتور تکراری با موفقیت حذف شد' });
  });
});

// Generate next invoice from recurring template
router.post('/:id/generate', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.get('SELECT * FROM recurring_invoices WHERE id = ?', [id], async (err, recurring: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت فاکتور تکراری' });
    }
    if (!recurring) {
      return res.status(404).json({ error: 'فاکتور تکراری یافت نشد' });
    }

    if (!recurring.is_active) {
      return res.status(400).json({ error: 'فاکتور تکراری غیرفعال است' });
    }

    // Check if we should generate (based on next_invoice_date and cycles)
    const today = new Date();
    const nextDate = new Date(recurring.next_invoice_date);

    if (nextDate > today) {
      return res.status(400).json({ error: 'زمان ایجاد فاکتور بعدی هنوز نرسیده است' });
    }

    if (recurring.total_cycles && recurring.cycles_completed >= recurring.total_cycles) {
      return res.status(400).json({ error: 'تعداد چرخه‌های تعریف شده به پایان رسیده است' });
    }

    // Get template invoice with items
    let templateInvoice: any = null;
    if (recurring.template_invoice_id) {
      db.get('SELECT * FROM invoices WHERE id = ?', [recurring.template_invoice_id], async (err, inv) => {
        if (err || !inv) {
          return res.status(500).json({ error: 'خطا در دریافت فاکتور الگو' });
        }
        templateInvoice = inv;
      });
    }

    // Create new invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Default 30 days

    db.run(
      `INSERT INTO invoices (
        deal_id, account_id, invoice_number, amount, currency, status,
        due_date, payment_stage, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        null,
        recurring.account_id,
        invoiceNumber,
        templateInvoice?.amount || 0,
        templateInvoice?.currency || 'IRR',
        'draft',
        dueDate.toISOString().split('T')[0],
        null,
        `Generated from recurring invoice #${id}`
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در ایجاد فاکتور' });
        }

        const invoiceId = this.lastID;

        // Copy items from template if exists
        if (templateInvoice && recurring.template_invoice_id) {
          db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [recurring.template_invoice_id], (err, items: any[]) => {
            if (!err && items && items.length > 0) {
              const itemStmt = db.prepare(`
                INSERT INTO invoice_items (
                  invoice_id, item_name, description, quantity, unit_price,
                  tax_rate, tax_amount, total_amount, position
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

              items.forEach((item) => {
                itemStmt.run([
                  invoiceId,
                  item.item_name,
                  item.description,
                  item.quantity,
                  item.unit_price,
                  item.tax_rate,
                  item.tax_amount,
                  item.total_amount,
                  item.position
                ]);
              });

              itemStmt.finalize();
            }
          });
        }

        // Update recurring invoice
        const cyclesCompleted = (recurring.cycles_completed || 0) + 1;
        
        // Calculate next invoice date
        const nextInvoiceDate = new Date(recurring.next_invoice_date);
        switch (recurring.frequency) {
          case 'daily':
            nextInvoiceDate.setDate(nextInvoiceDate.getDate() + (recurring.interval || 1));
            break;
          case 'weekly':
            nextInvoiceDate.setDate(nextInvoiceDate.getDate() + (recurring.interval || 1) * 7);
            break;
          case 'monthly':
            nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + (recurring.interval || 1));
            break;
          case 'yearly':
            nextInvoiceDate.setFullYear(nextInvoiceDate.getFullYear() + (recurring.interval || 1));
            break;
        }

        // Check if should deactivate
        let isActive = recurring.is_active;
        if (recurring.total_cycles && cyclesCompleted >= recurring.total_cycles) {
          isActive = 0;
        }
        if (recurring.end_date && new Date(recurring.end_date) < nextInvoiceDate) {
          isActive = 0;
        }

        db.run(
          `UPDATE recurring_invoices SET 
            cycles_completed = ?,
            next_invoice_date = ?,
            last_invoice_date = CURRENT_TIMESTAMP,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            cyclesCompleted,
            nextInvoiceDate.toISOString().split('T')[0],
            isActive,
            id
          ],
          () => {
            const clientInfo = getClientInfo(req);
            logActivity({
              userId: parseInt(String(userId!)),
              action: 'generate',
              entityType: 'recurring_invoice',
              entityId: parseInt(id),
              description: `Generated invoice ${invoiceNumber} from recurring template`,
              metadata: { generated_invoice_id: invoiceId },
              ...clientInfo
            });

            res.status(201).json({
              invoice_id: invoiceId,
              invoice_number: invoiceNumber,
              message: 'فاکتور با موفقیت ایجاد شد'
            });
          }
        );
      }
    );
  });
});

export default router;

