import { migrateCustomerExcelFields } from '../database/migrate-customer-excel-fields';
import { initDatabase } from '../database/db';
import { closeDatabase } from '../database/db';

const runMigration = async () => {
  try {
    console.log('🔄 Initializing database...');
    await initDatabase();
    
    console.log('🔄 Running customer Excel fields migration...');
    await migrateCustomerExcelFields();
    
    console.log('✅ Migration completed successfully!');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await closeDatabase();
    process.exit(1);
  }
};

runMigration();

