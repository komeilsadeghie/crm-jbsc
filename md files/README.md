# CRM هوشمند با ماژول کوچینگ

سیستم مدیریت ارتباط با مشتری (CRM) هوشمند با ماژول کوچینگ برای شرکت‌های آموزش واردات/صادرات

## ویژگی‌ها

### مدیریت مشتریان
- ثبت و مدیریت مشتریان (شرکت‌ها و اشخاص)
- دسته‌بندی مشتریان (صادرات، واردات، کوچینگ، طراحی سایت)
- سیستم نمره‌دهی و اولویت‌بندی مشتریان
- جستجو و فیلتر پیشرفته

### تاریخچه تعاملات
- ثبت تمامی تعاملات (تماس، ایمیل، جلسه، واتساپ، پیامک)
- ثبت اطلاعات واریزی (مبلغ، تاریخ، مراحل)
- ثبت اطلاعات خدمات (مدل سایت، طراح سایت، خدمات)
- یادداشت‌های اضافی

### ماژول کوچینگ
- مدیریت جلسات کوچینگ
- تعریف اهداف KPI و OKR
- ایجاد و پیگیری تمرین‌ها
- گزارش‌گیری رشد مشتریان
- داشبورد KPI برای کوچ‌ها

### اتوماسیون پیام
- ارسال خودکار پیام از طریق ایمیل، SMS، واتساپ
- قالب‌های پیام قابل تنظیم
- لاگ تمامی پیام‌های ارسالی

### داشبورد و گزارش‌گیری
- داشبورد جامع با KPI‌های کلیدی
- گزارش‌های تفصیلی
- نمودارهای تحلیلی
- خروجی Excel

## تکنولوژی‌ها

### Backend
- Node.js + Express
- TypeScript
- SQLite (قابل ارتقا به PostgreSQL)
- JWT Authentication

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Recharts (نمودارها)

## نصب و راه‌اندازی

### پیش‌نیازها
- Node.js 18+ 
- npm یا yarn

### مراحل نصب

1. نصب وابستگی‌های بک‌اند:
```bash
npm install
```

2. نصب وابستگی‌های فرانت‌اند:
```bash
cd client
npm install
cd ..
```

3. کپی فایل تنظیمات:
```bash
cp .env.example .env
```

4. ویرایش فایل `.env` و تنظیم مقادیر:
```env
PORT=3001
JWT_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

5. راه‌اندازی دیتابیس:
```bash
npm run init:db
```

این دستور دیتابیس را ایجاد می‌کند و یک کاربر پیش‌فرض با مشخصات زیر می‌سازد:
- نام کاربری: `admin`
- رمز عبور: `admin123`

6. اجرای برنامه:

برای محیط توسعه (هر دو سرور بک‌اند و فرانت‌اند):
```bash
npm run dev
```

یا به صورت جداگانه:

بک‌اند:
```bash
npm run dev:server
```

فرانت‌اند:
```bash
npm run dev:client
```

7. دسترسی به برنامه:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## ساختار پروژه

```
.
├── src/                    # کدهای بک‌اند
│   ├── database/          # مدل‌های دیتابیس
│   ├── routes/            # مسیرهای API
│   ├── middleware/       # میدل‌ورها
│   ├── types/            # تایپ‌های TypeScript
│   └── server.ts         # فایل اصلی سرور
├── client/                # کدهای فرانت‌اند
│   ├── src/
│   │   ├── components/   # کامپوننت‌های React
│   │   ├── pages/        # صفحات
│   │   ├── contexts/     # Context API
│   │   ├── services/    # سرویس‌های API
│   │   └── App.tsx      # کامپوننت اصلی
│   └── package.json
├── database/             # فایل دیتابیس SQLite
└── package.json
```

## API Endpoints

### احراز هویت
- `POST /api/auth/login` - ورود
- `POST /api/auth/register` - ثبت نام

### مشتریان
- `GET /api/customers` - لیست مشتریان
- `GET /api/customers/:id` - جزئیات مشتری
- `POST /api/customers` - ایجاد مشتری
- `PUT /api/customers/:id` - به‌روزرسانی مشتری
- `DELETE /api/customers/:id` - حذف مشتری
- `PATCH /api/customers/:id/score` - به‌روزرسانی نمره

### تعاملات
- `GET /api/interactions` - لیست تعاملات
- `POST /api/interactions` - ایجاد تعامل
- `PUT /api/interactions/:id` - به‌روزرسانی تعامل
- `DELETE /api/interactions/:id` - حذف تعامل

### کوچینگ
- `GET /api/coaching/sessions` - جلسات کوچینگ
- `POST /api/coaching/sessions` - ایجاد جلسه
- `GET /api/coaching/goals` - اهداف (KPI/OKR)
- `POST /api/coaching/goals` - ایجاد هدف
- `PUT /api/coaching/goals/:id` - به‌روزرسانی هدف
- `GET /api/coaching/exercises` - تمرین‌ها
- `POST /api/coaching/exercises` - ایجاد تمرین
- `PUT /api/coaching/exercises/:id` - به‌روزرسانی تمرین
- `GET /api/coaching/reports` - گزارش‌های رشد
- `POST /api/coaching/reports` - ایجاد گزارش

### داشبورد
- `GET /api/dashboard/kpis` - KPI‌های کلی
- `GET /api/dashboard/coach-kpis` - KPI‌های کوچ
- `GET /api/dashboard/sales-kpis` - KPI‌های فروش

### اتوماسیون
- `GET /api/automation` - لیست اتوماسیون‌ها
- `POST /api/automation` - ایجاد اتوماسیون
- `POST /api/automation/test` - تست ارسال پیام
- `GET /api/automation/logs` - لاگ پیام‌ها

## نقش‌های کاربری

- **admin**: دسترسی کامل به تمام بخش‌ها
- **coach**: دسترسی به ماژول کوچینگ و مشتریان کوچینگ
- **sales_manager**: دسترسی به بخش فروش و مشتریان
- **user**: دسترسی محدود

## ویژگی‌های پیشنهادی برای توسعه آینده

- [ ] اتصال به WhatsApp Business API
- [ ] اتصال به سرویس SMS
- [ ] ارسال نوتیفیکیشن
- [ ] تقویم و یادآوری جلسات
- [ ] خروجی PDF برای گزارش‌ها
- [ ] اتصال به سیستم‌های حسابداری
- [ ] داشبورد موبایل
- [ ] API برای اپلیکیشن موبایل
- [ ] پشتیبانی چندزبانه
- [ ] تم‌های مختلف

## مجوز

MIT License

## پشتیبانی

برای سوالات و مشکلات، لطفاً issue ایجاد کنید.



