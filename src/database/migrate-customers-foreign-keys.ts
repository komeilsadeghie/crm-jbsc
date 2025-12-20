import { db, getForeignKeyListCallback, convertSQLiteToMySQL } from './db';

export const migrateCustomersForeignKeys = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // SQLite doesn't support ALTER TABLE to modify foreign key constraints
      // We need to check if the table exists and if it needs migration
      
      getForeignKeyListCallback('customers', (err: any, fkList: any[]) => {
        if (err) {
          // Table might not exist yet, that's OK
          console.log('✓ Customers table does not exist yet or foreign keys not enabled, skipping migration');
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
              // If table doesn't exist or is empty, that's OK
              if (err.message.includes('no such table')) {
                console.log('✓ Customers table does not exist yet, skipping migration');
                resolve();
                return;
              }
              reject(err);
              return;
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
};

