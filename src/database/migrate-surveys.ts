import { db, getTableInfoCallback } from './db';

export const migrateSurveysTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if surveys table exists
      getTableInfoCallback('surveys', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create surveys table
          db.run(`
            CREATE TABLE IF NOT EXISTS surveys (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              description TEXT,
              survey_type TEXT NOT NULL CHECK(survey_type IN ('staff', 'leads', 'clients', 'mailing_list', 'public')),
              is_active INTEGER DEFAULT 1,
              is_anonymous INTEGER DEFAULT 0,
              allow_multiple_responses INTEGER DEFAULT 0,
              start_date DATE,
              end_date DATE,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating surveys table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created surveys table');
          });
        } else {
          console.log('✅ surveys table already exists');
        }
      });

      // Check if survey_questions table exists
      getTableInfoCallback('survey_questions', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create survey_questions table
          db.run(`
            CREATE TABLE IF NOT EXISTS survey_questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              survey_id INTEGER NOT NULL,
              question_text TEXT NOT NULL,
              question_type TEXT NOT NULL CHECK(question_type IN ('text', 'textarea', 'radio', 'checkbox', 'select', 'rating', 'date')),
              options TEXT,
              is_required INTEGER DEFAULT 0,
              position INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) {
              console.error('Error creating survey_questions table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created survey_questions table');
          });
        } else {
          console.log('✅ survey_questions table already exists');
        }
      });

      // Check if survey_responses table exists
      getTableInfoCallback('survey_responses', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create survey_responses table
          db.run(`
            CREATE TABLE IF NOT EXISTS survey_responses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              survey_id INTEGER NOT NULL,
              user_id INTEGER,
              contact_id INTEGER,
              lead_id INTEGER,
              account_id INTEGER,
              response_data TEXT NOT NULL,
              submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              ip_address TEXT,
              user_agent TEXT,
              FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
              FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
              FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
              FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
            )
          `, (err) => {
            if (err) {
              console.error('Error creating survey_responses table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created survey_responses table');
            
            // Create indexes
            db.run(`CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON survey_questions(survey_id)`, () => {
              resolve();
            });
          });
        } else {
          console.log('✅ survey_responses table already exists');
          resolve();
        }
      });
    });
  });
};

