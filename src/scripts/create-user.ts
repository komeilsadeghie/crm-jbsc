import { initDatabase } from '../database/db';
import { db } from '../database/db';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const createUser = async () => {
  try {
    // Initialize database
    await initDatabase();

    console.log('\n=== ساخت کاربر جدید ===\n');

    // Get user input
    const username = await question('نام کاربری: ');
    const email = await question('ایمیل: ');
    const password = await question('رمز عبور: ');
    const fullName = await question('نام کامل (اختیاری): ');
    const roleInput = await question('نقش (admin/user/staff) [default: user]: ');
    const role = roleInput.trim() || 'user';

    if (!username || !email || !password) {
      console.error('❌ نام کاربری، ایمیل و رمز عبور الزامی هستند!');
      process.exit(1);
    }

    // Check if user exists
    db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username.toLowerCase(), email.toLowerCase()],
      async (err, existing) => {
        if (err) {
          console.error('❌ خطا در بررسی کاربر موجود:', err);
          process.exit(1);
        }

        if (existing) {
          console.error('❌ نام کاربری یا ایمیل تکراری است!');
          process.exit(1);
        }

        try {
          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Insert user
          db.run(
            'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
            [username.toLowerCase(), email.toLowerCase(), hashedPassword, role, fullName || null],
            function (err) {
              if (err) {
                console.error('❌ خطا در ایجاد کاربر:', err);
                process.exit(1);
              }

              console.log('\n✅ کاربر با موفقیت ایجاد شد!');
              console.log(`   ID: ${this.lastID}`);
              console.log(`   نام کاربری: ${username}`);
              console.log(`   ایمیل: ${email}`);
              console.log(`   نقش: ${role}\n`);

              rl.close();
              process.exit(0);
            }
          );
        } catch (error) {
          console.error('❌ خطا در hash کردن رمز عبور:', error);
          process.exit(1);
        }
      }
    );
  } catch (error) {
    console.error('❌ خطا:', error);
    process.exit(1);
  }
};

createUser();

