import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

export const migrateSurveysTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if surveys table exists
      getTableInfoCallback('surveys', (err: any, info: any[]) => {
        if (err || !info || info.length === 0) {
          // Create surveys table
          const createSurveysSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS surveys (
              id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              description TEXT,
              survey_type VARCHAR(50) NOT NULL,
              is_active INT DEFAULT 1,
              is_anonymous INT DEFAULT 0,
              allow_multiple_responses INT DEFAULT 0,
              start_date DATE,
              end_date DATE,
              created_by INT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          db.run(createSurveysSQL, (err) => {
            if (err) {
              console.error('Error creating surveys table:', err);
              reject(err);
              return;
            }
            console.log('✅ Created surveys table');
            createSurveyQuestions(resolve, reject);
          });
        } else {
          console.log('✅ surveys table already exists');
          createSurveyQuestions(resolve, reject);
        }
      });
    });
  });
};

const createSurveyQuestions = (resolve: () => void, reject: (err: any) => void) => {
  // Check if survey_questions table exists
  getTableInfoCallback('survey_questions', (err: any, info: any[]) => {
    if (err || !info || info.length === 0) {
      // Create survey_questions table
      const createSurveyQuestionsSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS survey_questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          survey_id INT NOT NULL,
          question_text TEXT NOT NULL,
          question_type VARCHAR(50) NOT NULL,
          options TEXT,
          is_required INT DEFAULT 0,
          position INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(createSurveyQuestionsSQL, (err) => {
        if (err) {
          console.error('Error creating survey_questions table:', err);
          reject(err);
          return;
        }
        console.log('✅ Created survey_questions table');
        createSurveyResponses(resolve, reject);
      });
    } else {
      console.log('✅ survey_questions table already exists');
      createSurveyResponses(resolve, reject);
    }
  });
};

const createSurveyResponses = (resolve: () => void, reject: (err: any) => void) => {
  // Check if survey_responses table exists
  getTableInfoCallback('survey_responses', (err: any, info: any[]) => {
    if (err || !info || info.length === 0) {
      // Create survey_responses table
      const createSurveyResponsesSQL = convertSQLiteToMySQL(`
        CREATE TABLE IF NOT EXISTS survey_responses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          survey_id INT NOT NULL,
          user_id INT,
          contact_id INT,
          lead_id INT,
          account_id INT,
          response_data TEXT NOT NULL,
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT
        )
      `);
      
      db.run(createSurveyResponsesSQL, (err) => {
        if (err) {
          console.error('Error creating survey_responses table:', err);
          reject(err);
          return;
        }
        console.log('✅ Created survey_responses table');
        
        // Create indexes (ignore errors if index already exists)
        const index1SQL = convertSQLiteToMySQL(`CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id)`);
        const index2SQL = convertSQLiteToMySQL(`CREATE INDEX idx_survey_responses_user_id ON survey_responses(user_id)`);
        const index3SQL = convertSQLiteToMySQL(`CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id)`);
        
        db.run(index1SQL, (err: any) => {
          if (err && !err.message.includes('Duplicate key name')) {
            console.warn('Warning creating index idx_survey_responses_survey_id:', err.message);
          }
        });
        db.run(index2SQL, (err: any) => {
          if (err && !err.message.includes('Duplicate key name')) {
            console.warn('Warning creating index idx_survey_responses_user_id:', err.message);
          }
        });
        db.run(index3SQL, (err: any) => {
          if (err && !err.message.includes('Duplicate key name')) {
            console.warn('Warning creating index idx_survey_questions_survey_id:', err.message);
          }
          resolve();
        });
      });
    } else {
      console.log('✅ survey_responses table already exists');
      resolve();
    }
  });
};

