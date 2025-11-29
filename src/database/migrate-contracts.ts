import { db } from './db';

// Migration script to add new columns to contracts table if they don't exist
export const migrateContractsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(contracts)`, [], (err: any, info: any[]) => {
      if (err) {
        // Table might not exist yet, that's OK - initDatabase will create it
        console.log('⚠️  Contracts table not found, will be created by initDatabase');
        resolve();
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
              console.log(`⚠️  Could not add column ${column.name}:`, alterErr.message);
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

