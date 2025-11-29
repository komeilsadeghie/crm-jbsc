import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';
import { encrypt, decrypt } from '../utils/encryption';

const router = express.Router();

// ========== Payment Gateways Management ==========

// Get all payment gateways
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  db.all('SELECT id, name, type, is_active, test_mode, created_at FROM payment_gateways ORDER BY name', [], (err, gateways) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت درگاه‌های پرداخت' });
    }
    res.json(gateways);
  });
});

// Get single payment gateway (without sensitive data)
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM payment_gateways WHERE id = ?', [id], (err, gateway: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت درگاه پرداخت' });
    }
    if (!gateway) {
      return res.status(404).json({ error: 'درگاه پرداخت یافت نشد' });
    }

    // Decrypt sensitive fields
    if (gateway.api_key) {
      try {
        gateway.api_key = decrypt(gateway.api_key);
      } catch (e) {
        // If decryption fails, might be plain text (for migration)
        console.warn('Failed to decrypt api_key, keeping as is');
      }
    }
    if (gateway.api_secret) {
      try {
        gateway.api_secret = decrypt(gateway.api_secret);
      } catch (e) {
        console.warn('Failed to decrypt api_secret, keeping as is');
      }
    }
    if (gateway.webhook_secret) {
      try {
        gateway.webhook_secret = decrypt(gateway.webhook_secret);
      } catch (e) {
        console.warn('Failed to decrypt webhook_secret, keeping as is');
      }
    }

    res.json(gateway);
  });
});

// Create payment gateway
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const gateway: any = req.body;
  const userId = req.user?.id;

  const {
    name,
    type,
    is_active = false,
    test_mode = true,
    api_key,
    api_secret,
    merchant_id,
    webhook_secret,
    settings
  } = gateway;

  if (!name || !type) {
    return res.status(400).json({ error: 'نام و نوع درگاه الزامی است' });
  }

  // Encrypt sensitive data
  const encryptedApiKey = api_key ? encrypt(api_key) : null;
  const encryptedApiSecret = api_secret ? encrypt(api_secret) : null;
  const encryptedWebhookSecret = webhook_secret ? encrypt(webhook_secret) : null;

  db.run(
    `INSERT INTO payment_gateways (
      name, type, is_active, test_mode, api_key, api_secret,
      merchant_id, webhook_secret, settings
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      type,
      is_active ? 1 : 0,
      test_mode ? 1 : 0,
      encryptedApiKey,
      encryptedApiSecret,
      merchant_id || null,
      encryptedWebhookSecret,
      settings ? JSON.stringify(settings) : null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت درگاه پرداخت' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'create',
        entityType: 'payment_gateway',
        entityId: this.lastID,
        description: `Created payment gateway: ${name}`,
        ...clientInfo
      });

      res.status(201).json({ id: this.lastID, message: 'درگاه پرداخت با موفقیت ثبت شد' });
    }
  );
});

// Update payment gateway
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;
  const gateway: any = req.body;
  const userId = req.user?.id;

  const {
    name,
    is_active,
    test_mode,
    api_key,
    api_secret,
    merchant_id,
    webhook_secret,
    settings
  } = gateway;

  // Get existing gateway to preserve encrypted fields if not provided
  db.get('SELECT * FROM payment_gateways WHERE id = ?', [id], (err, existing: any) => {
    if (err || !existing) {
      return res.status(404).json({ error: 'درگاه پرداخت یافت نشد' });
    }

    // Encrypt sensitive data only if provided
    let encryptedApiKey = existing.api_key;
    let encryptedApiSecret = existing.api_secret;
    let encryptedWebhookSecret = existing.webhook_secret;

    if (api_key !== undefined) {
      encryptedApiKey = api_key ? encrypt(api_key) : null;
    }
    if (api_secret !== undefined) {
      encryptedApiSecret = api_secret ? encrypt(api_secret) : null;
    }
    if (webhook_secret !== undefined) {
      encryptedWebhookSecret = webhook_secret ? encrypt(webhook_secret) : null;
    }

    db.run(
      `UPDATE payment_gateways SET 
        name = COALESCE(?, name),
        is_active = COALESCE(?, is_active),
        test_mode = COALESCE(?, test_mode),
        api_key = ?,
        api_secret = ?,
        merchant_id = COALESCE(?, merchant_id),
        webhook_secret = ?,
        settings = COALESCE(?, settings),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        test_mode !== undefined ? (test_mode ? 1 : 0) : null,
        encryptedApiKey,
        encryptedApiSecret,
        merchant_id || null,
        encryptedWebhookSecret,
        settings ? JSON.stringify(settings) : null,
        id
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در به‌روزرسانی درگاه پرداخت' });
        }

        const clientInfo = getClientInfo(req);
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'update',
          entityType: 'payment_gateway',
          entityId: parseInt(id),
          description: `Updated payment gateway ${id}`,
          ...clientInfo
        });

        res.json({ message: 'درگاه پرداخت با موفقیت به‌روزرسانی شد' });
      }
    );
  });
});

// Delete payment gateway
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;
  const userId = req.user?.id;

  // Check if gateway has transactions
  db.get('SELECT COUNT(*) as count FROM payment_transactions WHERE gateway_id = ?', [id], (err, result: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی تراکنش‌ها' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'این درگاه دارای تراکنش است و نمی‌توان آن را حذف کرد' });
    }

    db.run('DELETE FROM payment_gateways WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف درگاه پرداخت' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'درگاه پرداخت یافت نشد' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'delete',
        entityType: 'payment_gateway',
        entityId: parseInt(id),
        description: `Deleted payment gateway ${id}`,
        ...clientInfo
      });

      res.json({ message: 'درگاه پرداخت با موفقیت حذف شد' });
    });
  });
});

// ========== Payment Transactions ==========

// Get payment transactions
router.get('/transactions', authenticate, (req: AuthRequest, res: Response) => {
  const { invoice_id, account_id, status, gateway_id } = req.query;

  let query = `
    SELECT pt.*, 
           i.invoice_number,
           a.name as account_name,
           pg.name as gateway_name,
           u.full_name as created_by_name
    FROM payment_transactions pt
    LEFT JOIN invoices i ON pt.invoice_id = i.id
    LEFT JOIN accounts a ON pt.account_id = a.id
    LEFT JOIN payment_gateways pg ON pt.gateway_id = pg.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (invoice_id) {
    query += ' AND pt.invoice_id = ?';
    params.push(invoice_id);
  }

  if (account_id) {
    query += ' AND pt.account_id = ?';
    params.push(account_id);
  }

  if (status) {
    query += ' AND pt.status = ?';
    params.push(status);
  }

  if (gateway_id) {
    query += ' AND pt.gateway_id = ?';
    params.push(gateway_id);
  }

  query += ' ORDER BY pt.created_at DESC';

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تراکنش‌ها' });
    }
    res.json(transactions);
  });
});

// Get single transaction
router.get('/transactions/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT pt.*, 
           i.invoice_number,
           a.name as account_name,
           pg.name as gateway_name,
           u.full_name as created_by_name
    FROM payment_transactions pt
    LEFT JOIN invoices i ON pt.invoice_id = i.id
    LEFT JOIN accounts a ON pt.account_id = a.id
    LEFT JOIN payment_gateways pg ON pt.gateway_id = pg.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.id = ?
  `, [id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت تراکنش' });
    }
    if (!transaction) {
      return res.status(404).json({ error: 'تراکنش یافت نشد' });
    }
    res.json(transaction);
  });
});

// Create payment transaction (initiate payment)
router.post('/transactions', authenticate, (req: AuthRequest, res: Response) => {
  const transaction: any = req.body;
  const userId = req.user?.id;

  const {
    invoice_id,
    account_id,
    gateway_id,
    amount,
    currency = 'IRR',
    payment_method
  } = transaction;

  if (!account_id || !gateway_id || !amount) {
    return res.status(400).json({ error: 'فیلدهای الزامی: account_id, gateway_id, amount' });
  }

  // Generate transaction ID
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  db.run(
    `INSERT INTO payment_transactions (
      invoice_id, account_id, gateway_id, transaction_id, amount, currency, payment_method, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice_id || null,
      account_id,
      gateway_id,
      transactionId,
      amount,
      currency,
      payment_method || null,
      userId ? parseInt(String(userId)) : null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت تراکنش' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'create',
        entityType: 'payment_transaction',
        entityId: this.lastID,
        description: `Created payment transaction ${transactionId}`,
        metadata: { amount, currency, gateway_id },
        ...clientInfo
      });

      // TODO: Call gateway API to initiate payment
      // This would return a payment URL or redirect URL

      res.status(201).json({
        id: this.lastID,
        transaction_id: transactionId,
        message: 'تراکنش با موفقیت ثبت شد',
        // payment_url: gatewayPaymentUrl // Would be returned from gateway API
      });
    }
  );
});

// Update transaction status (webhook handler)
router.post('/transactions/:id/webhook', (req: express.Request, res: Response) => {
  const { id } = req.params;
  const { status, transaction_id, gateway_response, failure_reason } = req.body;

  db.get('SELECT * FROM payment_transactions WHERE id = ?', [id], (err, transaction: any) => {
    if (err || !transaction) {
      return res.status(404).json({ error: 'تراکنش یافت نشد' });
    }

    db.run(
      `UPDATE payment_transactions SET 
        status = ?,
        gateway_response = ?,
        failure_reason = ?,
        paid_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE paid_at END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        status || transaction.status,
        gateway_response ? JSON.stringify(gateway_response) : null,
        failure_reason || null,
        status,
        id
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در به‌روزرسانی تراکنش' });
        }

        // If payment completed, update invoice
        if (status === 'completed' && transaction.invoice_id) {
          db.get('SELECT amount, paid_amount FROM invoices WHERE id = ?', [transaction.invoice_id], (err, invoice: any) => {
            if (!err && invoice) {
              const newPaidAmount = (invoice.paid_amount || 0) + transaction.amount;
              let newStatus = invoice.status;

              if (newPaidAmount >= invoice.amount) {
                newStatus = 'paid';
              } else if (newPaidAmount > 0) {
                newStatus = 'partial';
              }

              db.run(
                'UPDATE invoices SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newPaidAmount, newStatus, transaction.invoice_id]
              );
            }
          });
        }

        res.json({ message: 'تراکنش با موفقیت به‌روزرسانی شد' });
      }
    );
  });
});

// Refund transaction
router.post('/transactions/:id/refund', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی محدود' });
  }

  const { id } = req.params;
  const { amount } = req.body;
  const userId = req.user?.id;

  db.get('SELECT * FROM payment_transactions WHERE id = ?', [id], (err, transaction: any) => {
    if (err || !transaction) {
      return res.status(404).json({ error: 'تراکنش یافت نشد' });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ error: 'فقط تراکنش‌های تکمیل شده قابل بازگشت هستند' });
    }

    const refundAmount = amount || transaction.amount;

    db.run(
      `UPDATE payment_transactions SET 
        status = 'refunded',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در بازگشت وجه' });
        }

        // Update invoice paid amount
        if (transaction.invoice_id) {
          db.get('SELECT paid_amount FROM invoices WHERE id = ?', [transaction.invoice_id], (err, invoice: any) => {
            if (!err && invoice) {
              const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - refundAmount);
              db.run(
                'UPDATE invoices SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newPaidAmount, newPaidAmount > 0 ? 'partial' : 'due', transaction.invoice_id]
              );
            }
          });
        }

        const clientInfo = getClientInfo(req);
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'refund',
          entityType: 'payment_transaction',
          entityId: parseInt(id),
          description: `Refunded transaction ${transaction.transaction_id}`,
          metadata: { refund_amount: refundAmount },
          ...clientInfo
        });

        res.json({ message: 'بازگشت وجه با موفقیت انجام شد' });
      }
    );
  });
});

export default router;

