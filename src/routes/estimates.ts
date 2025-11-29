import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateEstimatePDF, generateEstimateWord, getEstimateWithItems } from '../services/pdf-generator';

const router = express.Router();

// List estimates
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, deal_id, status, sortBy = 'created_at', order = 'DESC' } = req.query as any;

  let query = `
    SELECT e.*, 
           a.name as account_name,
           d.title as deal_title
    FROM estimates e
    LEFT JOIN accounts a ON e.account_id = a.id
    LEFT JOIN deals d ON e.deal_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND e.account_id = ?';
    params.push(account_id);
  }
  if (deal_id) {
    query += ' AND e.deal_id = ?';
    params.push(deal_id);
  }
  if (status) {
    query += ' AND e.status = ?';
    params.push(status);
  }

  query += ` ORDER BY e.${sortBy} ${order}`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطا در دریافت پیش‌فاکتورها' });
    res.json(rows);
  });
});

// Get single estimate with items
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  db.get(`
    SELECT e.*, a.name as account_name, d.title as deal_title
    FROM estimates e
    LEFT JOIN accounts a ON e.account_id = a.id
    LEFT JOIN deals d ON e.deal_id = d.id
    WHERE e.id = ?
  `, [id], (err, estimate: any) => {
    if (err) return res.status(500).json({ error: 'خطا در دریافت پیش‌فاکتور' });
    if (!estimate) return res.status(404).json({ error: 'پیش‌فاکتور یافت نشد' });
    
    // Get items
    db.all('SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY position', [id], (err, items) => {
      if (err) return res.status(500).json({ error: 'خطا در دریافت آیتم‌ها' });
      res.json({ ...estimate, items: items || [] });
    });
  });
});

// Generate PDF
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const estimate = await getEstimateWithItems(parseInt(id));
    const pdfBuffer = await generateEstimatePDF(estimate);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="estimate-${estimate.estimate_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تولید PDF' });
  }
});

// Generate Word Document
router.get('/:id/word', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const estimate = await getEstimateWithItems(parseInt(id));
    const wordBuffer = await generateEstimateWord(estimate);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="estimate-${estimate.estimate_number}.docx"`);
    res.send(wordBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تولید فایل Word' });
  }
});

// Create estimate
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const payload = req.body || {};
  const estimateNumber = payload.estimate_number || `EST-${Date.now()}`;

  // Validate required fields
  if (!payload.amount || isNaN(parseFloat(payload.amount))) {
    return res.status(400).json({ error: 'مبلغ الزامی است و باید عدد معتبر باشد' });
  }

  const values = [
    payload.deal_id || null,
    payload.account_id || null,
    estimateNumber,
    parseFloat(payload.amount),
    payload.currency || 'IRR',
    payload.status || 'draft',
    payload.valid_until || null,
    payload.notes || null,
    payload.contract_type || null,
    payload.domain_name || null,
    payload.hosting_type || null,
    payload.hosting_duration ? parseInt(payload.hosting_duration) : null,
    payload.ssl_included ? 1 : 0,
    payload.maintenance_months ? parseInt(payload.maintenance_months) : null,
    payload.seo_package || null,
    payload.site_pages ? parseInt(payload.site_pages) : null,
    payload.site_languages || null,
    payload.payment_terms || null,
    payload.delivery_days ? parseInt(payload.delivery_days) : null,
    payload.warranty_months ? parseInt(payload.warranty_months) : null
  ];

  db.run(
    `INSERT INTO estimates (
      deal_id, account_id, estimate_number, amount, currency, status, valid_until, notes,
      contract_type, domain_name, hosting_type, hosting_duration, ssl_included,
      maintenance_months, seo_package, site_pages, site_languages,
      payment_terms, delivery_days, warranty_months
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values,
    function (err) {
      if (err) {
        console.error('Error creating estimate:', err);
        return res.status(500).json({ error: 'خطا در ثبت پیش‌فاکتور: ' + err.message });
      }
      
      const estimateId = this.lastID;
      
      // Insert items if provided
      if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
        const items = payload.items.map((item: any, index: number) => ({
          estimate_id: estimateId,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          total_amount: (item.quantity || 1) * item.unit_price * (1 + (item.tax_rate || 0) / 100),
          position: index
        }));

        const stmt = db.prepare(`
          INSERT INTO estimate_items (estimate_id, item_name, description, quantity, unit_price, tax_rate, total_amount, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        items.forEach((item: any) => {
          stmt.run([
            item.estimate_id,
            item.item_name,
            item.description,
            item.quantity,
            item.unit_price,
            item.tax_rate,
            item.total_amount,
            item.position
          ]);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('Error inserting items:', err);
          }
        });
      }
      
      res.status(201).json({ id: estimateId, estimate_number: estimateNumber, message: 'پیش‌فاکتور با موفقیت ثبت شد' });
    }
  );
});

// Update estimate
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const payload = req.body || {};

  db.run(
    `UPDATE estimates SET 
      deal_id = ?, account_id = ?, amount = ?, currency = ?, status = ?,
      valid_until = ?, notes = ?,
      contract_type = ?, domain_name = ?, hosting_type = ?, hosting_duration = ?, ssl_included = ?,
      maintenance_months = ?, seo_package = ?, site_pages = ?, site_languages = ?,
      payment_terms = ?, delivery_days = ?, warranty_months = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      payload.deal_id || null,
      payload.account_id || null,
      payload.amount,
      payload.currency || 'IRR',
      payload.status || 'draft',
      payload.valid_until || null,
      payload.notes || null,
      payload.contract_type || null,
      payload.domain_name || null,
      payload.hosting_type || null,
      payload.hosting_duration || null,
      payload.ssl_included ? 1 : 0,
      payload.maintenance_months || null,
      payload.seo_package || null,
      payload.site_pages || null,
      payload.site_languages || null,
      payload.payment_terms || null,
      payload.delivery_days || null,
      payload.warranty_months || null,
      id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'خطا در به‌روزرسانی پیش‌فاکتور' });
      if (this.changes === 0) return res.status(404).json({ error: 'پیش‌فاکتور یافت نشد' });
      
      // Update items if provided
      if (payload.items && Array.isArray(payload.items)) {
        // Delete existing items
        db.run('DELETE FROM estimate_items WHERE estimate_id = ?', [id], () => {
          // Insert new items
          const items = payload.items.map((item: any, index: number) => ({
            estimate_id: parseInt(id),
            item_name: item.item_name,
            description: item.description || null,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate || 0,
            total_amount: (item.quantity || 1) * item.unit_price * (1 + (item.tax_rate || 0) / 100),
            position: index
          }));

          const stmt = db.prepare(`
            INSERT INTO estimate_items (estimate_id, item_name, description, quantity, unit_price, tax_rate, total_amount, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          items.forEach((item: any) => {
            stmt.run([
              item.estimate_id,
              item.item_name,
              item.description,
              item.quantity,
              item.unit_price,
              item.tax_rate,
              item.total_amount,
              item.position
            ]);
          });

          stmt.finalize();
        });
      }
      
      res.json({ message: 'پیش‌فاکتور با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Convert estimate to invoice
router.post('/:id/convert-to-invoice', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.get('SELECT * FROM estimates WHERE id = ?', [id], (err, estimate: any) => {
    if (err) return res.status(500).json({ error: 'خطا در دریافت پیش‌فاکتور' });
    if (!estimate) return res.status(404).json({ error: 'پیش‌فاکتور یافت نشد' });

    const invoiceNumber = `INV-${Date.now()}`;
    
    db.run(
      `INSERT INTO invoices (
        deal_id, account_id, invoice_number, amount, currency, status, due_date, payment_stage, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate.deal_id || null,
        estimate.account_id || null,
        invoiceNumber,
        estimate.amount,
        estimate.currency || 'IRR',
        'draft',
        null,
        null,
        `ایجاد شده از پیش‌فاکتور ${estimate.estimate_number || estimate.id}${estimate.notes ? ' - ' + estimate.notes : ''}`
      ],
      function (err2) {
        if (err2) return res.status(500).json({ error: 'خطا در ایجاد فاکتور از پیش‌فاکتور' });

        const newInvoiceId = this.lastID;

        // Copy items from estimate to invoice
        db.all('SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY position', [id], (err, items: any[]) => {
          if (!err && items && items.length > 0) {
            const itemStmt = db.prepare(`
              INSERT INTO invoice_items (
                invoice_id, item_name, description, quantity, unit_price,
                tax_rate, tax_amount, total_amount, position
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            items.forEach((item) => {
              const quantity = parseFloat(item.quantity || 1);
              const unitPrice = parseFloat(item.unit_price || 0);
              const taxRate = parseFloat(item.tax_rate || 0);
              const subtotal = quantity * unitPrice;
              const taxAmount = subtotal * (taxRate / 100);
              const total = subtotal + taxAmount;

              itemStmt.run([
                newInvoiceId,
                item.item_name,
                item.description,
                quantity,
                unitPrice,
                taxRate,
                taxAmount,
                total,
                item.position
              ]);
            });

            itemStmt.finalize();
          }

          // Update estimate status to accepted
          db.run('UPDATE estimates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['accepted', id], () => {
            res.status(201).json({
              message: 'فاکتور با موفقیت از پیش‌فاکتور ایجاد شد',
              invoice_id: newInvoiceId,
              invoice_number: invoiceNumber
            });
          });
        });
      }
    );
  });
});

export default router;


