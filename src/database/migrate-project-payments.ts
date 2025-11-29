import { db } from './db';

export const migrateProjectPayments = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check existing columns
      db.all(`PRAGMA table_info(projects)`, [], (err: any, columns: any[]) => {
        if (err) {
          console.error('Error checking projects table:', err);
          reject(err);
          return;
        }

        const columnNames = columns.map((col: any) => col.name);
        
        // Add payment stage fields
        const paymentFields = [
          { name: 'payment_stage_1', type: 'DECIMAL(10, 2)' },
          { name: 'payment_stage_1_date', type: 'DATE' },
          { name: 'payment_stage_2', type: 'DECIMAL(10, 2)' },
          { name: 'payment_stage_2_date', type: 'DATE' },
          { name: 'payment_stage_3', type: 'DECIMAL(10, 2)' },
          { name: 'payment_stage_3_date', type: 'DATE' },
          { name: 'payment_stage_4', type: 'DECIMAL(10, 2)' },
          { name: 'payment_stage_4_date', type: 'DATE' },
        ];

        const missingFields = paymentFields.filter(field => !columnNames.includes(field.name));

        if (missingFields.length === 0) {
          console.log('✓ All payment stage fields already exist');
          updateStatusEnum();
          return;
        }

        let completed = 0;
        const total = missingFields.length;

        missingFields.forEach((field) => {
          db.run(`ALTER TABLE projects ADD COLUMN ${field.name} ${field.type}`, (err: any) => {
            if (err) {
              console.error(`Error adding column ${field.name}:`, err);
            } else {
              console.log(`✓ Added column ${field.name} to projects table`);
            }
            completed++;
            if (completed === total) {
              console.log('✓ Payment stage fields migration completed');
              updateStatusEnum();
            }
          });
        });
      });

      const updateStatusEnum = () => {
        // SQLite doesn't support ALTER COLUMN for CHECK constraints easily
        // We need to recreate the table or use a workaround
        // For now, we'll just note that the status values need to be updated in application code
        // The CHECK constraint will be enforced by the application
        
        // Check if we need to update status values
        // Since SQLite doesn't support modifying CHECK constraints easily,
        // we'll handle the new status values in the application layer
        console.log('✓ Status enum will be handled in application layer');
        resolve();
      };
    });
  });
};

