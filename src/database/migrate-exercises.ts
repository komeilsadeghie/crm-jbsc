import { dbRun, convertSQLiteToMySQL } from './db';

export const migrateExercisesTable = async (): Promise<void> => {
  try {
    const createExercisesSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        goal_id INT,
        customer_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructions TEXT,
        due_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        completion_date DATE,
        notes TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_exercises_goal_id (goal_id),
        INDEX idx_exercises_customer_id (customer_id),
        INDEX idx_exercises_due_date (due_date),
        INDEX idx_exercises_status (status)
      )
    `);

    await dbRun(createExercisesSQL, []);
    console.log('✅ Created exercises table');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
      console.log('ℹ️  exercises table already exists');
    } else {
      console.error('Error creating exercises table:', error);
      throw error;
    }
  }
};

