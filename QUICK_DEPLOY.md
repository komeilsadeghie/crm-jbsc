# 🚀 دستورات سریع Deploy

## Build کردن پروژه

```bash
cd client
npm install
npm run build
```

فایل‌های build شده در پوشه `client/dist` قرار می‌گیرند.

---

## آپلود به سرور (3 روش)

### روش 1: استفاده از rsync (پیشنهادی)

```bash
rsync -avz --delete client/dist/ user@yourdomain.com:/var/www/html/
```

### روش 2: استفاده از FTP

```bash
cd client/dist
tar -czf ../dist.tar.gz .
# سپس فایل dist.tar.gz را از طریق FTP Manager آپلود کنید
```

### روش 3: استفاده از Git Pull (برای سرورهای VPS)

```bash
# در سرور
cd /var/www/html
git pull origin main
cd client
npm install
npm run build
cp -r dist/* /var/www/html/
```

---

## اپدیت خودکار با Git

### تنظیم یکباره:

```bash
# در سرور
cd /var/www/html
git clone https://github.com/yourusername/your-repo.git .
```

### اپدیت بعدی:

```bash
# در سرور
cd /var/www/html
git pull origin main
cd client
npm install
npm run build
```

یا از اسکریپت `update.sh` استفاده کنید:

```bash
chmod +x update.sh
./update.sh
```

---

## استفاده از CI/CD (GitHub Actions)

1. فایل `.github/workflows/deploy.yml` را ایجاد کنید (در DEPLOYMENT_GUIDE.md موجود است)
2. Secrets را در GitHub تنظیم کنید:
   - Settings > Secrets and variables > Actions
   - اضافه کردن: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD
3. با هر push به branch `main`، به صورت خودکار deploy می‌شود

---

## نکات مهم

- ✅ همیشه قبل از deploy، تست کنید: `npm run build`
- ✅ فایل `.env.production` را تنظیم کنید
- ✅ بعد از deploy، cache مرورگر را پاک کنید (Ctrl+Shift+R)
- ✅ بررسی کنید که API URL درست است

---

برای جزئیات بیشتر، فایل `DEPLOYMENT_GUIDE.md` را مطالعه کنید.







