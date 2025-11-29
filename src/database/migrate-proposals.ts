import { db } from './db';

export const migrateProposalsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(proposals)`, [], (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Create proposals table
        db.run(`
          CREATE TABLE IF NOT EXISTS proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            contact_id INTEGER,
            deal_id INTEGER,
            proposal_number TEXT UNIQUE NOT NULL,
            subject TEXT NOT NULL,
            content TEXT NOT NULL,
            amount DECIMAL(10, 2),
            currency TEXT DEFAULT 'IRR',
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
            valid_until DATE,
            accepted_at DATETIME,
            declined_at DATETIME,
            accepted_by INTEGER,
            declined_by INTEGER,
            decline_reason TEXT,
            sent_at DATETIME,
            viewed_at DATETIME,
            view_count INTEGER DEFAULT 0,
            email_template_id INTEGER,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
            FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
            FOREIGN KEY (accepted_by) REFERENCES contacts(id) ON DELETE SET NULL,
            FOREIGN KEY (declined_by) REFERENCES contacts(id) ON DELETE SET NULL,
            FOREIGN KEY (email_template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating proposals table:', err);
            reject(err);
            return;
          }
          console.log('✅ Created proposals table');
        });

        // Create proposal items table
        db.run(`
          CREATE TABLE IF NOT EXISTS proposal_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proposal_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            description TEXT,
            quantity DECIMAL(10, 2) DEFAULT 1,
            unit_price DECIMAL(10, 2) NOT NULL,
            tax_rate DECIMAL(5, 2) DEFAULT 0,
            tax_amount DECIMAL(10, 2) DEFAULT 0,
            total_amount DECIMAL(10, 2) NOT NULL,
            position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Error creating proposal_items table:', err);
            reject(err);
            return;
          }
          console.log('✅ Created proposal_items table');
        });

        // Create proposal attachments table
        db.run(`
          CREATE TABLE IF NOT EXISTS proposal_attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proposal_id INTEGER NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            uploaded_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
            FOREIGN KEY (uploaded_by) REFERENCES users(id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating proposal_attachments table:', err);
            reject(err);
            return;
          }
          console.log('✅ Created proposal_attachments table');
          
          // Create indexes
          db.run(`CREATE INDEX IF NOT EXISTS idx_proposals_account_id ON proposals(account_id)`, () => {});
          db.run(`CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)`, () => {});
          db.run(`CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at)`, () => {
            resolve();
          });
        });
      } else {
        console.log('✅ proposals table already exists');
        resolve();
      }
    });
  });
};

