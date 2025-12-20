import { db, convertSQLiteToMySQL } from './db';

export const migrateTicketsTable = (): Promise<void> => {
  return new Promise((resolve) => {
    console.log('🔄 Ensuring tickets table exists...');
    
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(255) UNIQUE NOT NULL,
        account_id INT,
        contact_id INT,
        department_id INT,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'open',
        assigned_to INT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        INDEX idx_tickets_account_id (account_id),
        INDEX idx_tickets_status (status),
        INDEX idx_tickets_assigned_to (assigned_to),
        INDEX idx_tickets_department_id (department_id)
      )
    `);
    
    db.run(createTableSQL, (createErr: any) => {
      if (createErr) {
        console.error('Error creating tickets table:', createErr);
        if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
          console.error('❌ Failed to create tickets table:', createErr.message);
        } else {
          console.log('✅ tickets table already exists');
        }
      } else {
        console.log('✅ tickets table created or already exists');
      }
      
      // Create ticket_replies table
      const createRepliesTableSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS ticket_replies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ticket_id INT NOT NULL,
          user_id INT,
          message TEXT NOT NULL,
          is_internal INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_ticket_replies_ticket_id (ticket_id)
        )
      `);
      
      db.run(createRepliesTableSQL, (repliesErr: any) => {
        if (repliesErr) {
          console.error('Error creating ticket_replies table:', repliesErr);
          if (repliesErr.code !== 'ER_TABLE_EXISTS_ERROR' && !repliesErr.message.includes('already exists')) {
            console.warn('⚠️ Could not create ticket_replies table, continuing anyway:', repliesErr.message);
          } else {
            console.log('✅ ticket_replies table already exists');
          }
        } else {
          console.log('✅ ticket_replies table created or already exists');
        }
        resolve();
      });
    });
  });
};

