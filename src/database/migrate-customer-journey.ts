import { db } from './db';

export const migrateCustomerJourney = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Add customer journey stage to customers table
      db.run(`
        ALTER TABLE customers 
        ADD COLUMN journey_stage TEXT DEFAULT 'code_executed'
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding journey_stage column:', err);
        } else if (!err) {
          console.log('✅ Added journey_stage column to customers');
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
      db.run(`
        ALTER TABLE coaching_sessions 
        ADD COLUMN kanban_column TEXT DEFAULT 'scheduled'
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding kanban_column column:', err);
        } else if (!err) {
          console.log('✅ Added kanban_column to coaching_sessions');
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

