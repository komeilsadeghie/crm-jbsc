import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create tags and entity_tags tables
export const migrateTagsTable = (): Promise<void> => {
  return new Promise((resolve) => {
    // Always try to create tables using IF NOT EXISTS (safer approach)
    console.log('🔄 Ensuring tags and entity_tags tables exist...');
    
    // First create tags table
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
          console.error('❌ Failed to create tags table:', createErr.message);
        } else {
          console.log('✅ Tags table already exists');
        }
      } else {
        console.log('✅ Tags table created or already exists');
      }
      
      // Now create entity_tags table (always try, IF NOT EXISTS handles it)
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
            console.error('❌ Failed to create entity_tags table:', createErr2.message);
          } else {
            console.log('✅ Entity_tags table already exists');
          }
        } else {
          console.log('✅ Entity_tags table created or already exists');
        }
        resolve();
      });
    });
  });
};

