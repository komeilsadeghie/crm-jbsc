import { db, convertSQLiteToMySQL } from './db';

export const migrateCustomerJourney = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Add customer journey stage to customers table
      const alterJourneyStageSQL = convertSQLiteToMySQL(`
        ALTER TABLE customers 
        ADD COLUMN journey_stage VARCHAR(50)
      `);
      
      db.run(alterJourneyStageSQL, (err) => {
        if (err && !err.message.includes('duplicate column name') && !err.message.includes('Duplicate column name')) {
          console.error('Error adding journey_stage column:', err);
        } else if (!err) {
          console.log('✅ Added journey_stage column to customers');
          // Set default value for existing rows
          db.run(`UPDATE customers SET journey_stage = 'code_executed' WHERE journey_stage IS NULL`, () => {});
        }
      });

      // Add coach_id to customers table
      db.run(`
        ALTER TABLE customers 
        ADD COLUMN coach_id INTEGER
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding coach_id column:', err);
        } else if (!err) {
          console.log('✅ Added coach_id column to customers');
          db.run(`CREATE INDEX IF NOT EXISTS idx_customers_coach_id ON customers(coach_id)`);
        }
      });

      // Add coaching_session_id to customers table to track which session they're in
      db.run(`
        ALTER TABLE customers 
        ADD COLUMN coaching_session_id INTEGER
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding coaching_session_id column:', err);
        } else if (!err) {
          console.log('✅ Added coaching_session_id column to customers');
        }
      });

      // Add kanban column to coaching_sessions
      const alterKanbanColumnSQL = convertSQLiteToMySQL(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN kanban_column VARCHAR(50)
      `);
      
      db.run(alterKanbanColumnSQL, (err) => {
        if (err && !err.message.includes('duplicate column name') && !err.message.includes('Duplicate column name')) {
          console.error('Error adding kanban_column column:', err);
        } else if (!err) {
          console.log('✅ Added kanban_column to coaching_sessions');
          // Set default value for existing rows
          db.run(`UPDATE coaching_sessions SET kanban_column = 'scheduled' WHERE kanban_column IS NULL`, () => {});
        }
      });

      // Add position for drag and drop ordering
      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN position INTEGER DEFAULT 0
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding position column:', err);
        } else if (!err) {
          console.log('✅ Added position to coaching_sessions');
        }
      });

      resolve();
    });
  });
};

