import { db, getTableInfoCallback } from './db';

export const migrateInvoicesTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if invoice_items table exists
      getTableInfoCallback('invoice_items', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create invoice_items table
          db.run(`
            CREATE TABLE IF NOT EXISTS invoice_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_id INTEGER NOT NULL,
              item_name TEXT NOT NULL,
              description TEXT,
              quantity DECIMAL(10, 2) DEFAULT 1,
              unit_price DECIMAL(10, 2) NOT NULL,
              tax_rate DECIMAL(5, 2) DEFAULT 0,
              tax_amount DECIMAL(10, 2) DEFAULT 0,
              total_amount DECIMAL(10, 2) NOT NULL,
              position INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) {
              console.error('Error creating invoice_items table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created invoice_items table');
          });
        } else {
          console.log('✅ invoice_items table already exists');
        }
      });

      // Check if recurring_invoices table exists
      getTableInfoCallback('recurring_invoices', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create recurring_invoices table
          db.run(`
            CREATE TABLE IF NOT EXISTS recurring_invoices (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              account_id INTEGER NOT NULL,
              template_invoice_id INTEGER,
              frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
              interval INTEGER DEFAULT 1,
              start_date DATE NOT NULL,
              end_date DATE,
              next_invoice_date DATE NOT NULL,
              last_invoice_date DATE,
              total_cycles INTEGER,
              cycles_completed INTEGER DEFAULT 0,
              is_active INTEGER DEFAULT 1,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
              FOREIGN KEY (template_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
              FOREIGN KEY (created_by) REFERENCES users(id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating recurring_invoices table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created recurring_invoices table');
          });
        } else {
          console.log('✅ recurring_invoices table already exists');
        }
      });

      // Check if activity_log table exists
      getTableInfoCallback('activity_log', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create activity_log table
          db.run(`
            CREATE TABLE IF NOT EXISTS activity_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              action TEXT NOT NULL,
              entity_type TEXT NOT NULL,
              entity_id INTEGER,
              description TEXT,
              ip_address TEXT,
              user_agent TEXT,
              metadata TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) {
              console.error('Error creating activity_log table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created activity_log table');
            
            // Create indexes for better performance
            db.run(`CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)`, () => {
              resolve();
            });
          });
        } else {
          console.log('✅ activity_log table already exists');
          resolve();
        }
      });
    });
  });
};

