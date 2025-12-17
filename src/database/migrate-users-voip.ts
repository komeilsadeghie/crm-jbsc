import { db } from './db';

export const migrateUsersVoipExtension = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(users)`, [], (err: any, info: any[]) => {
      if (err) {
        console.log('⚠️  Users table not found');
        resolve();
        return;
      }

      const columnNames = info.map((col: any) => col.name);
      
      if (!columnNames.includes('voip_extension')) {
        db.run(
          `ALTER TABLE users ADD COLUMN voip_extension TEXT`,
          (alterErr: any) => {
            if (alterErr) {
              console.log(`⚠️  Could not add column voip_extension:`, alterErr.message);
              reject(alterErr);
            } else {
              console.log(`✅ Added column: voip_extension`);
              resolve();
            }
          }
        );
      } else {
        console.log('✓ voip_extension column already exists');
        resolve();
      }
    });
  });
};

