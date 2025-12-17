#!/bin/bash

# اسکریپت اپدیت خودکار از Git
# این اسکریپت را در سرور اجرا کنید

set -e

PROJECT_DIR="/var/www/html"
GIT_REPO="https://github.com/yourusername/your-repo.git"
BRANCH="main"

# رنگ‌ها
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔄 شروع اپدیت...${NC}"

# رفتن به پوشه پروژه
cd "$PROJECT_DIR"

# Pull آخرین تغییرات
echo -e "${YELLOW}📥 دریافت آخرین تغییرات از Git...${NC}"
git pull origin "$BRANCH"

# نصب dependencies
echo -e "${YELLOW}📦 نصب dependencies...${NC}"
cd client
npm ci --silent

# Build
echo -e "${YELLOW}🔨 Build کردن...${NC}"
npm run build

# کپی فایل‌های build شده (اگر نیاز باشد)
# cp -r dist/* /var/www/html/

echo -e "${GREEN}✅ اپدیت با موفقیت انجام شد!${NC}"

# Restart services (اگر نیاز باشد)
# sudo systemctl restart nginx
# sudo systemctl restart pm2

echo -e "${GREEN}🎉 تمام!${NC}"



