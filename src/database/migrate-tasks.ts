import { db } from './db';

export const migrateTasksTable = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Check if columns exist and add them if they don't
      db.get("PRAGMA table_info(tasks)", (err, rows: any) => {
        if (err) {
          console.error('Error checking tasks table:', err);
          return reject(err);
        }

        // Get all column names
        db.all("PRAGMA table_info(tasks)", (err, columns: any[]) => {
          if (err) {
            console.error('Error getting table info:', err);
            return reject(err);
          }

          const columnNames = columns.map((col: any) => col.name);
          const migrations: string[] = [];

          // Add project_id if it doesn't exist
          if (!columnNames.includes('project_id')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN project_id INTEGER');
            migrations.push('CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)');
          }

          // Add parent_task_id if it doesn't exist
          if (!columnNames.includes('parent_task_id')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER');
            migrations.push('CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)');
          }

          // Add start_date if it doesn't exist
          if (!columnNames.includes('start_date')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN start_date DATE');
          }

          // Add estimated_hours if it doesn't exist
          if (!columnNames.includes('estimated_hours')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN estimated_hours DECIMAL(10, 2)');
          }

          // Add position if it doesn't exist
          if (!columnNames.includes('position')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0');
          }

          // Add kanban_column if it doesn't exist
          if (!columnNames.includes('kanban_column')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN kanban_column TEXT DEFAULT \'todo\'');
          }

          // Add recurrence_pattern if it doesn't exist
          if (!columnNames.includes('recurrence_pattern')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN recurrence_pattern TEXT');
          }

          // Add recurrence_end_date if it doesn't exist
          if (!columnNames.includes('recurrence_end_date')) {
            migrations.push('ALTER TABLE tasks ADD COLUMN recurrence_end_date DATE');
          }

          if (migrations.length === 0) {
            console.log('✅ Tasks table is up to date');
            return resolve();
          }

          console.log(`🔄 Migrating tasks table: ${migrations.length} changes`);

          // Execute migrations sequentially
          let completed = 0;
          migrations.forEach((migration, index) => {
            db.run(migration, (err) => {
              if (err) {
                // Ignore "duplicate column" errors
                if (!err.message.includes('duplicate column')) {
                  console.error(`Error executing migration ${index + 1}:`, err);
                }
              } else {
                console.log(`  ✓ ${migration}`);
              }
              completed++;
              if (completed === migrations.length) {
                console.log('✅ Tasks table migration completed');
                resolve();
              }
            });
          });
        });
      });
    });
  });
};


