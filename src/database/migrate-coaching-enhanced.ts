import { db } from './db';

export const migrateCoachingEnhanced = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add new fields to coaching_sessions
      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN session_type TEXT CHECK(session_type IN ('online', 'in_person'))
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding session_type to coaching_sessions:', err);
        } else if (!err) {
          console.log('✅ Added session_type to coaching_sessions');
        }
      });

      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN meeting_link TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding meeting_link to coaching_sessions:', err);
        } else if (!err) {
          console.log('✅ Added meeting_link to coaching_sessions');
        }
      });

      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN attendance TEXT CHECK(attendance IN ('attended', 'absent', 'late'))
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding attendance to coaching_sessions:', err);
        } else if (!err) {
          console.log('✅ Added attendance to coaching_sessions');
        }
      });

      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN rating INTEGER CHECK(rating >= 1 AND rating <= 5)
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding rating to coaching_sessions:', err);
        } else if (!err) {
          console.log('✅ Added rating to coaching_sessions');
        }
      });

      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN tags TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding tags to coaching_sessions:', err);
        } else if (!err) {
          console.log('✅ Added tags to coaching_sessions');
        }
      });

      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN color TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding color to coaching_sessions:', err);
        } else if (!err) {
          console.log('✅ Added color to coaching_sessions');
        }
      });

      // Add reminder fields
      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN reminder_sent INTEGER DEFAULT 0
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding reminder_sent to coaching_sessions:', err);
        } else if (!err) {
          console.log('✅ Added reminder_sent to coaching_sessions');
        }
      });

      // Add fields to exercises
      db.run(`
        ALTER TABLE exercises 
        ADD COLUMN reminder_sent INTEGER DEFAULT 0
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding reminder_sent to exercises:', err);
        } else if (!err) {
          console.log('✅ Added reminder_sent to exercises');
        }
      });

      db.run(`
        ALTER TABLE exercises 
        ADD COLUMN tags TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding tags to exercises:', err);
        } else if (!err) {
          console.log('✅ Added tags to exercises');
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
      db.run(`
        CREATE TABLE IF NOT EXISTS coaching_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('goal', 'exercise', 'session', 'report')),
          content JSON NOT NULL,
          is_default INTEGER DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('Error creating coaching_templates table:', err);
        } else if (!err) {
          console.log('✅ Created coaching_templates table');
        }
      });

      // Create coaching_feedback table
      db.run(`
        CREATE TABLE IF NOT EXISTS coaching_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          customer_id INTEGER NOT NULL,
          coach_id INTEGER NOT NULL,
          feedback_type TEXT NOT NULL CHECK(feedback_type IN ('pre_session', 'post_session', 'general')),
          rating INTEGER CHECK(rating >= 1 AND rating <= 5),
          comments TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES coaching_sessions(id) ON DELETE SET NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (coach_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('Error creating coaching_feedback table:', err);
        } else if (!err) {
          console.log('✅ Created coaching_feedback table');
        }
      });

      // Create indexes for better performance
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_coaching_sessions_date ON coaching_sessions(session_date)
      `, (err) => {
        if (err) {
          console.error('Error creating index on coaching_sessions.session_date:', err);
        } else {
          console.log('✅ Created index on coaching_sessions.session_date');
        }
      });

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline)
      `, (err) => {
        if (err) {
          console.error('Error creating index on goals.deadline:', err);
        } else {
          console.log('✅ Created index on goals.deadline');
        }
      });

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_exercises_due_date ON exercises(due_date)
      `, (err) => {
        if (err) {
          console.error('Error creating index on exercises.due_date:', err);
        } else {
          console.log('✅ Created index on exercises.due_date');
        }
        resolve();
      });
    });
  });
};

