# راهنمای کامل Deployment و CI/CD

## 📋 فهرست مطالب
1. [آماده‌سازی برای Production](#آماده‌سازی-برای-production)
2. [Build کردن پروژه](#build-کردن-پروژه)
3. [آپلود روی سرور ابری](#آپلود-روی-سرور-ابری)
4. [تنظیم CI/CD برای اپدیت خودکار](#تنظیم-cicd-برای-اپدیت-خودکار)
5. [راهنمای استفاده از Git برای اپدیت](#راهنمای-استفاده-از-git-برای-اپدیت)

---

## 🚀 آماده‌سازی برای Production

### 1. نصب Dependencies

```bash
# در پوشه client
cd client
npm install

# در پوشه server (اگر نیاز باشد)
cd ../server
npm install
```

### 2. تنظیم Environment Variables

یک فایل `.env.production` در پوشه `client` ایجاد کنید:

```env
VITE_API_URL=https://your-api-domain.com/api
```

---

## 🔨 Build کردن پروژه

### Build Client (Frontend)

```bash
cd client
npm run build
```

این دستور فایل‌های بهینه‌شده را در پوشه `client/dist` ایجاد می‌کند.

### Build Server (Backend) - اختیاری

اگر از TypeScript استفاده می‌کنید:

```bash
cd server
npm run build
```

---

## ☁️ آپلود روی سرور ابری

### روش 1: استفاده از cPanel / DirectAdmin

1. **فشرده‌سازی فایل‌ها:**
   ```bash
   cd client/dist
   tar -czf ../dist.tar.gz .
   ```

2. **آپلود فایل:**
   - وارد cPanel شوید
   - File Manager را باز کنید
   - به پوشه `public_html` یا `www` بروید
   - فایل `dist.tar.gz` را آپلود کنید
   - Extract کنید

3. **تنظیم .htaccess:**
   فایل `.htaccess` در پوشه `dist` ایجاد کنید:

   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   
   # Compression
   <IfModule mod_deflate.c>
     AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
   </IfModule>
   
   # Cache Control
   <IfModule mod_expires.c>
     ExpiresActive On
     ExpiresByType image/jpg "access plus 1 year"
     ExpiresByType image/jpeg "access plus 1 year"
     ExpiresByType image/png "access plus 1 year"
     ExpiresByType image/gif "access plus 1 year"
     ExpiresByType application/javascript "access plus 1 month"
     ExpiresByType text/css "access plus 1 month"
   </IfModule>
   ```

### روش 2: استفاده از FTP/SFTP

```bash
# استفاده از lftp
lftp -u username,password ftp.yourdomain.com <<EOF
cd public_html
mirror -R client/dist .
quit
EOF

# یا استفاده از rsync
rsync -avz --delete client/dist/ user@yourdomain.com:/var/www/html/
```

### روش 3: استفاده از Cloudflare Pages / Vercel / Netlify

#### Cloudflare Pages:
```bash
# نصب wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
cd client
npm run build
wrangler pages deploy dist --project-name=your-project-name
```

#### Vercel:
```bash
# نصب vercel CLI
npm install -g vercel

# Deploy
cd client
vercel --prod
```

#### Netlify:
```bash
# نصب netlify CLI
npm install -g netlify-cli

# Deploy
cd client
netlify deploy --prod --dir=dist
```

---

## 🔄 تنظیم CI/CD برای اپدیت خودکار

### استفاده از GitHub Actions

یک فایل `.github/workflows/deploy.yml` ایجاد کنید:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json
      
      - name: Install dependencies
        run: |
          cd client
          npm ci
      
      - name: Build
        run: |
          cd client
          npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Deploy to server
        uses: SamKirkland/FTP-Deploy-Action@v4.3.0
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./client/dist/
          server-dir: /public_html/
```

**تنظیم Secrets در GitHub:**
1. به Settings > Secrets and variables > Actions بروید
2. Secrets زیر را اضافه کنید:
   - `FTP_SERVER`: آدرس FTP سرور
   - `FTP_USERNAME`: نام کاربری FTP
   - `FTP_PASSWORD`: رمز عبور FTP
   - `VITE_API_URL`: آدرس API در production

### استفاده از GitLab CI/CD

فایل `.gitlab-ci.yml` در root پروژه:

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:18
  script:
    - cd client
    - npm ci
    - npm run build
  artifacts:
    paths:
      - client/dist/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client rsync
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan $SERVER_HOST >> ~/.ssh/known_hosts
  script:
    - rsync -avz --delete client/dist/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH
  only:
    - main
```

---

## 📝 راهنمای استفاده از Git برای اپدیت

### روش 1: استفاده از Git Pull (برای سرورهای VPS/Dedicated)

#### تنظیم اولیه:

```bash
# SSH به سرور
ssh user@yourdomain.com

# رفتن به پوشه پروژه
cd /var/www/html

# Clone کردن repository (فقط یکبار)
git clone https://github.com/yourusername/your-repo.git .

# یا اگر قبلاً clone کرده‌اید:
git pull origin main
```

#### اسکریپت خودکار برای اپدیت:

فایل `update.sh` ایجاد کنید:

```bash
#!/bin/bash

# رفتن به پوشه پروژه
cd /var/www/html

# Pull آخرین تغییرات
git pull origin main

# Build کردن
cd client
npm install
npm run build

# کپی کردن فایل‌های build شده
cp -r dist/* /var/www/html/

echo "Deployment completed!"
```

اجرای اسکریپت:
```bash
chmod +x update.sh
./update.sh
```

### روش 2: استفاده از Git Hooks (Post-Receive Hook)

در سرور، فایل `hooks/post-receive` ایجاد کنید:

```bash
#!/bin/bash

# پوشه production
DEPLOY_PATH=/var/www/html
GIT_REPO=/home/user/repo.git

# Checkout به پوشه موقت
TEMP_PATH=$(mktemp -d)
git clone $GIT_REPO $TEMP_PATH

# Build
cd $TEMP_PATH/client
npm install
npm run build

# Deploy
rsync -avz --delete $TEMP_PATH/client/dist/ $DEPLOY_PATH/

# پاکسازی
rm -rf $TEMP_PATH

echo "Deployment completed!"
```

اجرای دستور:
```bash
chmod +x hooks/post-receive
```

### روش 3: استفاده از Webhook (برای سرورهای اشتراکی)

#### در سرور (PHP):

فایل `deploy.php` ایجاد کنید:

```php
<?php
$secret = 'your-secret-key';
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE'] ?? '';

if ($signature === 'sha1=' . hash_hmac('sha1', $payload, $secret)) {
    // Pull changes
    exec('cd /path/to/repo && git pull origin main 2>&1', $output);
    
    // Build
    exec('cd /path/to/repo/client && npm install && npm run build 2>&1', $output);
    
    // Copy files
    exec('cp -r /path/to/repo/client/dist/* /var/www/html/ 2>&1', $output);
    
    echo json_encode(['status' => 'success', 'output' => $output]);
} else {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Invalid signature']);
}
```

#### در GitHub:

1. به Settings > Webhooks بروید
2. Add webhook کلیک کنید
3. Payload URL: `https://yourdomain.com/deploy.php`
4. Content type: `application/json`
5. Secret: همان secret که در فایل PHP استفاده کردید
6. Events: فقط `push` را انتخاب کنید

---

## 🔧 دستورات مفید

### بررسی وضعیت Git:
```bash
git status
git log --oneline -10
```

### بازگشت به commit قبلی:
```bash
git reset --hard HEAD~1
git push origin main --force
```

### مشاهده تغییرات:
```bash
git diff
```

### ایجاد Tag برای نسخه:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

---

## 📦 بهینه‌سازی‌های اضافی

### 1. فشرده‌سازی تصاویر:
```bash
# استفاده از imagemin
npm install -g imagemin-cli
imagemin client/src/assets/images/* --out-dir=client/dist/assets/images
```

### 2. فعال کردن Gzip در سرور:
```nginx
# برای Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;
```

### 3. استفاده از CDN:
فایل‌های static را روی CDN آپلود کنید و در `vite.config.ts` مسیر را تغییر دهید.

---

## ✅ چک‌لیست قبل از Deploy

- [ ] تمام console.log ها حذف شده‌اند
- [ ] Environment variables تنظیم شده‌اند
- [ ] API URL درست است
- [ ] Build بدون خطا انجام شده
- [ ] فایل‌های .env در .gitignore هستند
- [ ] تست‌ها پاس شده‌اند (اگر وجود دارند)
- [ ] فایل‌های build شده درست هستند

---

## 🆘 عیب‌یابی

### مشکل: Build موفق نمی‌شود
```bash
# پاک کردن node_modules و cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

### مشکل: فایل‌ها آپلود نمی‌شوند
- بررسی دسترسی‌های فایل (chmod)
- بررسی فضای دیسک
- بررسی اتصال FTP/SSH

### مشکل: تغییرات اعمال نمی‌شوند
- پاک کردن cache مرورگر (Ctrl+Shift+R)
- بررسی CDN cache
- بررسی .htaccess

---

## 📞 پشتیبانی

برای سوالات بیشتر، به مستندات زیر مراجعه کنید:
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)








