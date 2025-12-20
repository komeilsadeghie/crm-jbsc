import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create contacts table and add portal fields
export const migrateContactsPortal = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('contacts', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating contacts table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            whatsapp VARCHAR(50),
            role VARCHAR(100),
            opt_in INT DEFAULT 1,
            communication_preference VARCHAR(50),
            portal_enabled INT DEFAULT 0,
            portal_password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating contacts table:', createErr);
            reject(createErr);
            return;
          }
          console.log('✅ Created contacts table');
          resolve();
        });
        return;
      }

      // Table exists, add missing portal fields
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


