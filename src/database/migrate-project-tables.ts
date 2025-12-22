import { db, convertSQLiteToMySQL } from './db';

export const migrateProjectTables = (): Promise<void> => {
  return new Promise((resolve) => {
    console.log('🔄 Ensuring project-related tables exist...');
    
    // Create project_milestones table
    const createMilestonesSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(createMilestonesSQL, (err: any) => {
      if (err && err.code !== 'ER_TABLE_EXISTS_ERROR' && !err.message.includes('already exists')) {
        console.error('❌ Error creating project_milestones table:', err.message);
      } else {
        console.log('✅ project_milestones table ready');
      }
      
      // Create project_discussions table
      const createDiscussionsSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS project_discussions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          user_id INT,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(createDiscussionsSQL, (err: any) => {
        if (err && err.code !== 'ER_TABLE_EXISTS_ERROR' && !err.message.includes('already exists')) {
          console.error('❌ Error creating project_discussions table:', err.message);
        } else {
          console.log('✅ project_discussions table ready');
        }
        
        // Create project_files table
        const createFilesSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS project_files (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path TEXT NOT NULL,
            file_size INT,
            file_type VARCHAR(100),
            uploaded_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createFilesSQL, (err: any) => {
          if (err && err.code !== 'ER_TABLE_EXISTS_ERROR' && !err.message.includes('already exists')) {
            console.error('❌ Error creating project_files table:', err.message);
          } else {
            console.log('✅ project_files table ready');
          }
          
          // Create time_logs table
          const createTimeLogsSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS time_logs (
              id INT AUTO_INCREMENT PRIMARY KEY,
              task_id INT,
              project_id INT,
              user_id INT NOT NULL,
              start_time DATETIME NOT NULL,
              end_time DATETIME,
              duration_minutes INT,
              description TEXT,
              billable INT DEFAULT 0,
              hourly_rate DECIMAL(10, 2),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_time_logs_task_id (task_id),
              INDEX idx_time_logs_project_id (project_id),
              INDEX idx_time_logs_user_id (user_id)
            )
          `);
          
          db.run(createTimeLogsSQL, (err: any) => {
            if (err && err.code !== 'ER_TABLE_EXISTS_ERROR' && !err.message.includes('already exists')) {
              console.error('❌ Error creating time_logs table:', err.message);
            } else {
              console.log('✅ time_logs table ready');
            }
            
            console.log('✅ All project-related tables migration completed');
            resolve();
          });
        });
      });
    });
  });
};

