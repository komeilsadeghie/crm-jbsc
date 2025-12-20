import { db, getTableInfoCallback } from './db';

export const migrateRecurringExpensesTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('expenses', (err: any, info: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      const columnNames = info.map((col: any) => col.name);
      const migrations: string[] = [];

      // Add recurring fields if they don't exist
      if (!columnNames.includes('is_recurring')) {
        migrations.push('ALTER TABLE expenses ADD COLUMN is_recurring INTEGER DEFAULT 0');
      }
      if (!columnNames.includes('recurring_frequency')) {
        migrations.push('ALTER TABLE expenses ADD COLUMN recurring_frequency TEXT CHECK(recurring_frequency IN ("daily", "weekly", "monthly", "yearly"))');
      }
      if (!columnNames.includes('recurring_interval')) {
        migrations.push('ALTER TABLE expenses ADD COLUMN recurring_interval INTEGER DEFAULT 1');
      }
      if (!columnNames.includes('recurring_start_date')) {
        migrations.push('ALTER TABLE expenses ADD COLUMN recurring_start_date DATE');
      }
      if (!columnNames.includes('recurring_end_date')) {
        migrations.push('ALTER TABLE expenses ADD COLUMN recurring_end_date DATE');
      }
      if (!columnNames.includes('next_expense_date')) {
        migrations.push('ALTER TABLE expenses ADD COLUMN next_expense_date DATE');
      }
      if (!columnNames.includes('parent_expense_id')) {
        migrations.push('ALTER TABLE expenses ADD COLUMN parent_expense_id INTEGER REFERENCES expenses(id)');
      }

      if (migrations.length === 0) {
        console.log('✅ Recurring expenses fields already exist');
        resolve();
        return;
      }

      db.serialize(() => {
        migrations.forEach((migration, index) => {
          db.run(migration, (err) => {
            if (err) {
              console.error(`Error running migration: ${migration}`, err);
              if (index === migrations.length - 1) {
                reject(err);
              }
            } else {
              console.log(`✅ Applied migration: ${migration}`);
              if (index === migrations.length - 1) {
                resolve();
              }
            }
          });
        });
      });
    });
  });
};

