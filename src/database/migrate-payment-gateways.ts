import { db } from './db';

export const migratePaymentGatewaysTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if payment_gateways table exists
      db.all(`PRAGMA table_info(payment_gateways)`, [], (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create payment_gateways table
          db.run(`
            CREATE TABLE IF NOT EXISTS payment_gateways (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE,
              type TEXT NOT NULL CHECK(type IN ('paypal', 'stripe', 'mollie', 'authorize_net', '2checkout', 'payu_money', 'braintree')),
              is_active INTEGER DEFAULT 0,
              test_mode INTEGER DEFAULT 1,
              api_key TEXT,
              api_secret TEXT,
              merchant_id TEXT,
              webhook_secret TEXT,
              settings TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Error creating payment_gateways table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created payment_gateways table');
          });
        } else {
          console.log('✅ payment_gateways table already exists');
        }
      });

      // Check if payment_transactions table exists
      db.all(`PRAGMA table_info(payment_transactions)`, [], (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create payment_transactions table
          db.run(`
            CREATE TABLE IF NOT EXISTS payment_transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_id INTEGER,
              account_id INTEGER NOT NULL,
              gateway_id INTEGER NOT NULL,
              transaction_id TEXT UNIQUE,
              amount DECIMAL(10, 2) NOT NULL,
              currency TEXT DEFAULT 'IRR',
              status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
              payment_method TEXT,
              gateway_response TEXT,
              failure_reason TEXT,
              paid_at DATETIME,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
              FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
              FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating payment_transactions table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created payment_transactions table');
            
            // Create indexes
            db.run(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id ON payment_transactions(invoice_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_account_id ON payment_transactions(account_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status)`, () => {
              resolve();
            });
          });
        } else {
          console.log('✅ payment_transactions table already exists');
          resolve();
        }
      });
    });
  });
};

