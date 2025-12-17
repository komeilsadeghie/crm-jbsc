import { db } from './db';

export async function migrateProjectLabels() {
  return new Promise<void>((resolve, reject) => {
    // Create project_labels table
    db.run(`
      CREATE TABLE IF NOT EXISTS project_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        label_name TEXT NOT NULL,
        label_color TEXT DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating project_labels table:', err);
        reject(err);
      } else {
        console.log('✅ project_labels table created/migrated successfully');
        resolve();
      }
    });
  });
}

