import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create deals table
export const migrateDealsTable = (): Promise<void> => {
  return new Promise((resolve) => {
    // Always try to create table using IF NOT EXISTS (safer approach)
    console.log('🔄 Ensuring deals table exists...');
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        account_id INT,
        contact_id INT,
        designer_id INT,
        title VARCHAR(255) NOT NULL,
        stage VARCHAR(50) DEFAULT 'discovery',
        budget DECIMAL(10, 2),
        probability INT DEFAULT 0,
        services TEXT,
        site_model VARCHAR(50),
        start_date DATE,
        expected_delivery_date DATE,
        actual_delivery_date DATE,
        notes TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(createTableSQL, (createErr: any) => {
      if (createErr) {
        console.error('Error creating deals table:', createErr);
        if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
          console.error('❌ Failed to create deals table:', createErr.message);
        } else {
          console.log('✅ Deals table already exists');
        }
      } else {
        console.log('✅ Deals table created or already exists');
      }
      
      // Try to add missing columns if table already existed
      const columnsToAdd = [
        { name: 'designer_id', type: 'INT' },
        { name: 'site_model', type: 'VARCHAR(50)' },
      ];

      let addColumnIndex = 0;
      const addNextColumn = () => {
        if (addColumnIndex >= columnsToAdd.length) {
          console.log('✅ Deals table migration completed');
          resolve();
          return;
        }

        const column = columnsToAdd[addColumnIndex];
        const addColumnSQL = convertSQLiteToMySQL(
          `ALTER TABLE deals ADD COLUMN ${column.name} ${column.type}`
        );

        db.run(addColumnSQL, (addErr: any) => {
          if (addErr) {
            // Ignore "duplicate column" errors
            if (addErr.code !== 'ER_DUP_FIELDNAME' && !addErr.message.includes('duplicate column')) {
              // Column might not exist, that's OK
            }
          } else {
            console.log(`✅ Added column ${column.name} to deals table`);
          }
          addColumnIndex++;
          addNextColumn();
        });
      };

      addNextColumn();
    });
  });
};

