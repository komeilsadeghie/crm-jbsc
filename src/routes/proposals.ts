import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';
// import { generateProposalPDF } from '../services/pdf-generator'; // TODO: Implement PDF generation

const router = express.Router();

// Get all proposals
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, deal_id, status, sortBy = 'created_at', order = 'DESC' } = req.query;

  let query = `
    SELECT p.*, 
           a.name as account_name,
           d.title as deal_title,
           c.first_name || ' ' || c.last_name as contact_name,
           u.full_name as created_by_name
    FROM proposals p
    LEFT JOIN accounts a ON p.account_id = a.id
    LEFT JOIN deals d ON p.deal_id = d.id
    LEFT JOIN contacts c ON p.contact_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND p.account_id = ?';
    params.push(account_id);
  }

  if (deal_id) {
    query += ' AND p.deal_id = ?';
    params.push(deal_id);
  }

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  query += ` ORDER BY p.${sortBy} ${order}`;

  db.all(query, params, (err, proposals) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پروپوزال‌ها' });
    }
    res.json(proposals);
  });
});

// Get single proposal with items and attachments
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT p.*, 
           a.name as account_name,
           d.title as deal_title,
           c.first_name || ' ' || c.last_name as contact_name,
           u.full_name as created_by_name
    FROM proposals p
    LEFT JOIN accounts a ON p.account_id = a.id
    LEFT JOIN deals d ON p.deal_id = d.id
    LEFT JOIN contacts c ON p.contact_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `, [id], (err, proposal: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پروپوزال' });
    }
    if (!proposal) {
      return res.status(404).json({ error: 'پروپوزال یافت نشد' });
    }

    // Get items and attachments in parallel
    db.all('SELECT * FROM proposal_items WHERE proposal_id = ? ORDER BY position', [id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت آیتم‌ها' });
      }

      db.all('SELECT * FROM proposal_attachments WHERE proposal_id = ?', [id], (err, attachments) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در دریافت ضمیمه‌ها' });
        }

        res.json({
          ...proposal,
          items: items || [],
          attachments: attachments || []
        });
      });
    });
  });
});

// Create proposal
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const proposal: any = req.body;
  const userId = req.user?.id;

  const {
    account_id,
    contact_id,
    deal_id,
    subject,
    content,
    amount,
    currency = 'IRR',
    valid_until,
    email_template_id,
    items
  } = proposal;

  if (!account_id || !subject || !content) {
    return res.status(400).json({ error: 'فیلدهای الزامی: account_id, subject, content' });
  }

  // Generate proposal number
  const proposalNumber = proposal.proposal_number || `PROP-${Date.now()}`;

  // Calculate total from items if provided
  let totalAmount = amount || 0;
  if (items && Array.isArray(items) && items.length > 0) {
    totalAmount = items.reduce((sum: number, item: any) => {
      const quantity = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.unit_price || 0);
      const taxRate = parseFloat(item.tax_rate || 0);
      const subtotal = quantity * unitPrice;
      const taxAmount = subtotal * (taxRate / 100);
      return sum + subtotal + taxAmount;
    }, 0);
  }

  db.run(
    `INSERT INTO proposals (
      account_id, contact_id, deal_id, proposal_number, subject, content,
      amount, currency, valid_until, email_template_id, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account_id,
      contact_id || null,
      deal_id || null,
      proposalNumber,
      subject,
      content,
      totalAmount,
      currency,
      valid_until || null,
      email_template_id || null,
      userId ? parseInt(String(userId)) : null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت پروپوزال' });
      }

      const proposalId = this.lastID;

      // Insert items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO proposal_items (
            proposal_id, item_name, description, quantity, unit_price,
            tax_rate, tax_amount, total_amount, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        items.forEach((item: any, index: number) => {
          const quantity = parseFloat(item.quantity || 1);
          const unitPrice = parseFloat(item.unit_price || 0);
          const taxRate = parseFloat(item.tax_rate || 0);
          const subtotal = quantity * unitPrice;
          const taxAmount = subtotal * (taxRate / 100);
          const total = subtotal + taxAmount;

          itemStmt.run([
            proposalId,
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
            console.error('Error inserting proposal items:', err);
          }

          // Log activity
          const clientInfo = getClientInfo(req);
          logActivity({
            userId: parseInt(String(userId!)),
            action: 'create',
            entityType: 'proposal',
            entityId: proposalId,
            description: `Created proposal ${proposalNumber}`,
            ...clientInfo
          });

          res.status(201).json({ id: proposalId, proposal_number: proposalNumber, message: 'پروپوزال با موفقیت ثبت شد' });
        });
      } else {
        // Log activity
        const clientInfo = getClientInfo(req);
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'create',
          entityType: 'proposal',
          entityId: proposalId,
          description: `Created proposal ${proposalNumber}`,
          ...clientInfo
        });

        res.status(201).json({ id: proposalId, proposal_number: proposalNumber, message: 'پروپوزال با موفقیت ثبت شد' });
      }
    }
  );
});

// Update proposal
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const proposal: any = req.body;
  const userId = req.user?.id;

  const {
    subject,
    content,
    amount,
    currency,
    valid_until,
    status,
    items
  } = proposal;

  // Calculate total from items if provided
  let totalAmount = amount;
  if (items && Array.isArray(items) && items.length > 0) {
    totalAmount = items.reduce((sum: number, item: any) => {
      const quantity = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.unit_price || 0);
      const taxRate = parseFloat(item.tax_rate || 0);
      const subtotal = quantity * unitPrice;
      const taxAmount = subtotal * (taxRate / 100);
      return sum + subtotal + taxAmount;
    }, 0);
  }

  db.run(
    `UPDATE proposals SET 
      subject = COALESCE(?, subject),
      content = COALESCE(?, content),
      amount = COALESCE(?, amount),
      currency = COALESCE(?, currency),
      valid_until = ?,
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      subject || null,
      content || null,
      totalAmount || null,
      currency || null,
      valid_until || null,
      status || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی پروپوزال' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'پروپوزال یافت نشد' });
      }

      // Update items if provided
      if (items && Array.isArray(items)) {
        db.run('DELETE FROM proposal_items WHERE proposal_id = ?', [id], () => {
          const itemStmt = db.prepare(`
            INSERT INTO proposal_items (
              proposal_id, item_name, description, quantity, unit_price,
              tax_rate, tax_amount, total_amount, position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          items.forEach((item: any, index: number) => {
            const quantity = parseFloat(item.quantity || 1);
            const unitPrice = parseFloat(item.unit_price || 0);
            const taxRate = parseFloat(item.tax_rate || 0);
            const subtotal = quantity * unitPrice;
            const taxAmount = subtotal * (taxRate / 100);
            const total = subtotal + taxAmount;

            itemStmt.run([
              parseInt(id),
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

          itemStmt.finalize();
        });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'update',
        entityType: 'proposal',
        entityId: parseInt(id),
        description: `Updated proposal ${id}`,
        ...clientInfo
      });

      res.json({ message: 'پروپوزال با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Send proposal (mark as sent and update sent_at)
router.post('/:id/send', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.run(
    `UPDATE proposals SET 
      status = 'sent',
      sent_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ارسال پروپوزال' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'پروپوزال یافت نشد' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'send',
        entityType: 'proposal',
        entityId: parseInt(id),
        description: `Sent proposal ${id}`,
        ...clientInfo
      });

      res.json({ message: 'پروپوزال با موفقیت ارسال شد' });
    }
  );
});

// Accept proposal (public endpoint - can be accessed via token)
router.post('/:id/accept', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const contactId = req.contact?.id || req.body.contact_id;

  db.get('SELECT * FROM proposals WHERE id = ?', [id], (err, proposal: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پروپوزال' });
    }
    if (!proposal) {
      return res.status(404).json({ error: 'پروپوزال یافت نشد' });
    }

    if (proposal.status !== 'sent') {
      return res.status(400).json({ error: 'فقط پروپوزال‌های ارسال شده قابل قبول هستند' });
    }

    if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
      db.run('UPDATE proposals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['expired', id]);
      return res.status(400).json({ error: 'پروپوزال منقضی شده است' });
    }

    db.run(
      `UPDATE proposals SET 
        status = 'accepted',
        accepted_at = CURRENT_TIMESTAMP,
        accepted_by = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [contactId || null, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در قبول پروپوزال' });
        }

        // TODO: Send thank-you email if email_template_id exists
        // TODO: Auto-convert to estimate/invoice if configured

        res.json({ message: 'پروپوزال با موفقیت قبول شد' });
      }
    );
  });
});

// Decline proposal (public endpoint)
router.post('/:id/decline', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { decline_reason } = req.body;
  const contactId = req.contact?.id || req.body.contact_id;

  db.get('SELECT * FROM proposals WHERE id = ?', [id], (err, proposal: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پروپوزال' });
    }
    if (!proposal) {
      return res.status(404).json({ error: 'پروپوزال یافت نشد' });
    }

    if (proposal.status !== 'sent') {
      return res.status(400).json({ error: 'فقط پروپوزال‌های ارسال شده قابل رد هستند' });
    }

    db.run(
      `UPDATE proposals SET 
        status = 'declined',
        declined_at = CURRENT_TIMESTAMP,
        declined_by = ?,
        decline_reason = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [contactId || null, decline_reason || null, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در رد پروپوزال' });
        }

        res.json({ message: 'پروپوزال با موفقیت رد شد' });
      }
    );
  });
});

// Track proposal view (public endpoint)
router.post('/:id/view', (req: express.Request, res: Response) => {
  const { id } = req.params;

  db.run(
    `UPDATE proposals SET 
      view_count = view_count + 1,
      viewed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id],
    () => {
      res.json({ message: 'View tracked' });
    }
  );
});

// Generate PDF
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Get proposal with items
    db.get('SELECT * FROM proposals WHERE id = ?', [id], async (err, proposal: any) => {
      if (err || !proposal) {
        return res.status(404).json({ error: 'پروپوزال یافت نشد' });
      }

      db.all('SELECT * FROM proposal_items WHERE proposal_id = ? ORDER BY position', [id], async (err, items: any[]) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در دریافت آیتم‌ها' });
        }

        // TODO: Implement generateProposalPDF function
        // const pdfBuffer = await generateProposalPDF({ ...proposal, items: items || [] });
        // res.setHeader('Content-Type', 'application/pdf');
        // res.setHeader('Content-Disposition', `attachment; filename="proposal-${proposal.proposal_number}.pdf"`);
        // res.send(pdfBuffer);

        res.status(501).json({ error: 'PDF generation not yet implemented' });
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تولید PDF' });
  }
});

// Delete proposal
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.run('DELETE FROM proposals WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف پروپوزال' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'پروپوزال یافت نشد' });
    }

    const clientInfo = getClientInfo(req);
    logActivity({
      userId: parseInt(String(userId!)),
      action: 'delete',
      entityType: 'proposal',
      entityId: parseInt(id),
      description: `Deleted proposal ${id}`,
      ...clientInfo
    });

    res.json({ message: 'پروپوزال با موفقیت حذف شد' });
  });
});

export default router;

