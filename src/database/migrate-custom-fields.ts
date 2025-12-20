import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create custom_fields and custom_field_values tables
export const migrateCustomFieldsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // First create custom_fields table
    getTableInfoCallback('custom_fields', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        console.log('🔄 Creating custom_fields table...');
        const createFieldsTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS custom_fields (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            options TEXT,
            required INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createFieldsTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating custom_fields table:', createErr);
            if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
              console.warn('⚠️ Could not create custom_fields table, continuing anyway:', createErr.message);
            }
          } else {
            console.log('✅ Created custom_fields table');
          }
          
          // Now create custom_field_values table
          getTableInfoCallback('custom_field_values', (err2: any, info2: any[]) => {
            if (err2 || !info2 || info2.length === 0) {
              console.log('🔄 Creating custom_field_values table...');
              const createValuesTableSQL = convertSQLiteToMySQL(`
                CREATE TABLE IF NOT EXISTS custom_field_values (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  field_id INT NOT NULL,
                  entity_type VARCHAR(50) NOT NULL,
                  entity_id INT NOT NULL,
                  field_value TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE KEY unique_field_entity (field_id, entity_type, entity_id)
                )
              `);
              
              db.run(createValuesTableSQL, (createErr2: any) => {
                if (createErr2) {
                  console.error('Error creating custom_field_values table:', createErr2);
                  if (createErr2.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr2.message.includes('already exists')) {
                    console.warn('⚠️ Could not create custom_field_values table, continuing anyway:', createErr2.message);
                  }
                } else {
                  console.log('✅ Created custom_field_values table');
                }
                resolve();
              });
            } else {
              console.log('✅ custom_field_values table already exists');
              resolve();
            }
          });
        });
        return;
      }

      console.log('✅ custom_fields table already exists');
      
      // Check custom_field_values table
      getTableInfoCallback('custom_field_values', (err2: any, info2: any[]) => {
        if (err2 || !info2 || info2.length === 0) {
          console.log('🔄 Creating custom_field_values table...');
          const createValuesTableSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS custom_field_values (
              id INT AUTO_INCREMENT PRIMARY KEY,
              field_id INT NOT NULL,
              entity_type VARCHAR(50) NOT NULL,
              entity_id INT NOT NULL,
              field_value TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY unique_field_entity (field_id, entity_type, entity_id)
            )
          `);
          
          db.run(createValuesTableSQL, (createErr2: any) => {
            if (createErr2) {
              console.error('Error creating custom_field_values table:', createErr2);
              if (createErr2.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr2.message.includes('already exists')) {
                console.warn('⚠️ Could not create custom_field_values table, continuing anyway:', createErr2.message);
              }
            } else {
              console.log('✅ Created custom_field_values table');
            }
            resolve();
          });
        } else {
          console.log('✅ custom_field_values table already exists');
          resolve();
        }
      });
    });
  });
};

