import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create accounts table
export const migrateAccountsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('accounts', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating accounts table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            industry VARCHAR(255),
            size VARCHAR(50),
            country VARCHAR(100),
            website VARCHAR(255),
            site_model VARCHAR(50),
            designer_id INT,
            service_package VARCHAR(255),
            acquisition_channel VARCHAR(255),
            lead_id INT,
            status VARCHAR(50) DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating accounts table:', createErr);
            // Don't reject - table might already exist or foreign keys might fail
            // Just log and continue
            if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
              console.warn('⚠️ Could not create accounts table, continuing anyway:', createErr.message);
            }
            resolve();
            return;
          }
          console.log('✅ Created accounts table');
          resolve();
        });
        return;
      }

      // Table exists, check for missing columns
      const columnNames = info.map((col: any) => col.name);
      const columnsToAdd = [
        { name: 'site_model', type: 'VARCHAR(50)' },
        { name: 'designer_id', type: 'INT' },
        { name: 'service_package', type: 'VARCHAR(255)' },
        { name: 'acquisition_channel', type: 'VARCHAR(255)' },
      ];

      const missingColumns = columnsToAdd.filter(col => !columnNames.includes(col.name));
      
      if (missingColumns.length === 0) {
        console.log('✅ accounts table is up to date');
        resolve();
        return;
      }

      // Add missing columns
      let addColumnIndex = 0;
      const addNextColumn = () => {
        if (addColumnIndex >= missingColumns.length) {
          console.log('✅ accounts table migration completed');
          resolve();
          return;
        }

        const column = missingColumns[addColumnIndex];
        const addColumnSQL = convertSQLiteToMySQL(
          `ALTER TABLE accounts ADD COLUMN ${column.name} ${column.type}`
        );

        db.run(addColumnSQL, (addErr: any) => {
          if (addErr) {
            // Ignore "duplicate column" errors
            if (addErr.code !== 'ER_DUP_FIELDNAME' && !addErr.message.includes('duplicate column')) {
              console.warn(`⚠️ Could not add column ${column.name} to accounts table:`, addErr.message);
            }
          } else {
            console.log(`✅ Added column ${column.name} to accounts table`);
          }
          addColumnIndex++;
          addNextColumn();
        });
      };

      addNextColumn();
    });
  });
};

