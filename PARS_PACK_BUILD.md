# راهنمای Build در ParsPack

## تنظیمات مورد نیاز برای ParsPack

### 1. Environment Variables

در ParsPack، متغیرهای محیطی زیر را تنظیم کنید:

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://app-nodejs-nyrst.apps.de1.abrhapaas.com
JWT_SECRET=your-super-secret-jwt-key
RUN_MIGRATIONS=true
```

### 2. Build Scripts

ParsPack به صورت خودکار دستورات زیر را اجرا می‌کند:

1. `npm install` - نصب dependencies
2. `npm run build` - build کردن پروژه (server + client)
3. `npm start` - اجرای سرور

### 3. ساختار Build

```
npm run build
├── npm run build:server  (tsc - کامپایل TypeScript به JavaScript)
└── npm run build:client  (vite build - build کردن React app)
```

### 4. مسیرهای مهم

- **Server Build Output**: `dist/` (از `src/`)
- **Client Build Output**: `client/dist/`
- **Database**: `database/crm.db` (به صورت خودکار ایجاد می‌شود)
- **Uploads**: `uploads/` (برای فایل‌های آپلود شده)

### 5. مشکلات احتمالی و راه‌حل

#### مشکل: Build در 33% گیر می‌کند

**راه‌حل‌ها:**
1. بررسی کنید که همه فایل‌های migration در git هستند
2. بررسی کنید که `node_modules` در `.gitignore` است
3. بررسی کنید که `dist/` و `client/dist/` در `.gitignore` هستند

#### مشکل: خطای TypeScript

**راه‌حل:**
- همه فایل‌های `src/database/migrate-*.ts` باید در git باشند
- بررسی کنید که `tsconfig.json` درست تنظیم شده است

#### مشکل: Client Build خطا می‌دهد

**راه‌حل:**
- بررسی کنید که `client/package.json` درست است
- بررسی کنید که `client/node_modules` نصب شده است

### 6. بررسی Build محلی

قبل از push به ParsPack، می‌توانید build را محلی تست کنید:

```bash
# نصب dependencies
npm install
cd client && npm install && cd ..

# Build
npm run build

# تست اجرا
npm start
```

### 7. لاگ‌های Build

در ParsPack، لاگ‌های build را بررسی کنید:
- اگر خطای TypeScript دیدید، فایل‌های مربوطه را بررسی کنید
- اگر خطای npm دیدید، `package.json` را بررسی کنید
- اگر خطای build client دیدید، `client/vite.config.ts` را بررسی کنید

### 8. نکات مهم

1. **PORT**: ParsPack از port 3000 استفاده می‌کند (نه 3001)
2. **CORS**: باید `ALLOWED_ORIGINS` را با دامنه ParsPack تنظیم کنید
3. **Database**: دیتابیس SQLite به صورت خودکار در `database/` ایجاد می‌شود
4. **Static Files**: فایل‌های client build به صورت خودکار serve می‌شوند

### 9. بعد از Build موفق

بعد از build موفق:
1. سرور روی port 3000 اجرا می‌شود
2. API در `/api` در دسترس است
3. Client در root path (`/`) در دسترس است
4. Health check در `/api/health` در دسترس است


