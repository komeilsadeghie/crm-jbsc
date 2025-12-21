import { db, convertSQLiteToMySQL } from './db';

export const migrateNotificationsTable = (): Promise<void> => {
  return new Promise((resolve) => {
    console.log('🔄 Ensuring notifications table exists...');
    
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        entity_type VARCHAR(50),
        entity_id INT,
        is_read INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notifications_user_id (user_id),
        INDEX idx_notifications_is_read (is_read),
        INDEX idx_notifications_created_at (created_at)
      )
    `);
    
    db.run(createTableSQL, (createErr: any) => {
      if (createErr) {
        console.error('Error creating notifications table:', createErr);
        if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
          console.error('❌ Failed to create notifications table:', createErr.message);
        } else {
          console.log('✅ notifications table already exists');
        }
      } else {
        console.log('✅ notifications table created or already exists');
      }
      resolve();
    });
  });
};

