import { db, convertSQLiteToMySQL } from './db';

export const migrateTicketDepartmentsTable = (): Promise<void> => {
  return new Promise((resolve) => {
    console.log('🔄 Ensuring ticket_departments table exists...');
    
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS ticket_departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        description TEXT,
        is_active INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(createTableSQL, (createErr: any) => {
      if (createErr) {
        console.error('Error creating ticket_departments table:', createErr);
        if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
          console.error('❌ Failed to create ticket_departments table:', createErr.message);
        } else {
          console.log('✅ ticket_departments table already exists');
        }
      } else {
        console.log('✅ ticket_departments table created or already exists');
      }
      resolve();
    });
  });
};

