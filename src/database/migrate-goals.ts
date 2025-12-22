import { dbRun, convertSQLiteToMySQL } from './db';

export const migrateGoalsTable = async (): Promise<void> => {
  try {
    const createGoalsSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'kpi',
        target_value DECIMAL(10, 2),
        current_value DECIMAL(10, 2) DEFAULT 0,
        unit VARCHAR(50),
        deadline DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        okr_id INT,
        is_kr TINYINT(1) DEFAULT 0,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_goals_customer_id (customer_id),
        INDEX idx_goals_deadline (deadline),
        INDEX idx_goals_status (status),
        INDEX idx_goals_okr_id (okr_id)
      )
    `);

    await dbRun(createGoalsSQL, []);
    console.log('✅ Created goals table');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
      console.log('ℹ️  goals table already exists');
    } else {
      console.error('Error creating goals table:', error);
      throw error;
    }
  }
};

