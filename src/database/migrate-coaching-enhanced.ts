import { db, convertSQLiteToMySQL, getTableInfoCallback } from './db';

export const migrateCoachingEnhanced = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // First, ensure coaching_sessions table exists
      getTableInfoCallback('coaching_sessions', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Table doesn't exist, create it first
          console.log('🔄 Creating coaching_sessions table...');
          const createCoachingSessionsSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS coaching_sessions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              customer_id INT NOT NULL,
              coach_id INT NOT NULL,
              session_date DATE NOT NULL,
              duration INT,
              notes TEXT,
              status VARCHAR(50) DEFAULT 'scheduled',
              position INT DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          db.run(createCoachingSessionsSQL, (createErr: any) => {
            if (createErr) {
              console.error('Error creating coaching_sessions table:', createErr);
              reject(createErr);
              return;
            }
            console.log('✅ Created coaching_sessions table');
            // Continue with adding columns
            addColumnsToCoachingSessions();
          });
          return;
        }

        // Table exists, add columns
        addColumnsToCoachingSessions();
      });

      // Helper function to check if error is about duplicate column
      const isDuplicateColumnError = (err: any): boolean => {
        if (!err) return false;
        return (
          err.code === 'ER_DUP_FIELDNAME' ||
          err.errno === 1060 ||
          err.message?.toLowerCase().includes('duplicate column name') ||
          err.message?.toLowerCase().includes('duplicate column') ||
          err.sqlMessage?.toLowerCase().includes('duplicate column name') ||
          err.sqlMessage?.toLowerCase().includes('duplicate column')
        );
      };

      // Helper function to add columns to coaching_sessions
      const addColumnsToCoachingSessions = () => {
        // Add new fields to coaching_sessions
        db.run(`
          ALTER TABLE coaching_sessions 
          ADD COLUMN session_type TEXT CHECK(session_type IN ('online', 'in_person'))
        `, (err) => {
          if (err && !isDuplicateColumnError(err)) {
            console.error('Error adding session_type to coaching_sessions:', err);
          } else if (!err) {
            console.log('✅ Added session_type to coaching_sessions');
          } else {
            console.log('ℹ️  Column session_type already exists');
          }
        });

        db.run(`
          ALTER TABLE coaching_sessions 
          ADD COLUMN meeting_link TEXT
        `, (err) => {
          if (err && !isDuplicateColumnError(err)) {
            console.error('Error adding meeting_link to coaching_sessions:', err);
          } else if (!err) {
            console.log('✅ Added meeting_link to coaching_sessions');
          } else {
            console.log('ℹ️  Column meeting_link already exists');
          }
        });

        db.run(`
          ALTER TABLE coaching_sessions 
          ADD COLUMN attendance TEXT CHECK(attendance IN ('attended', 'absent', 'late'))
        `, (err) => {
          if (err && !isDuplicateColumnError(err)) {
            console.error('Error adding attendance to coaching_sessions:', err);
          } else if (!err) {
            console.log('✅ Added attendance to coaching_sessions');
          } else {
            console.log('ℹ️  Column attendance already exists');
          }
        });

        db.run(`
          ALTER TABLE coaching_sessions 
          ADD COLUMN rating INTEGER CHECK(rating >= 1 AND rating <= 5)
        `, (err) => {
          if (err && !isDuplicateColumnError(err)) {
            console.error('Error adding rating to coaching_sessions:', err);
          } else if (!err) {
            console.log('✅ Added rating to coaching_sessions');
          } else {
            console.log('ℹ️  Column rating already exists');
          }
        });

        db.run(`
          ALTER TABLE coaching_sessions 
          ADD COLUMN tags TEXT
        `, (err) => {
          if (err && !isDuplicateColumnError(err)) {
            console.error('Error adding tags to coaching_sessions:', err);
          } else if (!err) {
            console.log('✅ Added tags to coaching_sessions');
          } else {
            console.log('ℹ️  Column tags already exists');
          }
        });

        db.run(`
          ALTER TABLE coaching_sessions 
          ADD COLUMN color TEXT
        `, (err) => {
          if (err && !isDuplicateColumnError(err)) {
            console.error('Error adding color to coaching_sessions:', err);
          } else if (!err) {
            console.log('✅ Added color to coaching_sessions');
          } else {
            console.log('ℹ️  Column color already exists');
          }
        });

        // Add reminder fields
        db.run(`
          ALTER TABLE coaching_sessions 
          ADD COLUMN reminder_sent INTEGER DEFAULT 0
        `, (err) => {
          if (err && !isDuplicateColumnError(err)) {
            console.error('Error adding reminder_sent to coaching_sessions:', err);
          } else if (!err) {
            console.log('✅ Added reminder_sent to coaching_sessions');
          } else {
            console.log('ℹ️  Column reminder_sent already exists');
          }
        });

        // Add fields to exercises (ignore if table doesn't exist)
        db.run(`
          ALTER TABLE exercises 
          ADD COLUMN reminder_sent INTEGER DEFAULT 0
        `, (err) => {
          if (err && !isDuplicateColumnError(err) && !err.message?.includes("doesn't exist") && err.code !== 'ER_NO_SUCH_TABLE') {
            console.error('Error adding reminder_sent to exercises:', err);
          } else if (!err) {
            console.log('✅ Added reminder_sent to exercises');
          } else if (isDuplicateColumnError(err)) {
            console.log('ℹ️  Column reminder_sent already exists in exercises');
          }
        });

        db.run(`
          ALTER TABLE exercises 
          ADD COLUMN tags TEXT
        `, (err) => {
          if (err && !isDuplicateColumnError(err) && !err.message?.includes("doesn't exist") && err.code !== 'ER_NO_SUCH_TABLE') {
            console.error('Error adding tags to exercises:', err);
          } else if (!err) {
            console.log('✅ Added tags to exercises');
          } else if (isDuplicateColumnError(err)) {
            console.log('ℹ️  Column tags already exists in exercises');
          }
        });

        // Create coaching_programs table
        const createCoachingProgramsSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS coaching_programs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            start_date DATE NOT NULL,
            end_date DATE,
            status VARCHAR(50) DEFAULT 'active',
            coach_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createCoachingProgramsSQL, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error('Error creating coaching_programs table:', err);
          } else if (!err) {
            console.log('✅ Created coaching_programs table');
          }
        });

        // Create coaching_templates table
        const createCoachingTemplatesSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS coaching_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            content JSON,
            is_default INT DEFAULT 0,
            created_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createCoachingTemplatesSQL, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error('Error creating coaching_templates table:', err);
          } else if (!err) {
            console.log('✅ Created coaching_templates table');
          }
        });

        // Create coaching_feedback table
        const createCoachingFeedbackSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS coaching_feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT,
            customer_id INT NOT NULL,
            coach_id INT NOT NULL,
            feedback_type VARCHAR(50) NOT NULL,
            rating INT,
            comments TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createCoachingFeedbackSQL, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error('Error creating coaching_feedback table:', err);
          } else if (!err) {
            console.log('✅ Created coaching_feedback table');
          }
        });

        // Create indexes for better performance
        const createIndexSQL1 = convertSQLiteToMySQL(`
          CREATE INDEX idx_coaching_sessions_date ON coaching_sessions(session_date)
        `);
        
        db.run(createIndexSQL1, (err) => {
          if (err && !err.message.includes('Duplicate key name')) {
            console.error('Error creating index on coaching_sessions.session_date:', err);
          } else if (!err) {
            console.log('✅ Created index on coaching_sessions.session_date');
          }
        });

        // Create index on goals (ignore if table doesn't exist)
        const createIndexSQL2 = convertSQLiteToMySQL(`
          CREATE INDEX idx_goals_deadline ON goals(deadline)
        `);
        
        db.run(createIndexSQL2, (err) => {
          if (err && !err.message.includes('Duplicate key name') && !err.message.includes("doesn't exist")) {
            console.error('Error creating index on goals.deadline:', err);
          } else if (!err) {
            console.log('✅ Created index on goals.deadline');
          }
        });

        // Create index on exercises (ignore if table doesn't exist)
        const createIndexSQL3 = convertSQLiteToMySQL(`
          CREATE INDEX idx_exercises_due_date ON exercises(due_date)
        `);
        
        db.run(createIndexSQL3, (err) => {
          if (err && !err.message.includes('Duplicate key name') && !err.message.includes("doesn't exist")) {
            console.error('Error creating index on exercises.due_date:', err);
          } else if (!err) {
            console.log('✅ Created index on exercises.due_date');
          }
          resolve();
        });
      };
    });
  });
};

