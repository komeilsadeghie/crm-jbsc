import { db, convertSQLiteToMySQL } from './db';

export const migrateLeadStagesTable = (): Promise<void> => {
  return new Promise((resolve) => {
    console.log('🔄 Ensuring lead_stages table exists...');
    
    const createTableSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS lead_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT '#3B82F6',
        position INT DEFAULT 0,
        is_default INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(createTableSQL, (createErr: any) => {
      if (createErr) {
        console.error('Error creating lead_stages table:', createErr);
        if (createErr.code !== 'ER_TABLE_EXISTS_ERROR' && !createErr.message.includes('already exists')) {
          console.error('❌ Failed to create lead_stages table:', createErr.message);
        } else {
          console.log('✅ lead_stages table already exists');
        }
      } else {
        console.log('✅ lead_stages table created or already exists');
      }
      
      // Insert default stages if table is empty
      db.all('SELECT COUNT(*) as count FROM lead_stages', [], (countErr: any, rows: any[]) => {
        if (countErr) {
          console.warn('⚠️ Could not check lead_stages count:', countErr.message);
          resolve();
          return;
        }
        
        const count = rows && rows.length > 0 ? rows[0].count : 0;
        
        if (count === 0) {
          const defaultStages = [
            { name: 'new', label: 'جدید', color: '#3B82F6', position: 1 },
            { name: 'contacted', label: 'تماس گرفته شده', color: '#8B5CF6', position: 2 },
            { name: 'qualified', label: 'واجد شرایط', color: '#10B981', position: 3 },
            { name: 'converted', label: 'تبدیل شده', color: '#059669', position: 4 }
          ];
          
          let completed = 0;
          const total = defaultStages.length;
          
          if (total === 0) {
            resolve();
            return;
          }
          
          defaultStages.forEach((stage) => {
            db.run(
              `INSERT INTO lead_stages (name, label, color, position, is_default) VALUES (?, ?, ?, ?, ?)`,
              [stage.name, stage.label, stage.color, stage.position, 1],
              (insertErr: any) => {
                completed++;
                
                if (insertErr) {
                  console.warn('⚠️ Could not insert default stage:', stage.name, insertErr.message);
                }
                
                if (completed === total) {
                  console.log(`✅ Attempted to insert ${total} default lead stages`);
                  resolve();
                }
              }
            );
          });
        } else {
          resolve();
        }
      });
    });
  });
};

