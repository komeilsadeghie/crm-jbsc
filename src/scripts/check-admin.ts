import { dbGet, dbRun, isMySQL } from '../database/db';
import bcrypt from 'bcryptjs';

const checkAndCreateAdmin = async () => {
  try {
    console.log('🔍 Checking for admin user...');
    
    // Check if admin user exists
    const existingAdmin = await dbGet(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      ['admin', 'admin@crm.com']
    );
    
    if (existingAdmin) {
      console.log('✅ Admin user exists:');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      
      // Test password
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, existingAdmin.password);
      if (isValid) {
        console.log('✅ Password is correct');
      } else {
        console.log('⚠️  Password mismatch - resetting password...');
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        await dbRun(
          'UPDATE users SET password = ? WHERE username = ?',
          [hashedPassword, 'admin']
        );
        console.log('✅ Password reset to: admin123');
      }
    } else {
      console.log('❌ Admin user not found - creating...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const insertQuery = isMySQL
        ? `INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)`
        : `INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)`;
      
      await dbRun(insertQuery, [
        'admin',
        'admin@crm.com',
        hashedPassword,
        'admin',
        'مدیر سیستم'
      ]);
      
      console.log('✅ Admin user created:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@crm.com');
    }
    
    console.log('\n✅ Check completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

checkAndCreateAdmin();

