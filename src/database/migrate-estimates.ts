import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create estimates table and add new columns if they don't exist
export const migrateEstimatesTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('estimates', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating estimates table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS estimates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            deal_id INT,
            account_id INT,
            estimate_number VARCHAR(255) UNIQUE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'IRR',
            status VARCHAR(50) DEFAULT 'draft',
            valid_until DATE,
            notes TEXT,
            contract_type TEXT,
            domain_name TEXT,
            hosting_type TEXT,
            hosting_duration INT,
            ssl_included INT DEFAULT 0,
            maintenance_months INT,
            seo_package TEXT,
            site_pages INT,
            site_languages TEXT,
            payment_terms TEXT,
            delivery_days INT,
            warranty_months INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating estimates table:', createErr);
            reject(createErr);
            return;
          }
          console.log('✅ Created estimates table');
          resolve();
        });
        return;
      }

      // Table exists, add missing columns
      const columnNames = info.map((col: any) => col.name);
      const columnsToAdd = [
        { name: 'contract_type', type: 'TEXT' },
        { name: 'domain_name', type: 'TEXT' },
        { name: 'hosting_type', type: 'TEXT' },
        { name: 'hosting_duration', type: 'INTEGER' },
        { name: 'ssl_included', type: 'INTEGER DEFAULT 0' },
        { name: 'maintenance_months', type: 'INTEGER' },
        { name: 'seo_package', type: 'TEXT' },
        { name: 'site_pages', type: 'INTEGER' },
        { name: 'site_languages', type: 'TEXT' },
        { name: 'payment_terms', type: 'TEXT' },
        { name: 'delivery_days', type: 'INTEGER' },
        { name: 'warranty_months', type: 'INTEGER' },
      ];

      const missingColumns = columnsToAdd.filter(col => !columnNames.includes(col.name));
      
      if (missingColumns.length === 0) {
        console.log('✓ All estimate columns exist');
        resolve();
        return;
      }

      let completed = 0;
      const total = missingColumns.length;

      missingColumns.forEach((column) => {
        db.run(
          `ALTER TABLE estimates ADD COLUMN ${column.name} ${column.type}`,
          (alterErr: any) => {
            if (alterErr) {
              // Column might already exist or other error
              if (!alterErr.message.includes('duplicate column') && !alterErr.message.includes('Duplicate column name')) {
                console.log(`⚠️  Could not add column ${column.name}:`, alterErr.message);
              }
            } else {
              console.log(`✅ Added column: ${column.name}`);
            }
            
            completed++;
            if (completed === total) {
              resolve();
            }
          }
        );
      });
    });
  });
};

