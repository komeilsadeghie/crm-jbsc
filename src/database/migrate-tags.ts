import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create tags and entity_tags tables
export const migrateTagsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // First create tags table
    getTableInfoCallback('tags', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        console.log('🔄 Creating tags table...');
        const createTagsTableSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            color VARCHAR(50) DEFAULT '#00A3FF',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createTagsTableSQL, (createErr: any) => {
          if (createErr) {
            console.error('Error creating tags table:', createErr);
            if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
              console.warn('⚠️ Could not create tags table, continuing anyway:', createErr.message);
            }
          } else {
            console.log('✅ Created tags table');
          }
          
          // Now create entity_tags table
          getTableInfoCallback('entity_tags', (err2: any, info2: any[]) => {
            if (err2 || !info2 || info2.length === 0) {
              console.log('🔄 Creating entity_tags table...');
              const createEntityTagsTableSQL = convertSQLiteToMySQL(`
                CREATE TABLE IF NOT EXISTS entity_tags (
                  id VARCHAR(255) PRIMARY KEY,
                  tag_id INT NOT NULL,
                  entity_type VARCHAR(50) NOT NULL,
                  customer_id INT,
                  deal_id INT,
                  program_id INT,
                  content_id INT,
                  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  INDEX idx_entity_tags_tag_id (tag_id),
                  INDEX idx_entity_tags_customer_id (customer_id),
                  INDEX idx_entity_tags_deal_id (deal_id),
                  INDEX idx_entity_tags_entity_type (entity_type)
                )
              `);
              
              db.run(createEntityTagsTableSQL, (createErr2: any) => {
                if (createErr2) {
                  console.error('Error creating entity_tags table:', createErr2);
                  if (createErr2.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr2.message.includes('already exists')) {
                    console.warn('⚠️ Could not create entity_tags table, continuing anyway:', createErr2.message);
                  }
                } else {
                  console.log('✅ Created entity_tags table');
                }
                resolve();
              });
            } else {
              console.log('✅ entity_tags table already exists');
              resolve();
            }
          });
        });
        return;
      }

      console.log('✅ tags table already exists');
      
      // Check entity_tags table
      getTableInfoCallback('entity_tags', (err2: any, info2: any[]) => {
        if (err2 || !info2 || info2.length === 0) {
          console.log('🔄 Creating entity_tags table...');
          const createEntityTagsTableSQL = convertSQLiteToMySQL(`
            CREATE TABLE IF NOT EXISTS entity_tags (
              id VARCHAR(255) PRIMARY KEY,
              tag_id INT NOT NULL,
              entity_type VARCHAR(50) NOT NULL,
              customer_id INT,
              deal_id INT,
              program_id INT,
              content_id INT,
              assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_entity_tags_tag_id (tag_id),
              INDEX idx_entity_tags_customer_id (customer_id),
              INDEX idx_entity_tags_deal_id (deal_id),
              INDEX idx_entity_tags_entity_type (entity_type)
            )
          `);
          
          db.run(createEntityTagsTableSQL, (createErr2: any) => {
            if (createErr2) {
              console.error('Error creating entity_tags table:', createErr2);
              if (createErr2.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr2.message.includes('already exists')) {
                console.warn('⚠️ Could not create entity_tags table, continuing anyway:', createErr2.message);
              }
            } else {
              console.log('✅ Created entity_tags table');
            }
            resolve();
          });
        } else {
          console.log('✅ entity_tags table already exists');
          resolve();
        }
      });
    });
  });
};

