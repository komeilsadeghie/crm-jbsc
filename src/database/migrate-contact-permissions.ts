import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create contact_permissions table
export const migrateContactPermissionsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('contact_permissions', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating contact_permissions table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS contact_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            contact_id INT NOT NULL,
            module VARCHAR(100) NOT NULL,
            can_view INT DEFAULT 0,
            can_edit INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_contact_module (contact_id, module)
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating contact_permissions table:', createErr);
            if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
              console.warn('⚠️ Could not create contact_permissions table, continuing anyway:', createErr.message);
            }
            resolve();
            return;
          }
          console.log('✅ Created contact_permissions table');
          resolve();
        });
        return;
      }

      console.log('✅ contact_permissions table already exists');
      resolve();
    });
  });
};

