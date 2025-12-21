import { db, convertSQLiteToMySQL } from './db';

export const migrateInteractionsTable = (): Promise<void> => {
  return new Promise((resolve) => {
    console.log('🔄 Ensuring interactions table exists...');
    
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS interactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        description TEXT,
        amount DECIMAL(10, 2),
        deposit_date DATE,
        deposit_stage VARCHAR(50),
        website_model VARCHAR(50),
        website_designer VARCHAR(255),
        services TEXT,
        additional_notes TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_interactions_customer_id (customer_id),
        INDEX idx_interactions_type (type),
        INDEX idx_interactions_created_at (created_at)
      )
    `);
    
    db.run(createTableSQL, (createErr: any) => {
      if (createErr) {
        console.error('Error creating interactions table:', createErr);
        if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
          console.error('❌ Failed to create interactions table:', createErr.message);
        } else {
          console.log('✅ interactions table already exists');
        }
      } else {
        console.log('✅ interactions table created or already exists');
      }
      resolve();
    });
  });
};

