import { db, getTableInfoCallback } from './db';

export const migrateTasksEnhancedTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if task_followers table exists
      getTableInfoCallback('task_followers', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create task_followers table (many-to-many)
          db.run(`
            CREATE TABLE IF NOT EXISTS task_followers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE(task_id, user_id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating task_followers table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created task_followers table');
          });
        } else {
          console.log('✅ task_followers table already exists');
        }
      });

      // Check if task_assignees table exists (for multi-assign)
      getTableInfoCallback('task_assignees', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create task_assignees table (many-to-many for multi-assign)
          db.run(`
            CREATE TABLE IF NOT EXISTS task_assignees (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              is_primary INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE(task_id, user_id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating task_assignees table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created task_assignees table');
          });
        } else {
          console.log('✅ task_assignees table already exists');
        }
      });

      // Check if task_comments table exists
      getTableInfoCallback('task_comments', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create task_comments table
          db.run(`
            CREATE TABLE IF NOT EXISTS task_comments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              comment TEXT NOT NULL,
              is_internal INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating task_comments table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created task_comments table');
          });
        } else {
          console.log('✅ task_comments table already exists');
        }
      });

      // Check if task_attachments table exists
      getTableInfoCallback('task_attachments', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create task_attachments table
          db.run(`
            CREATE TABLE IF NOT EXISTS task_attachments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER NOT NULL,
              file_name TEXT NOT NULL,
              file_path TEXT NOT NULL,
              file_size INTEGER,
              mime_type TEXT,
              uploaded_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
              FOREIGN KEY (uploaded_by) REFERENCES users(id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating task_attachments table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created task_attachments table');
            
            // Create indexes
            db.run(`CREATE INDEX IF NOT EXISTS idx_task_followers_task_id ON task_followers(task_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id)`, () => {
              resolve();
            });
          });
        } else {
          console.log('✅ task_attachments table already exists');
          resolve();
        }
      });
    });
  });
};

