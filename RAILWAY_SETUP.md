# راهنمای تنظیم Railway برای CRM

## مشکلات رایج و راه‌حل‌ها

### 1. مشکل اتصال به دیتابیس MySQL

#### بررسی متغیرهای محیطی در Railway:

1. به Railway Dashboard بروید
2. روی پروژه خود کلیک کنید
3. به بخش **Variables** بروید
4. مطمئن شوید که این متغیرها تنظیم شده‌اند:

```
DATABASE_URL=mysql://user:password@host:port/database
```

یا

```
MYSQL_URL=mysql://user:password@host:port/database
```

**نکته مهم:** Railway معمولاً به صورت خودکار `DATABASE_URL` را برای MySQL service تنظیم می‌کند. اگر MySQL service را به پروژه اضافه کرده‌اید، این متغیر باید به صورت خودکار تنظیم شود.

#### فرمت صحیح DATABASE_URL:

```
mysql://username:password@hostname:port/database_name
```

مثال:
```
mysql://root:password123@containers-us-west-123.railway.app:3306/railway
```

### 2. مشکل لاگین با admin/admin123

#### اگر کاربر admin وجود ندارد:

کاربر admin به صورت خودکار هنگام راه‌اندازی سرور ساخته می‌شود. اگر مشکل دارید:

1. **بررسی لاگ‌های Railway:**
   - به بخش **Deploy Logs** بروید
   - دنبال این پیام بگردید: `✅ Default admin user created: admin / admin123`
   - اگر این پیام را نمی‌بینید، ممکن است خطایی رخ داده باشد

2. **ساخت دستی کاربر admin:**
   
   از API register استفاده کنید:
   ```bash
   POST https://your-app.railway.app/api/auth/register
   Content-Type: application/json
   
   {
     "username": "admin",
     "email": "admin@crm.com",
     "password": "admin123",
     "role": "admin",
     "fullName": "مدیر سیستم"
   }
   ```

3. **بررسی وجود کاربر در دیتابیس:**
   
   اگر به MySQL دسترسی دارید:
   ```sql
   SELECT * FROM users WHERE username = 'admin';
   ```

### 3. مشکل "Database connection not available"

#### علل احتمالی:

1. **MySQL service هنوز راه‌اندازی نشده:**
   - صبر کنید تا MySQL service کاملاً راه‌اندازی شود (معمولاً 30-60 ثانیه)
   - سرور را restart کنید

2. **DATABASE_URL اشتباه است:**
   - بررسی کنید که فرمت URL صحیح است
   - مطمئن شوید که username و password درست هستند
   - بررسی کنید که database name درست است

3. **مشکل در parse کردن URL:**
   - اگر password شامل کاراکترهای خاص است (مثل `@`, `#`, `%`)، باید URL encode شود
   - مثال: `@` باید `%40` باشد

#### راه‌حل:

1. **بررسی لاگ‌های Railway:**
   ```
   ✅ Connected to MySQL database
   Host: ...
   Database: ...
   ```

2. **اگر خطا می‌بینید:**
   - خطا را کپی کنید
   - بررسی کنید که MySQL service در Railway فعال است
   - بررسی کنید که DATABASE_URL درست تنظیم شده است

### 4. تنظیمات پیشنهادی برای Railway

#### متغیرهای محیطی ضروری:

```env
# Database (معمولاً به صورت خودکار تنظیم می‌شود)
DATABASE_URL=mysql://...

# JWT Secret (حتماً تنظیم کنید)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS (اختیاری - اگر تنظیم نشود همه origin ها مجاز هستند)
ALLOWED_ORIGINS=https://your-app.railway.app

# Environment
NODE_ENV=production
PORT=3000
```

#### متغیرهای اختیاری:

```env
# Migrations
RUN_MIGRATIONS=false

# Email (اگر نیاز دارید)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### 5. مراحل راه‌اندازی در Railway

1. **ایجاد پروژه جدید در Railway**
2. **اضافه کردن MySQL service:**
   - روی **+ New** کلیک کنید
   - **Database** را انتخاب کنید
   - **MySQL** را انتخاب کنید
3. **اتصال MySQL به پروژه:**
   - MySQL service را به پروژه خود متصل کنید
   - Railway به صورت خودکار `DATABASE_URL` را تنظیم می‌کند
4. **تنظیم متغیرهای محیطی:**
   - `JWT_SECRET` را تنظیم کنید
   - سایر متغیرهای مورد نیاز را تنظیم کنید
5. **Deploy پروژه:**
   - کد را push کنید یا از GitHub connect کنید
   - Railway به صورت خودکار build و deploy می‌کند
6. **بررسی لاگ‌ها:**
   - منتظر بمانید تا این پیام‌ها را ببینید:
     ```
     ✅ Connected to MySQL database
     ✅ All database tables initialized successfully
     ✅ Default admin user created: admin / admin123
     ```
7. **تست لاگین:**
   - به `/login` بروید
   - با `admin` / `admin123` لاگین کنید

### 6. عیب‌یابی (Troubleshooting)

#### اگر نمی‌توانید لاگین کنید:

1. **بررسی لاگ‌های Railway:**
   - آیا خطای "Database connection not available" می‌بینید؟
   - آیا خطای "Database initialization error" می‌بینید؟

2. **بررسی DATABASE_URL:**
   ```bash
   # در Railway terminal یا logs
   echo $DATABASE_URL
   ```

3. **تست اتصال به دیتابیس:**
   - از Railway MySQL service استفاده کنید
   - بررسی کنید که tables ساخته شده‌اند:
     ```sql
     SHOW TABLES;
     SELECT * FROM users;
     ```

4. **بررسی hash password:**
   - اگر کاربر admin وجود دارد اما نمی‌توانید لاگین کنید
   - ممکن است password hash اشتباه باشد
   - کاربر را دوباره بسازید یا password را reset کنید

#### اگر خطای "PRAGMA table_info" می‌بینید:

این خطا قبلاً برطرف شده است. اگر هنوز می‌بینید:
- مطمئن شوید که آخرین کد را deploy کرده‌اید
- سرور را restart کنید

### 7. نکات مهم

1. **همیشه JWT_SECRET را تنظیم کنید** - در production حتماً یک secret قوی استفاده کنید
2. **بررسی لاگ‌ها** - همیشه لاگ‌های Railway را بررسی کنید
3. **صبر کنید** - MySQL service ممکن است چند ثانیه طول بکشد تا آماده شود
4. **Restart** - اگر مشکلی دارید، سرور را restart کنید

### 8. پشتیبانی

اگر مشکل دارید:
1. لاگ‌های Railway را بررسی کنید
2. متغیرهای محیطی را بررسی کنید
3. مطمئن شوید که MySQL service فعال است
4. سرور را restart کنید

