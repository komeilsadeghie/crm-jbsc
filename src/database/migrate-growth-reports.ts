import { dbRun, convertSQLiteToMySQL } from './db';

export const migrateGrowthReportsTable = async (): Promise<void> => {
  try {
    const createGrowthReportsSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS growth_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        report_date DATE NOT NULL,
        metrics JSON,
        achievements TEXT,
        challenges TEXT,
        next_steps TEXT,
        overall_score DECIMAL(5, 2),
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_growth_reports_customer_id (customer_id),
        INDEX idx_growth_reports_report_date (report_date)
      )
    `);

    await dbRun(createGrowthReportsSQL, []);
    console.log('✅ Created growth_reports table');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
      console.log('ℹ️  growth_reports table already exists');
    } else {
      console.error('Error creating growth_reports table:', error);
      throw error;
    }
  }
};

