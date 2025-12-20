import { db, getTableInfoCallback } from './db';

// Migration script to add new columns to estimates table if they don't exist
export const migrateEstimatesTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('estimates', (err: any, info: any[]) => {
      if (err) {
        // Table might not exist yet, that's OK - initDatabase will create it
        console.log('⚠️  Estimates table not found, will be created by initDatabase');
        resolve();
        return;
      }

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

      if (total === 0) {
        resolve();
        return;
      }

      missingColumns.forEach((column) => {
        db.run(
          `ALTER TABLE estimates ADD COLUMN ${column.name} ${column.type}`,
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

