import { db, getTableInfoCallback } from './db';

// Migration script to add portal fields to contacts table
export const migrateContactsPortal = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('contacts', (err: any, info: any[]) => {
      if (err) {
        console.log('⚠️  Contacts table not found, will be created by initDatabase');
        resolve();
        return;
      }

      const columnNames = info.map((col: any) => col.name);
      const columnsToAdd = [
        { name: 'portal_enabled', type: 'INTEGER DEFAULT 0' },
        { name: 'portal_password', type: 'TEXT' },
      ];

      const missingColumns = columnsToAdd.filter(col => !columnNames.includes(col.name));
      
      if (missingColumns.length === 0) {
        console.log('✓ All contact portal columns exist');
        resolve();
        return;
      }

      let completed = 0;
      const total = missingColumns.length;

      missingColumns.forEach((column) => {
        db.run(
          `ALTER TABLE contacts ADD COLUMN ${column.name} ${column.type}`,
          (alterErr: any) => {
            if (alterErr) {
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


