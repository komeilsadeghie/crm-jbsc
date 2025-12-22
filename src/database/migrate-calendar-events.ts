import { dbRun, convertSQLiteToMySQL } from './db';

export const migrateCalendarEventsTable = async (): Promise<void> => {
  try {
    const createCalendarEventsSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_at DATETIME NOT NULL,
        end_at DATETIME,
        relation_type VARCHAR(50),
        relation_id INT,
        customer_id INT,
        color VARCHAR(50) DEFAULT '#6366F1',
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_calendar_events_start_at (start_at),
        INDEX idx_calendar_events_relation (relation_type, relation_id),
        INDEX idx_calendar_events_customer_id (customer_id)
      )
    `);

    await dbRun(createCalendarEventsSQL, []);
    console.log('✅ Created calendar_events table');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
      console.log('ℹ️  calendar_events table already exists');
    } else {
      console.error('Error creating calendar_events table:', error);
      throw error;
    }
  }
};

