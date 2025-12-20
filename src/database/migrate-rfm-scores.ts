import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create rfm_scores table
export const migrateRfmScoresTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('rfm_scores', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating rfm_scores table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS rfm_scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT NOT NULL UNIQUE,
            recency_score INT DEFAULT 0,
            frequency_score INT DEFAULT 0,
            monetary_score INT DEFAULT 0,
            segment VARCHAR(50),
            calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating rfm_scores table:', createErr);
            if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
              console.warn('⚠️ Could not create rfm_scores table, continuing anyway:', createErr.message);
            }
            resolve();
            return;
          }
          console.log('✅ Created rfm_scores table');
          resolve();
        });
        return;
      }

      console.log('✅ rfm_scores table already exists');
      resolve();
    });
  });
};

