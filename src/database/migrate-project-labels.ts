import { db, convertSQLiteToMySQL } from './db';

export async function migrateProjectLabels() {
  return new Promise<void>((resolve, reject) => {
    // Create project_labels table
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS project_labels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        label_name VARCHAR(255) NOT NULL,
        label_color VARCHAR(20) DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(createTableSQL, (err) => {
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

