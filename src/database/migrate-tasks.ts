import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

export const migrateTasksTable = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Check if columns exist and add them if they don't
      getTableInfoCallback('tasks', (err, columns: any[]) => {
        if (err || !columns || columns.length === 0) {
          // Table doesn't exist, create it first
          console.log('🔄 Creating tasks table...');
          const createTableSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS tasks (
              id INT AUTO_INCREMENT PRIMARY KEY,
              deal_id INT,
              account_id INT,
              project_id INT,
              parent_task_id INT,
              title VARCHAR(255) NOT NULL,
              description TEXT,
              status VARCHAR(50) DEFAULT 'pending',
              priority VARCHAR(20) DEFAULT 'medium',
              due_date DATE,
              start_date DATE,
              estimated_hours DECIMAL(10, 2),
              position INT DEFAULT 0,
              kanban_column VARCHAR(50) DEFAULT 'todo',
              assigned_to INT,
              created_by INT,
              recurrence_pattern TEXT,
              recurrence_end_date DATE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          db.run(createTableSQL, (createErr: any) => {
            if (createErr) {
              console.error('Error creating tasks table:', createErr);
              reject(createErr);
              return;
            }
            console.log('✅ Created tasks table');
            resolve();
          });
          return;
        }

        const columnNames = columns.map((col: any) => col.name);
        const migrations: string[] = [];

        // Add project_id if it doesn't exist
        if (!columnNames.includes('project_id')) {
          migrations.push('ALTER TABLE tasks ADD COLUMN project_id INTEGER');
          migrations.push('CREATE INDEX idx_tasks_project_id ON tasks(project_id)');
        }

        // Add parent_task_id if it doesn't exist
        if (!columnNames.includes('parent_task_id')) {
          migrations.push('ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER');
          migrations.push('CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id)');
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
          const convertedMigration = convertSQLiteToMySQL(migration);
          db.run(convertedMigration, (err) => {
            if (err) {
              // Ignore "duplicate column" and "duplicate key name" errors
              if (!err.message.includes('duplicate column') && 
                  !err.message.includes('Duplicate column name') &&
                  !err.message.includes('Duplicate key name')) {
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
};


