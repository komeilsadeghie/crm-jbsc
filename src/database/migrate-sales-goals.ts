import { dbRun, convertSQLiteToMySQL } from './db';

export const migrateSalesGoalsTable = async (): Promise<void> => {
  try {
    const createSalesGoalsSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS sales_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        period_type VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        target_amount DECIMAL(15, 2) NOT NULL,
        current_amount DECIMAL(15, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'IRR',
        goal_type VARCHAR(50) DEFAULT 'revenue',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_sales_goals_user_id (user_id),
        INDEX idx_sales_goals_period (period_start, period_end),
        INDEX idx_sales_goals_period_type (period_type)
      )
    `);

    await dbRun(createSalesGoalsSQL, []);
    console.log('✅ Created sales_goals table');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
      console.log('ℹ️  sales_goals table already exists');
    } else {
      console.error('Error creating sales_goals table:', error);
      throw error;
    }
  }
};

