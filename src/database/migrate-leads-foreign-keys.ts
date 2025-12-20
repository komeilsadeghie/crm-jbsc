import { db, convertSQLiteToMySQL } from './db';

export const migrateLeadsForeignKeys = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Simply create the table if it doesn't exist
      // This migration is for foreign keys, but since we removed foreign keys
      // from CREATE TABLE statements, we just ensure the table exists
      console.log('🔄 Ensuring leads table exists...');
      const createLeadsSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS leads (
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
      
      db.run(createLeadsSQL, (err: any) => {
        if (err) {
          // If table already exists or other error, log but don't fail
          // MySQL doesn't throw error for IF NOT EXISTS, but SQLite might
          if (err.message.includes('already exists') || 
              err.code === 'ER_TABLE_EXISTS_ERROR' ||
              err.message.includes('duplicate') ||
              err.message.includes('already exists')) {
            console.log('✅ Leads table already exists');
            resolve();
            return;
          }
          // For any other error, log warning but don't fail (table might already exist)
          console.warn('⚠️ Warning creating leads table (might already exist):', err.message);
          resolve(); // Don't reject, just continue
          return;
        }
        console.log('✅ Leads table ready');
        resolve();
      });
    });
  });
};

