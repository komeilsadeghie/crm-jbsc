import { initDatabase, closeDatabase } from './db';
import bcrypt from 'bcryptjs';

const init = async () => {
  try {
    await initDatabase();
    
    // Create default admin user
    const db = require('./db').db;
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, role, full_name)
      VALUES ('admin', 'admin@crm.com', ?, 'admin', 'مدیر سیستم')
    `, [hashedPassword], (err: any) => {
      if (err) {
        console.error('Error creating admin user:', err);
      } else {
        console.log('Default admin user created: admin / admin123');
      }
    });

    console.log('Database initialized successfully!');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

init();


