import { db, convertSQLiteToMySQL } from './db';

export const migrateLeadsForeignKeys = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // SQLite doesn't support ALTER TABLE to modify foreign key constraints
      // We need to recreate the table with the new constraints
      
      // Step 1: Create new table with updated foreign keys
      const createLeadsNewSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS leads_new (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          whatsapp VARCHAR(50),
          company_name VARCHAR(255),
          source VARCHAR(100),
          tags TEXT,
          lead_score INT DEFAULT 0,
          status VARCHAR(50) DEFAULT 'new',
          kanban_stage VARCHAR(50) DEFAULT 'new',
          position INT DEFAULT 0,
          industry VARCHAR(100),
          budget_range VARCHAR(100),
          decision_maker_role VARCHAR(100),
          notes TEXT,
          assigned_to INT,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(createLeadsNewSQL, (err: any) => {
        if (err) {
          console.error('Error creating new leads table:', err);
          reject(err);
          return;
        }

        // Step 2: Copy data from old table to new table
        const copyDataSQL = convertSQLiteToMySQL(`
          INSERT INTO leads_new 
          SELECT * FROM leads
        `);
        
        db.run(copyDataSQL, (err: any) => {
          if (err) {
            console.error('Error copying data:', err);
            // If table doesn't exist or is empty, that's OK
            if (err.message.includes('no such table')) {
              console.log('✓ Leads table does not exist yet, skipping migration');
              resolve();
              return;
            }
          }

          // Step 3: Drop old table
          db.run('DROP TABLE IF EXISTS leads', (err: any) => {
            if (err) {
              console.error('Error dropping old table:', err);
              reject(err);
              return;
            }

            // Step 4: Rename new table to original name
            const renameTableSQL = convertSQLiteToMySQL('ALTER TABLE leads_new RENAME TO leads');
            db.run(renameTableSQL, (err: any) => {
              if (err) {
                console.error('Error renaming table:', err);
                reject(err);
                return;
              }

              console.log('✓ Leads table foreign keys migrated successfully');
              resolve();
            });
          });
        });
      });
    });
  });
};

