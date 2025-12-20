import { db, isMySQL, convertSQLiteToMySQL } from './db';

export const migrateTaskKanbanColumnsTable = (): Promise<void> => {
  return new Promise((resolve) => {
    // Always try to create table using IF NOT EXISTS (safer approach)
    console.log('🔄 Ensuring task_kanban_columns table exists...');
    
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS task_kanban_columns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        column_id VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT '#E5E7EB',
        position INT DEFAULT 0,
        is_active INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(createTableSQL, (createErr: any) => {
      if (createErr) {
        console.error('Error creating task_kanban_columns table:', createErr);
        if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
          console.error('❌ Failed to create task_kanban_columns table:', createErr.message);
        } else {
          console.log('✅ task_kanban_columns table already exists');
        }
      } else {
        console.log('✅ task_kanban_columns table created or already exists');
      }
      
      // Try to create default columns
      createDefaultColumns().then(() => {
        resolve();
      }).catch((err) => {
        console.warn('⚠️ Could not create default columns, continuing anyway:', err.message);
        resolve(); // Don't fail migration if default columns fail
      });
    });
  });
};

const createDefaultColumns = (): Promise<void> => {
  return new Promise((resolve) => {
    // Check if default columns exist
    db.get('SELECT COUNT(*) as count FROM task_kanban_columns', [], (err: any, row: any) => {
      if (err) {
        console.warn('Could not check default columns, skipping:', err.message);
        resolve();
        return;
      }
      
      if (row && row.count === 0) {
        // Create default columns
        const defaultColumns = [
          { column_id: 'todo', title: 'انجام نشده', color: '#FEE2E2', position: 0 }, // red
          { column_id: 'in_progress', title: 'در حال انجام', color: '#DBEAFE', position: 1 }, // blue
          { column_id: 'review', title: 'در حال بررسی', color: '#FEF3C7', position: 2 }, // yellow
          { column_id: 'done', title: 'انجام شده', color: '#D1FAE5', position: 3 }, // green
        ];

        let completed = 0;
        const total = defaultColumns.length;

        defaultColumns.forEach((col) => {
          db.run(
            `INSERT IGNORE INTO task_kanban_columns (column_id, title, color, position, is_active)
             VALUES (?, ?, ?, ?, ?)`,
            [col.column_id, col.title, col.color, col.position, 1],
            (err) => {
              if (err) {
                console.warn(`Could not create default column ${col.column_id}:`, err.message);
              } else {
                console.log(`✅ Created default column: ${col.column_id}`);
              }
              completed++;
              if (completed === total) {
                resolve();
              }
            }
          );
        });
      } else {
        resolve();
      }
    });
  });
};

