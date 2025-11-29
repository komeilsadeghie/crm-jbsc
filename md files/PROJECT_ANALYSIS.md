# 📊 تحلیل کامل پروژه CRM Media & Coaching

## 🎯 خلاصه اجرایی

این پروژه یک **سیستم CRM هوشمند** با قابلیت‌های پیشرفته برای مدیریت مشتریان، کوچینگ، محتوا و فروش است که برای شرکت‌های آموزش واردات/صادرات طراحی شده است.

---

## 📁 ساختار پروژه

### معماری کلی
```
crm-media/
├── src/                    # Backend (Node.js + Express + TypeScript)
│   ├── database/          # مدل‌های دیتابیس SQLite
│   ├── routes/            # 14 Route اصلی API
│   ├── modules/           # 7 ماژول پیشرفته
│   ├── middleware/        # میدل‌ورهای احراز هویت
│   ├── services/          # سرویس‌های کسب‌وکار
│   └── server.ts          # نقطه ورود سرور
│
├── client/                # Frontend (React 18 + TypeScript + Vite)
│   ├── src/
│   │   ├── pages/        # 9 صفحه اصلی
│   │   ├── components/   # کامپوننت‌های قابل استفاده مجدد
│   │   ├── contexts/     # Context API برای State Management
│   │   └── services/     # سرویس‌های API
│   └── vite.config.ts    # تنظیمات Vite
│
├── database/              # فایل دیتابیس SQLite
├── prisma/                # Prisma ORM (در حال توسعه)
└── package.json          # وابستگی‌های اصلی
```

---

## 🗄️ ساختار دیتابیس

### جداول اصلی (25+ جدول)

#### 1. **Core CRM Tables**
- ✅ `users` - کاربران سیستم
- ✅ `customers` - مشتریان (شرکت‌ها و اشخاص)
- ✅ `interactions` - تعاملات با مشتریان
- ✅ `leads` - سرنخ‌های فروش
- ✅ `accounts` - حساب‌های شرکت‌ها
- ✅ `contacts` - مخاطبین
- ✅ `deals` - پروژه‌ها/معاملات
- ✅ `invoices` - فاکتورها
- ✅ `payments` - پرداخت‌ها

#### 2. **Coaching Module**
- ✅ `coaching_programs` - برنامه‌های کوچینگ
- ✅ `coaching_sessions` / `coaching_sessions_v2` - جلسات کوچینگ
- ✅ `okrs` - اهداف OKR
- ✅ `key_results` - نتایج کلیدی
- ✅ `kpi_definitions` - تعاریف KPI
- ✅ `kpi_entries` - ورودی‌های KPI
- ✅ `goals` - اهداف (KPI/OKR)
- ✅ `exercises` - تمرین‌ها
- ✅ `growth_reports` - گزارش‌های رشد

#### 3. **Media Module**
- ✅ `content_briefs` - بریف‌های محتوا
- ✅ `content_items` - آیتم‌های محتوا
- ✅ `content_calendar` - تقویم محتوایی
- ✅ `assets` - دارایی‌ها (فایل‌ها)

#### 4. **Automation & Scoring**
- ✅ `campaigns` - کمپین‌های اتوماسیون
- ✅ `sequence_steps` - مراحل توالی
- ✅ `campaign_enrollments` - ثبت‌نام در کمپین
- ✅ `lead_scoring_events` - رویدادهای امتیازدهی Lead
- ✅ `rfm_scores` - امتیازدهی RFM
- ✅ `message_automations` - اتوماسیون پیام
- ✅ `message_logs` - لاگ پیام‌ها

#### 5. **Tasks & Activities**
- ✅ `tasks` - تسک‌ها
- ✅ `activities` - فعالیت‌ها

#### 6. **Supporting Tables**
- ✅ `dashboard_kpis` - کش KPI‌های داشبورد

---

## 🔌 API Endpoints

### 1. **Authentication** (`/api/auth`)
- `POST /login` - ورود کاربر
- `POST /register` - ثبت نام کاربر جدید

### 2. **Customers** (`/api/customers`)
- `GET /` - لیست مشتریان
- `GET /:id` - جزئیات مشتری
- `POST /` - ایجاد مشتری
- `PUT /:id` - به‌روزرسانی مشتری
- `DELETE /:id` - حذف مشتری
- `PATCH /:id/score` - به‌روزرسانی نمره

### 3. **Leads** (`/api/leads`)
- `GET /` - لیست سرنخ‌ها
- `GET /:id` - جزئیات سرنخ
- `POST /` - ایجاد سرنخ
- `PUT /:id` - به‌روزرسانی سرنخ
- `DELETE /:id` - حذف سرنخ
- `POST /:id/convert` - تبدیل به Account/Contact

### 4. **Deals** (`/api/deals`)
- `GET /` - لیست پروژه‌ها
- `GET /:id` - جزئیات پروژه
- `POST /` - ایجاد پروژه
- `PUT /:id` - به‌روزرسانی پروژه
- `PATCH /:id/stage` - تغییر مرحله
- `DELETE /:id` - حذف پروژه

### 5. **Accounts** (`/api/accounts`)
- `GET /` - لیست حساب‌ها
- `GET /:id` - جزئیات حساب
- `POST /` - ایجاد حساب
- `PUT /:id` - به‌روزرسانی حساب
- `GET /:id/rfm` - محاسبه RFM

### 6. **Contacts** (`/api/contacts`)
- `GET /` - لیست مخاطبین
- `GET /:id` - جزئیات مخاطب
- `POST /` - ایجاد مخاطب
- `PUT /:id` - به‌روزرسانی مخاطب
- `DELETE /:id` - حذف مخاطب

### 7. **Invoices** (`/api/invoices`)
- `GET /` - لیست فاکتورها
- `GET /:id` - جزئیات فاکتور
- `POST /` - ایجاد فاکتور
- `PUT /:id` - به‌روزرسانی فاکتور
- `POST /:id/payments` - ثبت پرداخت

### 8. **Media** (`/api/media`)
- `GET /briefs` - لیست بریف‌ها
- `POST /briefs` - ایجاد بریف
- `GET /items` - لیست آیتم‌های محتوا
- `POST /items` - ایجاد آیتم
- `GET /calendar` - تقویم محتوایی
- `GET /assets` - لیست دارایی‌ها
- `POST /assets` - آپلود دارایی

### 9. **Coaching** (`/api/coaching`)
- `GET /programs` - لیست برنامه‌ها
- `POST /programs` - ایجاد برنامه
- `GET /sessions` - لیست جلسات
- `POST /sessions` - ایجاد جلسه
- `GET /okrs` - لیست OKR‌ها
- `POST /okrs` - ایجاد OKR
- `GET /kpis` - لیست KPI‌ها
- `POST /kpis` - ایجاد KPI

### 10. **Tasks** (`/api/tasks`)
- `GET /` - لیست تسک‌ها
- `POST /` - ایجاد تسک
- `PUT /:id` - به‌روزرسانی تسک
- `DELETE /:id` - حذف تسک

### 11. **Scoring** (`/api/scoring`)
- `POST /leads/:id/calculate` - محاسبه Lead Score
- `GET /accounts/:id/rfm` - محاسبه RFM Score

### 12. **Dashboard** (`/api/dashboard`)
- `GET /kpis` - KPI‌های کلی
- `GET /coach-kpis` - KPI‌های کوچ
- `GET /sales-kpis` - KPI‌های فروش
- `GET /funnel` - قیف فروش

### 13. **Interactions** (`/api/interactions`)
- `GET /` - لیست تعاملات
- `POST /` - ایجاد تعامل
- `PUT /:id` - به‌روزرسانی تعامل
- `DELETE /:id` - حذف تعامل

### 14. **Automation** (`/api/automation`)
- `GET /` - لیست اتوماسیون‌ها
- `POST /` - ایجاد اتوماسیون
- `POST /test` - تست ارسال پیام
- `GET /logs` - لاگ پیام‌ها

### 15. **Modules** (ماژول‌های پیشرفته)
- `/api/tags` - مدیریت تگ‌ها
- `/api/calendar` - تقویم
- `/api/profile` - پروفایل کاربر
- `/api/import-export` - واردات/صادرات
- `/api/google-sheets` - اتصال Google Sheets
- `/api/voip` - تماس‌های VoIP

---

## 🎨 Frontend Pages

### صفحات اصلی (9 صفحه)

1. **Login** (`/login`)
   - صفحه ورود کاربر
   - احراز هویت با JWT

2. **Dashboard** (`/dashboard`)
   - داشبورد جامع
   - KPI‌های کلیدی
   - نمودارهای تحلیلی
   - آخرین فعالیت‌ها

3. **Leads** (`/leads`)
   - مدیریت سرنخ‌ها
   - فیلتر و جستجو
   - امتیازدهی Lead
   - تبدیل به Account

4. **Deals** (`/deals`)
   - مدیریت پروژه‌ها
   - قیف فروش
   - مراحل پروژه
   - بودجه و احتمال

5. **Customers** (`/customers`)
   - لیست مشتریان
   - جستجو و فیلتر
   - دسته‌بندی

6. **CustomerDetail** (`/customers/:id`)
   - جزئیات کامل مشتری
   - تاریخچه تعاملات
   - اطلاعات مالی
   - پروژه‌ها

7. **Media** (`/media`)
   - مدیریت محتوا
   - بریف‌های محتوا
   - تقویم محتوایی
   - دارایی‌ها

8. **Coaching** (`/coaching`)
   - برنامه‌های کوچینگ
   - جلسات
   - OKR/KPI
   - تمرین‌ها

9. **Reports** (`/reports`)
   - گزارش‌گیری
   - نمودارهای تحلیلی
   - خروجی Excel

---

## 🛠️ تکنولوژی‌ها

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (قابل ارتقا به PostgreSQL)
- **ORM**: Prisma (در حال توسعه)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: bcryptjs (رمزنگاری رمز عبور)
- **Email**: nodemailer
- **SMS/Voice**: Twilio
- **WhatsApp**: whatsapp-web.js
- **Google APIs**: googleapis
- **File Processing**: xlsx (Excel)
- **Date Handling**: date-fns, dayjs, jalaliday

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Picker**: react-day-picker-jalali (تقویم شمسی)

### Development Tools
- **TypeScript**: v5.3.3
- **Nodemon**: برای Hot Reload
- **Concurrently**: اجرای همزمان سرور و کلاینت
- **ts-node**: اجرای TypeScript مستقیم

---

## 🔐 امنیت

### احراز هویت
- ✅ JWT Token-based Authentication
- ✅ Password Hashing با bcryptjs
- ✅ Protected Routes در Frontend
- ✅ Middleware Authentication در Backend

### نقش‌های کاربری (RBAC)
- `admin` - دسترسی کامل
- `coach` - دسترسی به ماژول کوچینگ
- `sales_manager` - دسترسی به فروش
- `media_manager` - دسترسی به مدیا
- `finance` - دسترسی به فاکتورها
- `support` / `pm` - دسترسی به تسک‌ها
- `user` - دسترسی محدود

---

## 📊 ویژگی‌های کلیدی

### 1. **مدیریت Lead**
- ✅ سیستم امتیازدهی خودکار Lead
- ✅ تبدیل Lead به Account/Contact
- ✅ فیلتر و جستجوی پیشرفته
- ✅ ردیابی منبع Lead

### 2. **قیف فروش (Sales Funnel)**
- ✅ 8 مرحله: Discovery → Proposal → Contract → Design → Development → QA → Delivery → Support
- ✅ محاسبه احتمال بسته شدن
- ✅ ردیابی بودجه و تاریخ تحویل

### 3. **امتیازدهی RFM**
- ✅ Recency (تازگی)
- ✅ Frequency (تکرار)
- ✅ Monetary (مقدار مالی)
- ✅ Segmentation خودکار

### 4. **ماژول کوچینگ**
- ✅ برنامه‌های کوچینگ
- ✅ جلسات با یادداشت و فایل
- ✅ OKR (Objectives & Key Results)
- ✅ KPI Tracking
- ✅ تمرین‌ها و چک‌لیست
- ✅ گزارش‌های رشد

### 5. **مدیریت محتوا**
- ✅ Content Briefs
- ✅ Content Calendar
- ✅ مدیریت دارایی‌ها
- ✅ تاییدیه و نسخه‌گذاری

### 6. **اتوماسیون**
- ✅ Campaigns و Sequences
- ✅ ارسال خودکار پیام
- ✅ تریگرها و شرایط
- ✅ لاگ کامل پیام‌ها

### 7. **داشبوردها**
- ✅ داشبورد کلی با KPI‌ها
- ✅ داشبورد فروش
- ✅ داشبورد کوچینگ
- ✅ نمودارهای تعاملی

---

## 📦 وابستگی‌های اصلی

### Backend Dependencies
```json
{
  "@prisma/client": "^6.19.0",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "googleapis": "^166.0.0",
  "twilio": "^4.19.0",
  "whatsapp-web.js": "^1.23.0",
  "xlsx": "^0.18.5"
}
```

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.21.1",
  "react-query": "^3.39.3",
  "axios": "^1.6.2",
  "recharts": "^2.10.3",
  "tailwindcss": "^3.4.0",
  "vite": "^5.0.8"
}
```

---

## 🚀 راه‌اندازی

### پیش‌نیازها
- Node.js 18+
- npm یا yarn

### مراحل نصب
```bash
# 1. نصب وابستگی‌های Backend
npm install

# 2. نصب وابستگی‌های Frontend
cd client && npm install && cd ..

# 3. ایجاد فایل .env
PORT=3001
JWT_SECRET=your-secret-key

# 4. راه‌اندازی دیتابیس
npm run init:db

# 5. اجرای برنامه
npm run dev
```

### دسترسی
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **ورود پیش‌فرض**: 
  - Username: `admin`
  - Password: `admin123`

---

## 📈 وضعیت پروژه

### ✅ تکمیل شده
- [x] ساختار دیتابیس کامل (25+ جدول)
- [x] 14 Route اصلی API
- [x] 7 ماژول پیشرفته
- [x] 9 صفحه Frontend
- [x] سیستم احراز هویت
- [x] RBAC (Role-Based Access Control)
- [x] سیستم امتیازدهی Lead
- [x] محاسبه RFM
- [x] قیف فروش
- [x] ماژول کوچینگ کامل
- [x] مدیریت محتوا
- [x] داشبوردها

### 🔄 در حال توسعه
- [ ] Prisma ORM Migration
- [ ] تست‌های واحد (Unit Tests)
- [ ] تست‌های یکپارچگی (Integration Tests)
- [ ] مستندسازی API (Swagger/OpenAPI)

### 📋 پیشنهادات برای توسعه آینده
- [ ] اتصال WhatsApp Business API
- [ ] اتصال SMS Gateway
- [ ] Real-time Notifications (WebSocket)
- [ ] Customer Portal
- [ ] Import/Export Excel پیشرفته
- [ ] چندزبانه (FA/EN)
- [ ] Dark Mode
- [ ] Mobile App (React Native)
- [ ] اتصال به سیستم‌های حسابداری
- [ ] خروجی PDF برای گزارش‌ها

---

## 🏗️ معماری

### Backend Architecture
```
src/
├── server.ts              # Entry Point
├── database/
│   ├── db.ts              # Database Connection & Schema
│   └── init.ts            # Database Initialization
├── routes/                # API Routes (RESTful)
│   ├── auth.ts
│   ├── customers.ts
│   ├── leads.ts
│   ├── deals.ts
│   └── ...
├── modules/               # Business Logic Modules
│   ├── customers/
│   ├── tags/
│   ├── calendar/
│   └── ...
├── middleware/
│   └── auth.ts            # JWT Authentication
├── services/
│   └── scoring.ts         # Lead Scoring Logic
└── types/
    └── index.ts           # TypeScript Types
```

### Frontend Architecture
```
client/src/
├── main.tsx               # Entry Point
├── App.tsx                # Root Component
├── pages/                 # Page Components
│   ├── Dashboard.tsx
│   ├── Leads.tsx
│   └── ...
├── components/            # Reusable Components
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx
│   └── tags/
├── contexts/
│   └── AuthContext.tsx    # Authentication Context
├── services/
│   └── api.ts             # Axios Configuration
└── index.css              # Global Styles
```

---

## 🔍 نکات فنی

### Database
- استفاده از SQLite برای توسعه سریع
- قابلیت ارتقا به PostgreSQL/MySQL
- Foreign Keys فعال
- Indexes برای بهینه‌سازی

### API Design
- RESTful Architecture
- JSON Response Format
- Error Handling یکپارچه
- Validation با express-validator

### Frontend
- Component-Based Architecture
- React Hooks
- Context API برای State Management
- React Query برای Data Fetching
- Responsive Design با Tailwind

### Security
- Password Hashing
- JWT Token Expiration
- CORS Configuration
- Input Validation

---

## 📝 مستندات موجود

1. **README.md** - راهنمای کلی پروژه
2. **QUICKSTART.md** - راهنمای شروع سریع
3. **FINAL_SUMMARY.md** - خلاصه نهایی پروژه
4. **PROGRESS.md** - وضعیت پیشرفت
5. **TROUBLESHOOTING.md** - عیب‌یابی

---

## 🎯 نتیجه‌گیری

این پروژه یک **سیستم CRM کامل و حرفه‌ای** است که شامل:

✅ **25+ جدول دیتابیس** برای مدیریت کامل داده‌ها  
✅ **14 Route API** برای عملیات CRUD و کسب‌وکار  
✅ **7 ماژول پیشرفته** برای قابلیت‌های تخصصی  
✅ **9 صفحه Frontend** با UI/UX مدرن  
✅ **سیستم امتیازدهی** برای Lead و RFM  
✅ **ماژول کوچینگ** کامل با OKR/KPI  
✅ **مدیریت محتوا** و تقویم محتوایی  
✅ **اتوماسیون** پیام و کمپین  

پروژه آماده استفاده در محیط Development است و می‌تواند برای Production با تنظیمات امنیتی و بهینه‌سازی بیشتر آماده شود.

---

**تاریخ تحلیل**: 2025  
**نسخه پروژه**: 1.0.0  
**وضعیت**: ✅ آماده استفاده

