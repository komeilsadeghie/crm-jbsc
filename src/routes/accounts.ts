import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Account } from '../types/extended';

const router = express.Router();

// Get all accounts (combines accounts and customers)
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { industry, status, search, sortBy = 'created_at', order = 'DESC' } = req.query;
  
  // First get accounts
  let accountsQuery = 'SELECT id, name, industry, status, created_at FROM accounts WHERE 1=1';
  const accountsParams: any[] = [];

  if (industry) {
    accountsQuery += ' AND industry = ?';
    accountsParams.push(industry);
  }

  if (status) {
    accountsQuery += ' AND status = ?';
    accountsParams.push(status);
  }

  if (search) {
    accountsQuery += ' AND (name LIKE ? OR website LIKE ?)';
    const searchTerm = `%${search}%`;
    accountsParams.push(searchTerm, searchTerm);
  }

  accountsQuery += ` ORDER BY ${sortBy} ${order}`;

  db.all(accountsQuery, accountsParams, (err, accounts: any[]) => {
    if (err) {
      console.error('Error fetching accounts:', err);
      // If table doesn't exist, return empty array instead of error
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
        console.warn('Accounts table does not exist yet, returning empty array');
        return res.json([]);
      }
      return res.status(500).json({ error: 'خطا در دریافت حساب‌ها' });
    }

    // Also get customers with status='customer' and combine
    // Only show customers that are marked as 'customer' status in the customers table
    let customersQuery = 'SELECT id, name, company_name, status, created_at FROM customers WHERE status = ?';
    const customersParams: any[] = ['customer'];

    // If status filter is provided and it's not 'customer', don't include customers
    if (status && status !== 'customer') {
      // Return only accounts, skip customers
      const result = Array.isArray(accounts) ? accounts : [];
      console.log(`Fetched ${result.length} accounts (customers filtered out by status=${status})`);
      return res.json(result);
    }

    if (search) {
      customersQuery += ' AND (name LIKE ? OR company_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      customersParams.push(searchTerm, searchTerm, searchTerm);
    }

    customersQuery += ` ORDER BY ${sortBy} ${order}`;

    db.all(customersQuery, customersParams, (err, customers: any[]) => {
      if (err) {
        console.error('Error fetching customers:', err);
        // If table doesn't exist, just return accounts
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          console.warn('Customers table does not exist yet, returning accounts only');
        }
        // Return accounts only if customers query fails
        const result = Array.isArray(accounts) ? accounts : [];
        console.log(`Fetched ${result.length} accounts (customers query failed)`);
        return res.json(result);
      }

      // Combine accounts and customers
      const accountsList = Array.isArray(accounts) ? accounts : [];
      const customersList = Array.isArray(customers) ? customers : [];

      // Map customers to account format
      const mappedCustomers = customersList.map((customer: any) => ({
        id: customer.id,
        name: customer.name || customer.company_name || `مشتری #${customer.id}`,
        company_name: customer.company_name,
        status: customer.status,
        created_at: customer.created_at,
      }));

      const combined = [...accountsList, ...mappedCustomers];
      console.log(`Fetched ${accountsList.length} accounts + ${customersList.length} customers = ${combined.length} total`);
      res.json(combined);
    });
  });
});

// Get single account with related data
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM accounts WHERE id = ?', [id], (err, account) => {
    if (err) {
      console.error('Error fetching account:', err);
      // If table doesn't exist, return 404
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
        return res.status(404).json({ error: 'حساب یافت نشد' });
      }
      return res.status(500).json({ error: 'خطا در دریافت حساب' });
    }
    if (!account) {
      return res.status(404).json({ error: 'حساب یافت نشد' });
    }

    // Get contacts
    db.all('SELECT * FROM contacts WHERE account_id = ?', [id], (err, contacts) => {
      if (err) {
        console.error('Error fetching contacts:', err);
        // If table doesn't exist, use empty array
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          contacts = [];
        } else {
          return res.status(500).json({ error: 'خطا در دریافت مخاطبین' });
        }
      }

      // Get deals
      db.all('SELECT * FROM deals WHERE account_id = ?', [id], (err, deals) => {
        if (err) {
          console.error('Error fetching deals:', err);
          // If table doesn't exist, use empty array
          if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
            deals = [];
          } else {
            return res.status(500).json({ error: 'خطا در دریافت پروژه‌ها' });
          }
        }

        res.json({
          ...(account as any),
          contacts,
          deals
        });
      });
    });
  });
});

// Create account
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const account: Account = req.body;

  db.run(
    `INSERT INTO accounts (
      name, industry, size, country, website, site_model, designer_id,
      service_package, acquisition_channel, lead_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.name,
      account.industry || null,
      account.size || null,
      account.country || null,
      account.website || null,
      account.site_model || null,
      account.designer_id || null,
      account.service_package || null,
      account.acquisition_channel || null,
      account.lead_id || null,
      account.status || 'active'
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت حساب' });
      }
      res.status(201).json({ id: this.lastID, message: 'حساب با موفقیت ثبت شد' });
    }
  );
});

// Update account
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const account: Account = req.body;

  db.run(
    `UPDATE accounts SET 
      name = ?, industry = ?, size = ?, country = ?, website = ?,
      site_model = ?, designer_id = ?, service_package = ?,
      acquisition_channel = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      account.name,
      account.industry || null,
      account.size || null,
      account.country || null,
      account.website || null,
      account.site_model || null,
      account.designer_id || null,
      account.service_package || null,
      account.acquisition_channel || null,
      account.status || 'active',
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی حساب' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'حساب یافت نشد' });
      }
      res.json({ message: 'حساب با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Calculate RFM for account
router.get('/:id/rfm', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Get last payment date (Recency)
  db.get(
    `SELECT MAX(paid_at) as last_payment_date,
            COUNT(DISTINCT DATE(paid_at)) as frequency,
            SUM(amount) as monetary
     FROM payments p
     JOIN invoices i ON p.invoice_id = i.id
     WHERE i.account_id = ?`,
    [id],
    (err, data: any) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در محاسبه RFM' });
      }

      // Calculate scores (1-5)
      const daysSinceLastPayment = data.last_payment_date 
        ? Math.floor((Date.now() - new Date(data.last_payment_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const recencyScore = daysSinceLastPayment <= 30 ? 5 :
                          daysSinceLastPayment <= 60 ? 4 :
                          daysSinceLastPayment <= 90 ? 3 :
                          daysSinceLastPayment <= 180 ? 2 : 1;

      const frequencyScore = (data.frequency || 0) >= 10 ? 5 :
                            (data.frequency || 0) >= 5 ? 4 :
                            (data.frequency || 0) >= 3 ? 3 :
                            (data.frequency || 0) >= 1 ? 2 : 1;

      const monetary = data.monetary || 0;
      const monetaryScore = monetary >= 50000000 ? 5 :
                           monetary >= 20000000 ? 4 :
                           monetary >= 10000000 ? 3 :
                           monetary >= 5000000 ? 2 : 1;

      const segment = recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4 ? 'gold' :
                     recencyScore >= 3 && frequencyScore >= 3 && monetaryScore >= 3 ? 'silver' : 'bronze';

      // Save RFM score
      db.run(
        `INSERT INTO rfm_scores (account_id, recency_score, frequency_score, monetary_score, segment, calculated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE recency_score = ?, frequency_score = ?, monetary_score = ?, segment = ?, calculated_at = CURRENT_TIMESTAMP`,
        [id, recencyScore, frequencyScore, monetaryScore, segment, recencyScore, frequencyScore, monetaryScore, segment],
        () => {
          res.json({
            recency_score: recencyScore,
            frequency_score: frequencyScore,
            monetary_score: monetaryScore,
            segment,
            days_since_last_payment: daysSinceLastPayment,
            total_payments: data.frequency || 0,
            total_amount: monetary
          });
        }
      );
    }
  );
});

export default router;


