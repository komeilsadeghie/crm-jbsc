import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create deals table
export const migrateDealsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('deals', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating deals table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS deals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            account_id INT,
            contact_id INT,
            designer_id INT,
            title VARCHAR(255) NOT NULL,
            stage VARCHAR(50) DEFAULT 'discovery',
            budget DECIMAL(10, 2),
            probability INT DEFAULT 0,
            services TEXT,
            site_model VARCHAR(50),
            start_date DATE,
            expected_delivery_date DATE,
            actual_delivery_date DATE,
            notes TEXT,
            created_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating deals table:', createErr);
            // Don't reject - table might already exist or foreign keys might fail
            if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
              console.error('❌ Failed to create deals table:', createErr.message);
              // Still resolve to continue, but log the error
            } else {
              console.log('✅ Deals table already exists or created');
            }
            resolve();
            return;
          }
          console.log('✅ Created deals table');
          resolve();
        });
        return;
      }

      // Table exists, check for missing columns
      const columnNames = info.map((col: any) => col.name);
      const columnsToAdd = [
        { name: 'designer_id', type: 'INT' },
        { name: 'site_model', type: 'VARCHAR(50)' },
      ];

      const missingColumns = columnsToAdd.filter(col => !columnNames.includes(col.name));
      
      if (missingColumns.length === 0) {
        console.log('✅ deals table is up to date');
        resolve();
        return;
      }

      // Add missing columns
      let addColumnIndex = 0;
      const addNextColumn = () => {
        if (addColumnIndex >= missingColumns.length) {
          console.log('✅ deals table migration completed');
          resolve();
          return;
        }

        const column = missingColumns[addColumnIndex];
        const addColumnSQL = convertSQLiteToMySQL(
          `ALTER TABLE deals ADD COLUMN ${column.name} ${column.type}`
        );

        db.run(addColumnSQL, (addErr: any) => {
          if (addErr) {
            // Ignore "duplicate column" errors
            if (addErr.code !== 'ER_DUP_FIELDNAME' && !addErr.message.includes('duplicate column')) {
              console.warn(`⚠️ Could not add column ${column.name} to deals table:`, addErr.message);
            }
          } else {
            console.log(`✅ Added column ${column.name} to deals table`);
          }
          addColumnIndex++;
          addNextColumn();
        });
      };

      addNextColumn();
    });
  });
};

