import { db } from './db';

export const migrateLeadsForeignKeys = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // SQLite doesn't support ALTER TABLE to modify foreign key constraints
      // We need to recreate the table with the new constraints
      
      // Step 1: Create new table with updated foreign keys
      db.run(`
        CREATE TABLE IF NOT EXISTS leads_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT,
          email TEXT,
          phone TEXT,
          whatsapp TEXT,
          company_name TEXT,
          source TEXT,
          tags TEXT,
          lead_score INTEGER DEFAULT 0,
          status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'disqualified', 'converted')),
          kanban_stage TEXT DEFAULT 'new',
          position INTEGER DEFAULT 0,
          industry TEXT,
          budget_range TEXT,
          decision_maker_role TEXT,
          notes TEXT,
          assigned_to INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `, (err: any) => {
        if (err) {
          console.error('Error creating new leads table:', err);
          reject(err);
          return;
        }

        // Step 2: Copy data from old table to new table
        db.run(`
          INSERT INTO leads_new 
          SELECT * FROM leads
        `, (err: any) => {
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
            db.run('ALTER TABLE leads_new RENAME TO leads', (err: any) => {
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

