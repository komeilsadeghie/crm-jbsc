import { db } from './db';

// Script to manually add unique_id column if it doesn't exist
export const fixUniqueIdColumn = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log('🔧 Checking for unique_id column...');
    
    db.all(`PRAGMA table_info(customers)`, [], (err: any, columns: any[]) => {
      if (err) {
        console.error('Error checking customers table:', err);
        reject(err);
        return;
      }

      const columnNames = columns.map((col: any) => col.name);
      console.log('Existing columns:', columnNames);

      if (columnNames.includes('unique_id')) {
        console.log('✅ unique_id column already exists');
        resolve();
        return;
      }

      console.log('⚠️ unique_id column not found. Adding it...');
      
      // SQLite doesn't support UNIQUE constraint in ALTER TABLE ADD COLUMN
      // So we add it without UNIQUE first, then we can add a unique index
      db.run(`ALTER TABLE customers ADD COLUMN unique_id TEXT`, (err: any) => {
        if (err) {
          console.error('Error adding unique_id column:', err);
          reject(err);
          return;
        }

        console.log('✅ Added unique_id column');
        
        // Create unique index
        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_unique_id ON customers(unique_id)`, (err: any) => {
          if (err) {
            console.error('Error creating unique index:', err);
            // Don't reject - column was added, index is optional
            console.warn('⚠️ Could not create unique index, but column was added');
          } else {
            console.log('✅ Created unique index on unique_id');
          }
          resolve();
        });
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  fixUniqueIdColumn()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}


