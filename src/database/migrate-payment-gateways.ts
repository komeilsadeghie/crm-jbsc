import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

export const migratePaymentGatewaysTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if payment_gateways table exists
      getTableInfoCallback('payment_gateways', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create payment_gateways table
          const createPaymentGatewaysSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS payment_gateways (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              type VARCHAR(50) NOT NULL,
              is_active INT DEFAULT 0,
              test_mode INT DEFAULT 1,
              api_key TEXT,
              api_secret TEXT,
              merchant_id TEXT,
              webhook_secret TEXT,
              settings TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          db.run(createPaymentGatewaysSQL, (err) => {
            if (err) {
              console.error('Error creating payment_gateways table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created payment_gateways table');
            createPaymentTransactions(resolve, reject);
          });
        } else {
          console.log('✅ payment_gateways table already exists');
          createPaymentTransactions(resolve, reject);
        }
      });
    });
  });
};

const createPaymentTransactions = (resolve: () => void, reject: (err: any) => void) => {
  // Check if payment_transactions table exists
  getTableInfoCallback('payment_transactions', (err: any, info: any[]) => {
    if (err || !info || info.length === 0) {
      // Create payment_transactions table
      const createPaymentTransactionsSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT,
          account_id INT NOT NULL,
          gateway_id INT NOT NULL,
          transaction_id VARCHAR(255) UNIQUE,
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'IRR',
          status VARCHAR(50) DEFAULT 'pending',
          payment_method VARCHAR(100),
          gateway_response TEXT,
          failure_reason TEXT,
          paid_at DATETIME,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(createPaymentTransactionsSQL, (err) => {
        if (err) {
          console.error('Error creating payment_transactions table:', err);
          reject(err);
          return;
        }
        console.log('✅ Created payment_transactions table');
        
        // Create indexes (ignore errors if index already exists)
        const index1SQL = convertSQLiteToMySQL(`CREATE INDEX idx_payment_transactions_invoice_id ON payment_transactions(invoice_id)`);
        const index2SQL = convertSQLiteToMySQL(`CREATE INDEX idx_payment_transactions_account_id ON payment_transactions(account_id)`);
        const index3SQL = convertSQLiteToMySQL(`CREATE INDEX idx_payment_transactions_status ON payment_transactions(status)`);
        
        db.run(index1SQL, (err: any) => {
          if (err && !err.message.includes('Duplicate key name')) {
            console.warn('Warning creating index idx_payment_transactions_invoice_id:', err.message);
          }
        });
        db.run(index2SQL, (err: any) => {
          if (err && !err.message.includes('Duplicate key name')) {
            console.warn('Warning creating index idx_payment_transactions_account_id:', err.message);
          }
        });
        db.run(index3SQL, (err: any) => {
          if (err && !err.message.includes('Duplicate key name')) {
            console.warn('Warning creating index idx_payment_transactions_status:', err.message);
          }
          resolve();
        });
      });
    } else {
      console.log('✅ payment_transactions table already exists');
      resolve();
    }
  });
};

