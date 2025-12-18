#!/bin/bash

# اسکریپت Deploy خودکار برای CRM
# استفاده: ./deploy.sh [environment]
# مثال: ./deploy.sh production

set -e  # در صورت خطا متوقف شود

ENVIRONMENT=${1:-production}
PROJECT_DIR=$(pwd)
CLIENT_DIR="$PROJECT_DIR/client"
DIST_DIR="$CLIENT_DIR/dist"

# رنگ‌ها برای خروجی
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 شروع فرآیند Deploy...${NC}"

# بررسی وجود Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js نصب نشده است!${NC}"
    exit 1
fi

# بررسی وجود npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm نصب نشده است!${NC}"
    exit 1
fi

# رفتن به پوشه client
cd "$CLIENT_DIR"

echo -e "${YELLOW}📦 نصب dependencies...${NC}"
npm ci --silent

echo -e "${YELLOW}🔨 Build کردن پروژه...${NC}"
npm run build

# بررسی موفقیت build
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}❌ Build ناموفق بود!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build با موفقیت انجام شد!${NC}"

# نمایش حجم فایل‌ها
echo -e "${YELLOW}📊 حجم فایل‌های build شده:${NC}"
du -sh "$DIST_DIR"

# اگر environment production است، فایل‌ها را فشرده کن
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}📦 فشرده‌سازی فایل‌ها...${NC}"
    cd "$DIST_DIR"
    tar -czf ../dist.tar.gz .
    echo -e "${GREEN}✅ فایل dist.tar.gz ایجاد شد!${NC}"
fi

echo -e "${GREEN}🎉 Deploy آماده است!${NC}"
echo -e "${YELLOW}📁 مسیر فایل‌های build: $DIST_DIR${NC}"

# دستورات بعدی (اختیاری)
echo ""
echo -e "${YELLOW}💡 دستورات بعدی:${NC}"
echo "1. آپلود فایل‌ها به سرور:"
echo "   rsync -avz --delete $DIST_DIR/ user@server:/var/www/html/"
echo ""
echo "2. یا استفاده از FTP:"
echo "   lftp -u username,password ftp.server.com <<EOF"
echo "   cd public_html"
echo "   mirror -R $DIST_DIR ."
echo "   quit"
echo "   EOF"







