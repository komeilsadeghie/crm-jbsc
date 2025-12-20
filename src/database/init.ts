import { initDatabase, closeDatabase, dbRun, dbGet, isMySQL } from './db';
import bcrypt from 'bcryptjs';

const init = async () => {
  try {
    await initDatabase();
    
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin user already exists
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      ['admin', 'admin@crm.com']
    );
    
    if (!existingUser) {
      // Use MySQL-compatible INSERT IGNORE or SQLite INSERT OR IGNORE
      const insertQuery = isMySQL
        ? `INSERT IGNORE INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)`
        : `INSERT OR IGNORE INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)`;
      
      await dbRun(insertQuery, [
        'admin',
        'admin@crm.com',
        hashedPassword,
        'admin',
        'مدیر سیستم'
      ]);
      
      console.log('✅ Default admin user created: admin / admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('✅ Database initialized successfully!');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
};

init();


