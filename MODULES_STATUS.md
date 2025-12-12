# وضعیت ماژول‌های CRM

## ✅ ماژول‌های تکمیل شده

### 1. Estimates/Quotes (پیش‌فاکتورها)
- ✅ ساخت پیش‌فاکتور با فیلدهای قرارداد/سایت
- ✅ تبدیل به Invoice با یک کلیک
- ✅ تولید PDF با جزئیات کامل
- ✅ چاپ و دانلود PDF
- ✅ فیلدهای قرارداد: نوع، دامنه، هاستینگ، SSL، پشتیبانی، SEO، صفحات، زبان‌ها، شرایط پرداخت، تحویل، ضمانت

**Route:** `/api/estimates`
**Frontend:** `client/src/pages/Estimates.tsx`

---

### 2. Tasks (وظایف) - پیشرفته
- ✅ چک‌لیست (Checklist)
- ✅ زیرتسک‌ها (Subtasks)
- ✅ تسک‌های تکراری (Recurring Tasks)
- ✅ تایمر زمان (Time Tracking Timer)
- ✅ وابستگی‌ها (Dependencies)
- ✅ نمای Kanban
- ✅ آماده برای Gantt (داده‌ها موجود است)

**Routes:**
- `/api/tasks` - CRUD
- `/api/tasks/:id` - جزئیات کامل
- `/api/tasks/kanban/board` - نمای Kanban
- `/api/tasks/:id/position` - تغییر موقعیت
- `/api/tasks/:id/dependencies` - افزودن وابستگی
- `/api/tasks/:id/time/start` - شروع تایمر
- `/api/tasks/:id/time/:logId/stop` - توقف تایمر
- `/api/tasks/:id/time` - لاگ‌های زمان

---

### 3. Client Portal (پرتال مشتری)
- ✅ ورود کانتکت‌ها (JWT Authentication)
- ✅ مشاهده فاکتورها
- ✅ مشاهده پیش‌فاکتورها
- ✅ قبول پیش‌فاکتور
- ✅ ایجاد و مشاهده تیکت‌ها
- ✅ دسترسی به فایل‌های پروژه

**Route:** `/api/client-portal`
**Authentication:** Contact JWT Token

---

### 4. Contacts & Permissions (مخاطبین و دسترسی‌ها)
- ✅ سطح دسترسی هر کانتکت روی ماژول‌ها
- ✅ View/Edit Permissions
- ✅ بررسی دسترسی

**Route:** `/api/contact-permissions`

---

### 5. Contracts (قراردادها)
- ✅ CRUD قراردادها
- ✅ تاریخ انقضا
- ✅ یادآور انقضا (Expiring Soon)
- ✅ تمدید خودکار (Auto Renew)
- ✅ تمدید دستی (Renewal Endpoint)

**Routes:**
- `/api/contracts` - CRUD
- `/api/contracts/expiring-soon` - قراردادهای در حال انقضا
- `/api/contracts/:id/renew` - تمدید قرارداد

---

### 6. Reports & Dashboard (گزارش‌ها و داشبورد)
- ✅ گزارش‌های فروش
- ✅ گزارش‌های پرداخت
- ✅ گزارش‌های هزینه
- ✅ گزارش‌های زمان (Time Tracking)
- ✅ Dashboard KPIs
- ✅ UI Glassmorphism (Apple-style) ✅

**Routes:**
- `/api/reports/sales`
- `/api/reports/payments`
- `/api/reports/expenses`
- `/api/reports/time`
- `/api/reports/dashboard/kpis`

**Frontend:** `client/src/pages/Dashboard.tsx` (با Glassmorphism)

---

### 7. Calendar (تقویم یکپارچه)
- ✅ رویدادها (Tasks)
- ✅ سررسید فاکتورها
- ✅ سررسید قراردادها
- ✅ Milestones پروژه‌ها
- ✅ رنگ‌بندی بر اساس نوع

**Route:** `/api/calendar/unified/events`

---

### 8. Leads & Marketing (سرنخ‌ها و مارکتینگ)
- ✅ Leads Kanban با Stageهای سفارشی
- ✅ Drag & Drop Position
- ✅ Web-to-Lead Forms (Public Endpoint)
- ✅ تبدیل Lead به Customer
- ✅ Lead Scoring

**Routes:**
- `/api/leads` - CRUD
- `/api/leads/kanban/board` - نمای Kanban
- `/api/leads/:id/position` - تغییر موقعیت
- `/api/leads/:id/convert` - تبدیل به Customer
- `/api/leads/web-form/:formKey` - Public Form Submission
- `/api/leads/web-forms` - مدیریت فرم‌ها

---

### 9. Sales Goals/KPI (اهداف فروش)
- ✅ اهداف فروش ماهانه/سالانه
- ✅ Progress Tracking
- ✅ Period-based Goals

**Route:** `/api/sales-goals`

---

### 10. Email/SMS Templates (قالب‌های ایمیل/پیامک)
- ✅ Email Templates با Merge Fields
- ✅ SMS Templates با Merge Fields
- ✅ Send Functionality (Ready for Integration)

**Routes:**
- `/api/email-templates`
- `/api/sms-templates`
- `/api/email-templates/:id/send`
- `/api/sms-templates/:id/send`

---

### 11. Custom Fields & Tags (فیلدهای سفارشی و تگ‌ها)
- ✅ Custom Fields برای هر Entity
- ✅ Custom Field Values
- ✅ Tags (موجود در سیستم)
- ✅ Filters (در همه ماژول‌ها)

**Routes:**
- `/api/custom-fields`
- `/api/tags` (موجود)

---

### 12. Support (پشتیبانی)
- ✅ Tickets با دپارتمان/اولویت/SLA
- ✅ پاسخ‌های آماده (Canned Replies) - CRUD کامل
- ✅ ضمیمه/یادداشت داخلی
- ✅ Ticket Replies
- ✅ Ticket Departments

**Routes:**
- `/api/tickets` - CRUD
- `/api/tickets/:id/replies` - پاسخ‌ها
- `/api/tickets/canned-replies` - پاسخ‌های آماده
- `/api/tickets/departments` - دپارتمان‌ها

---

### 13. Knowledge Base (پایگاه دانش)
- ✅ مقالات دسته‌بندی‌شده
- ✅ جستجو
- ✅ Categories

**Route:** `/api/knowledge-base`

---

### 14. Projects (پروژه‌ها)
- ✅ CRUD Projects
- ✅ Milestones
- ✅ Discussions
- ✅ Files
- ✅ Expenses مرتبط
- ✅ Tasks مرتبط

**Route:** `/api/projects`

---

### 15. Time Tracking (ردیابی زمان)
- ✅ Start/Stop Timer
- ✅ Time Logs
- ✅ Billable Hours
- ✅ Reports

**Routes:**
- `/api/tasks/:id/time/start`
- `/api/tasks/:id/time/:logId/stop`
- `/api/tasks/:id/time`
- `/api/reports/time`

---

### 16. Expenses (هزینه‌ها)
- ✅ CRUD Expenses
- ✅ Categories
- ✅ Receipt File Path
- ✅ Invoiceable Flag
- ✅ Reports

**Routes:**
- `/api/expenses`
- `/api/expenses/categories`
- `/api/reports/expenses`

---

## 📋 خلاصه Backend Routes

همه routeها در `src/server.ts` ثبت شده‌اند:
- ✅ `/api/estimates`
- ✅ `/api/tasks`
- ✅ `/api/client-portal`
- ✅ `/api/contact-permissions`
- ✅ `/api/contracts`
- ✅ `/api/reports`
- ✅ `/api/calendar/unified`
- ✅ `/api/leads`
- ✅ `/api/sales-goals`
- ✅ `/api/email-templates`
- ✅ `/api/sms-templates`
- ✅ `/api/custom-fields`
- ✅ `/api/tickets`
- ✅ `/api/knowledge-base`
- ✅ `/api/projects`
- ✅ `/api/expenses`

---

## 🎨 UI Glassmorphism

✅ Dashboard با Glassmorphism کامل:
- Background gradient
- Backdrop blur effects
- Semi-transparent cards
- Smooth transitions
- Hover effects
- Gradient text
- Shadow effects

**File:** `client/src/pages/Dashboard.tsx`

---

## ⚠️ موارد باقی‌مانده

### Frontend UI Pages (نیاز به ساخت):
1. Tasks Advanced UI (Kanban, Checklist, Subtasks)
2. Leads Kanban UI
3. Contracts UI
4. Tickets UI
5. Projects UI
6. Expenses UI
7. Reports UI
8. Calendar UI
9. Email/SMS Templates UI
10. Custom Fields UI
11. Knowledge Base UI
12. Client Portal UI (برای contacts)

---

## 🧪 تست و یکپارچه‌سازی

- ✅ Backend APIs کامل
- ✅ Database Schema کامل
- ✅ Migrations موجود
- ⏳ Frontend UI (باقی مانده)
- ⏳ Integration Testing (بعد از Frontend)

---

## 📝 نکات مهم

1. **Database Migrations:** 
   - `src/database/migrate-estimates.ts` - برای فیلدهای جدید estimates
   - `src/database/migrate-contacts-portal.ts` - برای portal fields

2. **Authentication:**
   - User Authentication: JWT Token
   - Contact Portal Authentication: JWT Token (type: 'contact')

3. **PDF Generation:**
   - استفاده از `pdfkit`
   - پشتیبانی از فارسی و تاریخ شمسی

4. **Error Handling:**
   - همه routeها دارای error handling هستند
   - پیام‌های خطا به فارسی

5. **Code Optimization:**
   - استفاده از prepared statements
   - Query optimization
   - Proper indexing در schema

---

## 🚀 مراحل بعدی

1. ساخت Frontend UI برای ماژول‌های جدید
2. تست یکپارچه‌سازی
3. بهینه‌سازی عملکرد
4. Documentation کامل

---

**آخرین به‌روزرسانی:** تمام ماژول‌های Backend تکمیل شده‌اند ✅

