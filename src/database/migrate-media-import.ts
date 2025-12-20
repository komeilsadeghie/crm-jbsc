import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

export const migrateMediaImportFields = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Add code, designer, and unique_id fields to customers table
    getTableInfoCallback('customers', (err: any, columns: any[]) => {
      if (err) {
        console.error('Error checking customers table:', err);
        reject(err);
        return;
      }

      const columnNames = columns.map((col: any) => col.name);
      const columnsToAdd = [
        { name: 'code', type: 'INTEGER' },
        { name: 'designer', type: 'TEXT' },
        { name: 'unique_id', type: 'TEXT UNIQUE' },
      ];

      const missingColumns = columnsToAdd.filter(col => !columnNames.includes(col.name));

      if (missingColumns.length === 0) {
        console.log('✓ All customer columns exist');
        // Still need to generate unique_id for existing customers
        generateUniqueIdsForExistingCustomers().then(() => {
          checkProjectsSettlements(resolve, reject);
        }).catch(reject);
      } else {
        let completed = 0;
        const total = missingColumns.length;

        missingColumns.forEach((col) => {
          // SQLite doesn't support UNIQUE constraint in ALTER TABLE ADD COLUMN
          // So we add it without UNIQUE first, then create a unique index
          let sql = `ALTER TABLE customers ADD COLUMN ${col.name}`;
          if (col.name === 'unique_id') {
            // Add as TEXT without UNIQUE constraint
            sql = `ALTER TABLE customers ADD COLUMN ${col.name} TEXT`;
          } else {
            sql = `ALTER TABLE customers ADD COLUMN ${col.name} ${col.type}`;
          }
          
          db.run(sql, (err: any) => {
            if (err) {
              console.error(`Error adding column ${col.name}:`, err);
              // Continue even if there's an error (column might already exist)
            } else {
              console.log(`✓ Added column ${col.name} to customers table`);
            }
            
            // Create unique index for unique_id
            if (col.name === 'unique_id') {
              db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_unique_id ON customers(unique_id)`, (indexErr: any) => {
                if (indexErr) {
                  console.warn(`⚠️ Could not create unique index for ${col.name}:`, indexErr.message);
                } else {
                  console.log(`✓ Created unique index for ${col.name}`);
                }
              });
            }
            
            completed++;
            if (completed === total) {
              console.log('✓ Customer columns migration completed');
              // Generate unique_id for existing customers
              generateUniqueIdsForExistingCustomers().then(() => {
                checkProjectsSettlements(resolve, reject);
              }).catch(reject);
            }
          });
        });
      }

    });
  });
};

// Generate unique_id for existing customers
const generateUniqueIdsForExistingCustomers = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, name, phone, email FROM customers WHERE unique_id IS NULL OR unique_id = ''`, [], (err: any, customers: any[]) => {
      if (err) {
        console.error('Error fetching customers:', err);
        reject(err);
        return;
      }

      if (!customers || customers.length === 0) {
        console.log('✓ All customers already have unique_id');
        resolve();
        return;
      }

      console.log(`Generating unique_id for ${customers.length} customers...`);
      let completed = 0;
      const total = customers.length;

      // Use a Map to track unique_ids and ensure uniqueness
      const usedIds = new Map<string, number>();
      
      customers.forEach((customer: any) => {
        // Generate unique_id based on name + phone + email (or id if others are empty)
        const namePart = (customer.name || '').trim().replace(/\s+/g, '_').toLowerCase();
        const phonePart = (customer.phone || '').trim().replace(/\D/g, '');
        const emailPart = (customer.email || '').trim().toLowerCase().split('@')[0];
        
        let uniqueId = '';
        if (namePart && phonePart) {
          uniqueId = `${namePart}_${phonePart}`;
        } else if (namePart && emailPart) {
          uniqueId = `${namePart}_${emailPart}`;
        } else if (namePart) {
          uniqueId = `${namePart}_${customer.id}`;
        } else {
          uniqueId = `customer_${customer.id}`;
        }

        // Ensure uniqueness by appending id if needed
        if (usedIds.has(uniqueId)) {
          const count = usedIds.get(uniqueId)! + 1;
          usedIds.set(uniqueId, count);
          uniqueId = `${uniqueId}_${customer.id}`;
        } else {
          usedIds.set(uniqueId, 1);
        }

        db.run(
          `UPDATE customers SET unique_id = ? WHERE id = ?`,
          [uniqueId, customer.id],
          (updateErr: any) => {
            if (updateErr) {
              console.error(`Error updating unique_id for customer ${customer.id}:`, updateErr);
              // If unique constraint error, try with customer id appended
              if (updateErr.message && updateErr.message.includes('UNIQUE')) {
                const fallbackId = `${uniqueId}_${customer.id}`;
                db.run(
                  `UPDATE customers SET unique_id = ? WHERE id = ?`,
                  [fallbackId, customer.id],
                  (fallbackErr: any) => {
                    if (fallbackErr) {
                      console.error(`Error updating unique_id with fallback for customer ${customer.id}:`, fallbackErr);
                    }
                    completed++;
                    if (completed === total) {
                      console.log('✓ Generated unique_id for all existing customers');
                      resolve();
                    }
                  }
                );
                return;
              }
            }
            completed++;
            if (completed === total) {
              console.log('✓ Generated unique_id for all existing customers');
              resolve();
            }
          }
        );
      });
    });
  });
};

// Check and add settlements to projects
const checkProjectsSettlements = (resolve: () => void, reject: (err: any) => void) => {
  getTableInfoCallback('projects', (err: any, projectColumns: any[]) => {
    if (err || !projectColumns || projectColumns.length === 0) {
      // Table doesn't exist, create it first
      console.log('🔄 Creating projects table...');
      const createTableSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          account_id INT,
          deal_id INT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'planning',
          start_date DATE,
          end_date DATE,
          budget DECIMAL(10, 2),
          manager_id INT,
          settlements TEXT,
          payment_stage_1 DECIMAL(10, 2),
          payment_stage_1_date DATE,
          payment_stage_2 DECIMAL(10, 2),
          payment_stage_2_date DATE,
          payment_stage_3 DECIMAL(10, 2),
          payment_stage_3_date DATE,
          payment_stage_4 DECIMAL(10, 2),
          payment_stage_4_date DATE,
          settlement_kamil DECIMAL(10, 2),
          settlement_asdan DECIMAL(10, 2),
          settlement_soleimani DECIMAL(10, 2),
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      
      db.run(createTableSQL, (createErr: any) => {
        if (createErr) {
          console.error('Error creating projects table:', createErr);
          reject(createErr);
          return;
        }
        console.log('✅ Created projects table');
        resolve();
      });
      return;
    }

    // Table exists, add settlements column if it doesn't exist
    const projectColumnNames = projectColumns.map((col: any) => col.name);

    if (!projectColumnNames.includes('settlements')) {
      db.run(`ALTER TABLE projects ADD COLUMN settlements TEXT`, (err: any) => {
        if (err) {
          if (!err.message.includes('duplicate column') && !err.message.includes('Duplicate column name')) {
            console.error('Error adding settlements column:', err);
            reject(err);
          } else {
            console.log('✓ Projects settlements column already exists');
            resolve();
          }
        } else {
          console.log('✓ Added settlements column to projects table');
          resolve();
        }
      });
    } else {
      console.log('✓ Projects settlements column already exists');
      resolve();
    }
  });
};

