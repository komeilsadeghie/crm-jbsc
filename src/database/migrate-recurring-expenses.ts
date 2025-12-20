import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

export const migrateRecurringExpensesTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('expenses', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating expenses table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT,
            project_id INT,
            category VARCHAR(100),
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'IRR',
            expense_date DATE NOT NULL,
            description TEXT,
            receipt_file_path TEXT,
            billable INT DEFAULT 0,
            is_recurring INT DEFAULT 0,
            recurring_frequency VARCHAR(20),
            recurring_interval INT DEFAULT 1,
            recurring_start_date DATE,
            recurring_end_date DATE,
            next_expense_date DATE,
            parent_expense_id INT,
            created_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating expenses table:', createErr);
            reject(createErr);
            return;
          }
          console.log('✅ Created expenses table');
          resolve();
        });
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

