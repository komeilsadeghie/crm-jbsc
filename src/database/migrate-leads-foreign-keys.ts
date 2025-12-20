import { db, convertSQLiteToMySQL, getTableInfoCallback } from './db';

export const migrateLeadsForeignKeys = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if leads table exists
      getTableInfoCallback('leads', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Table doesn't exist, create it directly
          console.log('🔄 Creating leads table...');
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
              console.error('Error creating leads table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created leads table');
            resolve();
          });
          return;
        }

        // Table exists, check if we need to migrate foreign keys
        // For now, just log that table exists
        console.log('✅ Leads table already exists');
        resolve();
      });
    });
  });
};

