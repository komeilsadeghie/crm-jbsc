import { db } from './db';

export const migrateTaskKanbanColumnsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if task_kanban_columns table exists
      db.all(`PRAGMA table_info(task_kanban_columns)`, [], (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create task_kanban_columns table
          db.run(`
            CREATE TABLE IF NOT EXISTS task_kanban_columns (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              column_id TEXT UNIQUE NOT NULL,
              title TEXT NOT NULL,
              color TEXT DEFAULT '#E5E7EB',
              position INTEGER DEFAULT 0,
              is_active INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Error creating task_kanban_columns table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created task_kanban_columns table');
            
            // Create default columns
            createDefaultColumns().then(() => {
              resolve();
            }).catch(reject);
          });
        } else {
          console.log('✅ task_kanban_columns table already exists');
          resolve();
        }
      });
    });
  });
};

const createDefaultColumns = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if default columns exist
    db.get('SELECT COUNT(*) as count FROM task_kanban_columns', [], (err: any, row: any) => {
      if (err) {
        console.error('Error checking default columns:', err);
        reject(err);
        return;
      }
      
      if (row.count === 0) {
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
            `INSERT INTO task_kanban_columns (column_id, title, color, position, is_active)
             VALUES (?, ?, ?, ?, ?)`,
            [col.column_id, col.title, col.color, col.position, 1],
            (err) => {
              if (err) {
                console.error(`Error creating default column ${col.column_id}:`, err);
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

