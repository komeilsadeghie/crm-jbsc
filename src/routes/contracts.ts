import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateContractPDF, generateContractWord, getContractWithDetails } from '../services/pdf-generator';

const router = express.Router();

// Get all contracts
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, status } = req.query;
  
  let query = `
    SELECT c.*, 
           a.name as account_name
    FROM contracts c
    LEFT JOIN accounts a ON c.account_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND c.account_id = ?';
    params.push(account_id);
  }

  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }

  query += ' ORDER BY c.created_at DESC';

  db.all(query, params, (err, contracts) => {
    if (err) {
      console.error('Error fetching contracts:', err);
      // If table doesn't exist, return empty array instead of error
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
        console.warn('Contracts or accounts table does not exist yet, returning empty array');
        return res.json([]);
      }
      return res.status(500).json({ error: 'خطا در دریافت قراردادها' });
    }
    res.json(Array.isArray(contracts) ? contracts : []);
  });
});

// Get contracts expiring soon
router.get('/expiring-soon', authenticate, (req: AuthRequest, res: Response) => {
  const { days = 30 } = req.query;
  
  db.all(`
    SELECT c.*, a.name as account_name
    FROM contracts c
    LEFT JOIN accounts a ON c.account_id = a.id
    WHERE c.status = 'active'
      AND c.end_date IS NOT NULL
      AND c.end_date <= date('now', '+' || ? || ' days')
      AND c.end_date >= date('now')
    ORDER BY c.end_date ASC
  `, [days], (err, contracts) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت قراردادها' });
    }
    res.json(contracts);
  });
});

// Create contract
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const contract = req.body;
  const contractNumber = contract.contract_number || `CNT-${Date.now()}`;

  // Validate account_id if provided
  if (contract.account_id) {
    db.get('SELECT id FROM accounts WHERE id = ?', [contract.account_id], (err, account) => {
      if (err) {
        console.error('Error checking account:', err);
        // If table doesn't exist, allow null account_id
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          console.warn('Accounts table does not exist, creating contract without account_id');
          contract.account_id = null;
        } else {
          return res.status(500).json({ error: 'خطا در بررسی حساب' });
        }
      }
      if (!account && contract.account_id) {
        return res.status(404).json({ error: 'حساب انتخاب شده یافت نشد' });
      }
      
      // Continue with insert
      insertContract();
    });
  } else {
    insertContract();
  }
  
  function insertContract() {
    db.run(
      `INSERT INTO contracts (
        account_id, contract_number, title, description, contract_type,
        start_date, end_date, value, currency, status,
        auto_renew, renewal_notice_days, signed_date, signed_by, file_path, created_by,
        domain_name, hosting_type, hosting_duration, ssl_certificate, support_duration,
        seo_package, website_pages, website_languages, payment_terms, delivery_days, warranty_months, project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contract.account_id || null,
        contractNumber,
        contract.title,
        contract.description || null,
        contract.contract_type || null,
        contract.start_date,
        contract.end_date || null,
        contract.value || null,
        contract.currency || 'IRR',
        contract.status || 'draft',
        contract.auto_renew ? 1 : 0,
        contract.renewal_notice_days || 30,
        contract.signed_date || null,
        contract.signed_by || null,
        contract.file_path || null,
        req.user?.id,
        contract.domain_name || null,
        contract.hosting_type || null,
        contract.hosting_duration || null,
        contract.ssl_certificate || 0,
        contract.support_duration || null,
        contract.seo_package || null,
        contract.website_pages || null,
        contract.website_languages || null,
        contract.payment_terms || null,
        contract.delivery_days || null,
        contract.warranty_months || null,
        contract.project_id || null,
      ],
      function(err) {
        if (err) {
          console.error('Error creating contract:', err);
          return res.status(500).json({ error: 'خطا در ثبت قرارداد: ' + (err.message || 'خطای نامشخص') });
        }
        res.status(201).json({ id: this.lastID, contract_number: contractNumber, message: 'قرارداد با موفقیت ثبت شد' });
      }
    );
  }
});

// Update contract
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const contract = req.body;

  db.run(
    `UPDATE contracts SET 
      account_id = ?, title = ?, description = ?, contract_type = ?,
      start_date = ?, end_date = ?, value = ?, currency = ?, status = ?,
      auto_renew = ?, renewal_notice_days = ?, signed_date = ?, signed_by = ?, file_path = ?,
      domain_name = ?, hosting_type = ?, hosting_duration = ?, ssl_certificate = ?, support_duration = ?,
      seo_package = ?, website_pages = ?, website_languages = ?, payment_terms = ?, delivery_days = ?, warranty_months = ?, project_id = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      contract.account_id,
      contract.title,
      contract.description || null,
      contract.contract_type || null,
      contract.start_date,
      contract.end_date || null,
      contract.value || null,
      contract.currency || 'IRR',
      contract.status,
      contract.auto_renew ? 1 : 0,
      contract.renewal_notice_days || 30,
      contract.signed_date || null,
      contract.signed_by || null,
      contract.file_path || null,
      contract.domain_name || null,
      contract.hosting_type || null,
      contract.hosting_duration || null,
      contract.ssl_certificate || 0,
      contract.support_duration || null,
      contract.seo_package || null,
      contract.website_pages || null,
      contract.website_languages || null,
      contract.payment_terms || null,
      contract.delivery_days || null,
      contract.warranty_months || null,
      contract.project_id || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی قرارداد' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'قرارداد یافت نشد' });
      }
      res.json({ message: 'قرارداد با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Generate PDF
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const contract = await getContractWithDetails(parseInt(id));
    const pdfBuffer = await generateContractPDF(contract);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.contract_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تولید PDF' });
  }
});

// Generate Word Document
router.get('/:id/word', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const contract = await getContractWithDetails(parseInt(id));
    const wordBuffer = await generateContractWord(contract);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.contract_number}.docx"`);
    res.send(wordBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تولید فایل Word' });
  }
});

// Renew contract
router.post('/:id/renew', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { new_end_date, new_value } = req.body;

  db.get('SELECT * FROM contracts WHERE id = ?', [id], (err, contract: any) => {
    if (err || !contract) {
      return res.status(404).json({ error: 'قرارداد یافت نشد' });
    }

    const newStartDate = contract.end_date || new Date().toISOString().split('T')[0];
    const newEndDate = new_end_date || null;

    db.run(
      `UPDATE contracts SET 
        start_date = ?, end_date = ?, value = ?,
        status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        newStartDate,
        newEndDate,
        new_value || contract.value,
        id
      ],
      function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'خطا در تمدید قرارداد' });
        }
        res.json({ message: 'قرارداد با موفقیت تمدید شد' });
      }
    );
  });
});

export default router;

