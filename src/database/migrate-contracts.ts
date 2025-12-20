import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create contracts table and add new columns if they don't exist
export const migrateContractsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('contracts', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating contracts table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS contracts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT,
            contract_number VARCHAR(255) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            contract_type VARCHAR(50),
            start_date DATE,
            end_date DATE,
            value DECIMAL(10, 2),
            currency VARCHAR(10) DEFAULT 'IRR',
            status VARCHAR(50) DEFAULT 'draft',
            auto_renew INT DEFAULT 0,
            renewal_notice_days INT DEFAULT 30,
            signed_date DATE,
            signed_by VARCHAR(255),
            file_path TEXT,
            created_by INT,
            domain_name TEXT,
            hosting_type TEXT,
            hosting_duration INT,
            ssl_certificate INT DEFAULT 0,
            support_duration INT,
            seo_package TEXT,
            website_pages INT,
            website_languages TEXT,
            payment_terms TEXT,
            delivery_days INT,
            warranty_months INT,
            project_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating contracts table:', createErr);
            reject(createErr);
            return;
          }
          console.log('✅ Created contracts table');
          resolve();
        });
        return;
      }

      const columnNames = info.map((col: any) => col.name);
      const columnsToAdd = [
        { name: 'domain_name', type: 'TEXT' },
        { name: 'hosting_type', type: 'TEXT' },
        { name: 'hosting_duration', type: 'INTEGER' },
        { name: 'ssl_certificate', type: 'INTEGER DEFAULT 0' },
        { name: 'support_duration', type: 'INTEGER' },
        { name: 'seo_package', type: 'TEXT' },
        { name: 'website_pages', type: 'INTEGER' },
        { name: 'website_languages', type: 'TEXT' },
        { name: 'payment_terms', type: 'TEXT' },
        { name: 'delivery_days', type: 'INTEGER' },
        { name: 'warranty_months', type: 'INTEGER' },
        { name: 'project_id', type: 'INTEGER' },
      ];

      const missingColumns = columnsToAdd.filter(col => !columnNames.includes(col.name));
      
      if (missingColumns.length === 0) {
        console.log('✓ All contract columns exist');
        resolve();
        return;
      }

      let completed = 0;
      const total = missingColumns.length;

      if (total === 0) {
        resolve();
        return;
      }

      missingColumns.forEach((column) => {
        db.run(
          `ALTER TABLE contracts ADD COLUMN ${column.name} ${column.type}`,
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

