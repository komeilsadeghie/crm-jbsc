import { db, getForeignKeyListCallback } from './db';

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
        db.run(`
          CREATE TABLE IF NOT EXISTS customers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('company', 'individual', 'export', 'import', 'coaching')),
            email TEXT,
            phone TEXT,
            company_name TEXT,
            address TEXT,
            website TEXT,
            score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'lead', 'customer', 'partner')),
            category TEXT,
            notes TEXT,
            customer_model INTEGER,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          )
        `, (err: any) => {
          if (err) {
            console.error('Error creating new customers table:', err);
            reject(err);
            return;
          }

          // Step 2: Copy data from old table to new table
          db.run(`
            INSERT INTO customers_new 
            SELECT * FROM customers
          `, (err: any) => {
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
              db.run('ALTER TABLE customers_new RENAME TO customers', (err: any) => {
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

