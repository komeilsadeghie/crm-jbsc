import { db } from './db';

export const migrateGoalsEnhanced = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Add okr_id to goals table to link KPI goals to OKRs
      db.run(`
        ALTER TABLE goals 
        ADD COLUMN okr_id INTEGER
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding okr_id column:', err);
        } else if (!err) {
          console.log('✅ Added okr_id column to goals');
        }
      });

      // Add is_kr flag to distinguish Key Results from regular KPIs
      db.run(`
        ALTER TABLE goals 
        ADD COLUMN is_kr INTEGER DEFAULT 0
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding is_kr column:', err);
        } else if (!err) {
          console.log('✅ Added is_kr column to goals');
        }
      });

      // Update existing goals table structure if needed
      // Ensure we have proper indexes
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_goals_okr_id ON goals(okr_id)
      `);

      resolve();
    });
  });
};

