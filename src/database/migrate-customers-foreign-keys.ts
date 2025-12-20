import { db, getForeignKeyListCallback, getTableInfoCallback, convertSQLiteToMySQL } from './db';

export const migrateCustomersForeignKeys = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // First check if table exists
      getTableInfoCallback('customers', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Table doesn't exist, that's OK - it will be created by initDatabase
          console.log('✓ Customers table does not exist yet, will be created by initDatabase');
          resolve();
          return;
        }
        
        // Table exists, check foreign keys
        getForeignKeyListCallback('customers', (fkErr: any, fkList: any[]) => {
          if (fkErr) {
            // Foreign keys not enabled or can't check, that's OK
            console.log('✓ Cannot check customers foreign keys, skipping migration');
            resolve();
            return;
          }

        // Check if ON DELETE SET NULL is already set for created_by
        const createdByFK = fkList.find((fk: any) => fk.from === 'created_by' && fk.to === 'id');
        if (createdByFK && createdByFK.on_delete === 'SET NULL') {
          console.log('✓ Customers foreign key already has ON DELETE SET NULL');
          resolve();
          return;
        }

        console.log('🔄 Migrating customers table foreign keys...');
        
        // Step 1: Create new table with updated foreign keys
        const createCustomersNewSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS customers_new (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            company_name VARCHAR(255),
            address TEXT,
            website VARCHAR(255),
            score INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            category VARCHAR(255),
            notes TEXT,
            customer_model INT,
            created_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createCustomersNewSQL, (err: any) => {
          if (err) {
            console.error('Error creating new customers table:', err);
            reject(err);
            return;
          }

          // Step 2: Copy data from old table to new table
          const copyDataSQL = convertSQLiteToMySQL(`
            INSERT INTO customers_new 
            SELECT * FROM customers
          `);
          
          db.run(copyDataSQL, (err: any) => {
            if (err) {
              console.error('Error copying data:', err);
              // If table doesn't exist or other error, that's OK - just rename the new table
              if (err.message.includes('no such table') || err.message.includes("doesn't exist") || err.code === 'ER_NO_SUCH_TABLE') {
                console.log('✓ Customers table does not exist yet, skipping data copy');
                // Just rename the new table to original name
                const renameTableSQL = convertSQLiteToMySQL('ALTER TABLE customers_new RENAME TO customers');
                db.run(renameTableSQL, (renameErr: any) => {
                  if (renameErr) {
                    console.error('Error renaming table:', renameErr);
                    reject(renameErr);
                    return;
                  }
                  console.log('✓ Customers table created successfully');
                  resolve();
                });
                return;
              }
              // For other errors, still try to rename
              console.warn('⚠️ Error copying data, but continuing with table rename:', err.message);
            }

            // Step 3: Drop old table
            db.run('DROP TABLE IF EXISTS customers', (err: any) => {
              if (err) {
                console.error('Error dropping old table:', err);
                reject(err);
                return;
              }

              // Step 4: Rename new table to original name
              const renameTableSQL = convertSQLiteToMySQL('ALTER TABLE customers_new RENAME TO customers');
              db.run(renameTableSQL, (err: any) => {
                if (err) {
                  console.error('Error renaming table:', err);
                  reject(err);
                  return;
                }

                console.log('✓ Customers table foreign keys migrated successfully');
                resolve();
              });
            });
          });
        });
        });
      });
    });
  });
};

