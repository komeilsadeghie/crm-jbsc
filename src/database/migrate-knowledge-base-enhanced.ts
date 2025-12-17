import { db } from './db';

export const migrateKnowledgeBaseEnhanced = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Add columns to kb_articles for attachments
      db.run(`
        ALTER TABLE kb_articles 
        ADD COLUMN attachments TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding attachments column:', err);
        } else if (!err) {
          console.log('✅ Added attachments column to kb_articles');
        }
      });

      // Create kb_sops table for SOP definitions
      db.run(`
        CREATE TABLE IF NOT EXISTS kb_sops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          department TEXT,
          unit TEXT,
          person_id INTEGER,
          content TEXT NOT NULL,
          attachments TEXT,
          tags TEXT,
          version INTEGER DEFAULT 1,
          is_published INTEGER DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (person_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating kb_sops table:', err);
          reject(err);
        } else {
          console.log('✅ Created kb_sops table');
          resolve();
        }
      });
    });
  });
};

