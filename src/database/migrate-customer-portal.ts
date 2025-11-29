import { db } from './db';

export const migrateCustomerPortal = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add password field to customers table if it doesn't exist
      db.run(`
        ALTER TABLE customers 
        ADD COLUMN password TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding password column to customers:', err);
          reject(err);
          return;
        }
        if (!err) {
          console.log('✅ Added password column to customers table');
        }
      });

      // Add portal_access_code field for easy login (optional, can be generated)
      db.run(`
        ALTER TABLE customers 
        ADD COLUMN portal_access_code TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding portal_access_code column to customers:', err);
          reject(err);
          return;
        }
        if (!err) {
          console.log('✅ Added portal_access_code column to customers table');
        }
      });

      // Create index on email and phone for faster login lookup
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)
      `, (err) => {
        if (err) {
          console.error('Error creating index on customers.email:', err);
        } else {
          console.log('✅ Created index on customers.email');
        }
      });

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)
      `, (err) => {
        if (err) {
          console.error('Error creating index on customers.phone:', err);
        } else {
          console.log('✅ Created index on customers.phone');
        }
      });

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_customers_portal_access_code ON customers(portal_access_code)
      `, (err) => {
        if (err) {
          console.error('Error creating index on customers.portal_access_code:', err);
        } else {
          console.log('✅ Created index on customers.portal_access_code');
        }
        resolve();
      });
    });
  });
};

