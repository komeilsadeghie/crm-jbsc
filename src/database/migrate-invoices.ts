import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

export const migrateInvoicesTable = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // First, check if invoices table exists and create it if needed
      getTableInfoCallback('invoices', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create invoices table first
          console.log('🔄 Creating invoices table...');
          const createInvoicesTableSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS invoices (
              id INT AUTO_INCREMENT PRIMARY KEY,
              deal_id INT,
              account_id INT,
              invoice_number VARCHAR(255) UNIQUE NOT NULL,
              amount DECIMAL(10, 2) NOT NULL,
              currency VARCHAR(10) DEFAULT 'IRR',
              status VARCHAR(50) DEFAULT 'draft',
              due_date DATE,
              payment_stage VARCHAR(50),
              notes TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          db.run(createInvoicesTableSQL, (createErr: any) => {
            if (createErr) {
              console.error('Error creating invoices table:', createErr);
              reject(createErr);
              return;
            }
            console.log('✅ Created invoices table');
            // Continue to create related tables
            createRelatedTables(resolve, reject);
          });
        } else {
          console.log('✅ invoices table already exists');
          // Continue to create related tables
          createRelatedTables(resolve, reject);
        }
      });
    });
  });
};

const createRelatedTables = (resolve: () => void, reject: (err: any) => void) => {
  // Check if invoice_items table exists
  getTableInfoCallback('invoice_items', (err: any, info: any[]) => {
    if (err || !info || info.length === 0) {
      // Create invoice_items table
      const createInvoiceItemsSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          description TEXT,
          quantity DECIMAL(10, 2) DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL,
          tax_rate DECIMAL(5, 2) DEFAULT 0,
          tax_amount DECIMAL(10, 2) DEFAULT 0,
          total_amount DECIMAL(10, 2) NOT NULL,
          position INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(createInvoiceItemsSQL, (err) => {
        if (err) {
          console.error('Error creating invoice_items table:', err);
          reject(err);
          return;
        }
        console.log('✅ Created invoice_items table');
        checkRecurringInvoices(resolve, reject);
      });
    } else {
      console.log('✅ invoice_items table already exists');
      checkRecurringInvoices(resolve, reject);
    }
  });
};

const checkRecurringInvoices = (resolve: () => void, reject: (err: any) => void) => {
  // Check if recurring_invoices table exists
  getTableInfoCallback('recurring_invoices', (err: any, info: any[]) => {
    if (err || !info || info.length === 0) {
      // Create recurring_invoices table
      const createRecurringInvoicesSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS recurring_invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          account_id INT NOT NULL,
          template_invoice_id INT,
          frequency VARCHAR(20) NOT NULL,
          interval INT DEFAULT 1,
          start_date DATE NOT NULL,
          end_date DATE,
          next_invoice_date DATE NOT NULL,
          last_invoice_date DATE,
          total_cycles INT,
          cycles_completed INT DEFAULT 0,
          is_active INT DEFAULT 1,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(createRecurringInvoicesSQL, (err) => {
        if (err) {
          console.error('Error creating recurring_invoices table:', err);
          reject(err);
          return;
        }
        console.log('✅ Created recurring_invoices table');
        checkActivityLog(resolve, reject);
      });
    } else {
      console.log('✅ recurring_invoices table already exists');
      checkActivityLog(resolve, reject);
    }
  });
};

const checkActivityLog = (resolve: () => void, reject: (err: any) => void) => {
  // Check if activity_log table exists
  getTableInfoCallback('activity_log', (err: any, info: any[]) => {
    if (err || !info || info.length === 0) {
      // Create activity_log table
      const createActivityLogSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INT,
          description TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(createActivityLogSQL, (err) => {
        if (err) {
          console.error('Error creating activity_log table:', err);
          reject(err);
          return;
        }
        console.log('✅ Created activity_log table');
        
        // Create indexes for better performance
        const index1SQL = convertSQLiteToMySQL(`CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)`);
        const index2SQL = convertSQLiteToMySQL(`CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id)`);
        const index3SQL = convertSQLiteToMySQL(`CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)`);
        
        db.run(index1SQL, () => {});
        db.run(index2SQL, () => {});
        db.run(index3SQL, () => {
          resolve();
        });
      });
    } else {
      console.log('✅ activity_log table already exists');
      resolve();
    }
  });
};
