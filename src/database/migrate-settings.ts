import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create settings table
export const migrateSettingsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('settings', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Table doesn't exist, create it first
        console.log('🔄 Creating settings table...');
        const createTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            \`key\` VARCHAR(255) UNIQUE NOT NULL,
            value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating settings table:', createErr);
            // Don't reject - table might already exist
            if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
              console.warn('⚠️ Could not create settings table, continuing anyway:', createErr.message);
            }
            resolve();
            return;
          }
          console.log('✅ Created settings table');
          
          // Insert default settings if table is empty
          db.all('SELECT COUNT(*) as count FROM settings', [], (countErr: any, countResult: any) => {
            if (!countErr && countResult && countResult[0] && countResult[0].count === 0) {
              const defaultSettings = [
                ['company_name', ''],
                ['logo_main', ''],
                ['logo_text', ''],
                ['logo_favicon', ''],
              ];
              
              let insertIndex = 0;
              const insertNext = () => {
                if (insertIndex >= defaultSettings.length) {
                  console.log('✅ Inserted default settings');
                  resolve();
                  return;
                }
                
                const [key, value] = defaultSettings[insertIndex];
                db.run(
                  'INSERT INTO settings (`key`, value) VALUES (?, ?)',
                  [key, value],
                  (insertErr: any) => {
                    if (insertErr && insertErr.code !== 'ER_DUP_ENTRY') {
                      console.warn(`⚠️ Could not insert default setting ${key}:`, insertErr.message);
                    }
                    insertIndex++;
                    insertNext();
                  }
                );
              };
              
              insertNext();
            } else {
              resolve();
            }
          });
        });
        return;
      }

      console.log('✅ settings table already exists');
      resolve();
    });
  });
};

