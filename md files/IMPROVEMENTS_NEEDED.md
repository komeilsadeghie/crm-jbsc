# فهرست بهبودهای مورد نیاز

این سند فهرست کامل بهبودهای مورد نیاز پروژه را بر اساس مقایسه با Perfex CRM ارائه می‌دهد.

---

## 🔴 اولویت بالا (Critical) - باید فوراً انجام شود

### 1. مدیریت آیتم‌های فاکتور (Invoice Items Management)
**وضعیت فعلی**: Backend موجود است اما UI کامل نیست
**نیاز به**:
- UI کامل برای افزودن/ویرایش/حذف آیتم‌ها
- Drag & Drop برای تغییر ترتیب آیتم‌ها
- کپی آیتم‌ها از Estimate به Invoice
- محاسبه خودکار مالیات و مجموع

**فایل‌های مرتبط**:
- `client/src/pages/Invoices.tsx` - نیاز به بهبود
- `src/routes/invoices.ts` - Backend موجود است ✅

---

### 2. فاکتورهای تکراری (Recurring Invoices)
**وضعیت فعلی**: جدول موجود است اما Automation ندارد
**نیاز به**:
- UI برای ایجاد و مدیریت فاکتورهای تکراری
- Cron Job برای ایجاد خودکار فاکتورها
- اعلان‌های انقضا و توقف
- مدیریت چرخه‌های تکراری

**فایل‌های مرتبط**:
- `src/routes/recurring-invoices.ts` - نیاز به بررسی
- نیاز به Cron Job System

---

### 3. درگاه‌های پرداخت (Payment Gateways)
**وضعیت فعلی**: جدول موجود است اما Integration ندارد
**نیاز به**:
- Integration با PayPal
- Integration با Stripe
- Integration با درگاه‌های ایرانی (زرین‌پال، پی‌پینگ)
- پردازش پرداخت‌ها
- Webhook Handling

**فایل‌های مرتبط**:
- `src/routes/payment-gateways.ts` - نیاز به Integration
- نیاز به Service جدید برای Payment Processing

---

### 4. لاگ فعالیت‌ها (Activity Log)
**وضعیت فعلی**: جدول موجود است اما Implementation کامل نیست
**نیاز به**:
- Middleware برای لاگ تمام فعالیت‌ها
- UI برای مشاهده لاگ‌ها
- فیلتر و جستجو
- Export لاگ‌ها

**فایل‌های مرتبط**:
- `src/utils/activityLogger.ts` - موجود است اما نیاز به بهبود
- `src/routes/activity-log.ts` - نیاز به بررسی
- `client/src/pages/ActivityLog.tsx` - نیاز به بهبود UI

---

### 5. رمزگذاری داده‌های حساس (Data Encryption)
**وضعیت فعلی**: ❌ موجود نیست
**نیاز به**:
- رمزگذاری API Keys
- رمزگذاری Passwords (در حال حاضر Hash است اما نیاز به Encryption برای داده‌های دیگر)
- رمزگذاری اطلاعات حساس مشتریان
- Key Management System

**فایل‌های مرتبط**:
- `src/utils/encryption.ts` - موجود است اما نیاز به بررسی
- نیاز به بهبود Encryption Service

---

### 6. بهبود وظایف (Task Enhancements)
**وضعیت فعلی**: Backend پیشرفته است اما برخی ویژگی‌ها مفقود است
**نیاز به**:
- **Multi-assign**: اختصاص تسک به چند نفر
- **Comments**: سیستم کامنت با @mention
- **Attachments**: آپلود و مدیریت فایل‌ها
- **Followers**: دنبال‌کنندگان تسک

**فایل‌های مرتبط**:
- `src/routes/tasks.ts` - نیاز به API برای Multi-assign, Comments, Attachments
- `client/src/pages/Tasks.tsx` - نیاز به UI کامل

---

## 🟡 اولویت متوسط (High) - باید در فاز بعدی انجام شود

### 7. بهبود پورتال مشتری (Client Portal Enhancement)
**نیاز به**:
- نمایش کامل فاکتورها با امکان دانلود
- نمایش پیش‌فاکتورها
- مشاهده قراردادها
- مشاهده پروژه‌ها و فایل‌ها
- پرداخت آنلاین

**فایل‌های مرتبط**:
- `src/routes/client-portal.ts` - موجود است اما نیاز به بهبود
- `client/src/pages/` - نیاز به صفحات Client Portal

---

### 8. ماژول کامل پروپوزال‌ها (Proposals Full Module)
**نیاز به**:
- Accept/Decline Workflow
- PDF Generation حرفه‌ای
- Notifications برای تغییرات
- Tracking بازدید و بازخورد

**فایل‌های مرتبط**:
- `src/routes/proposals.ts` - موجود است اما نیاز به بهبود
- `client/src/pages/Proposals.tsx` - نیاز به UI کامل

---

### 9. پاسخ خودکار تیکت‌ها (Ticket Auto-response)
**نیاز به**:
- سیستم پاسخ خودکار
- قوانین Auto-assign
- Canned Replies Integration
- SLA Management

**فایل‌های مرتبط**:
- `src/routes/tickets.ts` - نیاز به Auto-response Engine
- نیاز به Rule Engine

---

### 10. هزینه‌های تکراری (Recurring Expenses)
**نیاز به**:
- UI برای ایجاد هزینه‌های تکراری
- Automation برای ایجاد خودکار
- مدیریت چرخه‌ها

**فایل‌های مرتبط**:
- `src/routes/expenses.ts` - نیاز به Recurring Logic
- نیاز به Migration برای Recurring Expenses Table

---

### 11. Integration ایمیل و پیامک (Email/SMS Integration)
**نیاز به**:
- اتصال به SMTP Server
- ارسال ایمیل از طریق Templates
- اتصال به سرویس SMS
- ارسال پیامک
- Queue System برای پردازش

**فایل‌های مرتبط**:
- نیاز به Email Service جدید
- نیاز به SMS Service جدید
- نیاز به Queue System (Bull/BullMQ)

---

### 12. UI نمودار گانت (Gantt Chart UI)
**وضعیت فعلی**: داده‌ها موجود است اما UI ندارد
**نیاز به**:
- Component برای Gantt Chart
- Drag & Drop برای Timeline
- نمایش Dependencies
- Zoom و Pan

**فایل‌های مرتبط**:
- نیاز به Library: `react-gantt-chart` یا `dhtmlx-gantt`
- `client/src/components/GanttChart.tsx` - نیاز به ایجاد

---

### 13. UI تقویم (Calendar UI)
**نیاز به**:
- Component کامل برای تقویم
- View های مختلف (Month, Week, Day)
- Event Notifications
- Recurring Events

**فایل‌های مرتبط**:
- `client/src/pages/Calendar.tsx` - موجود است اما نیاز به بهبود
- نیاز به Library: `react-big-calendar` یا `fullcalendar`

---

### 14. گزارش‌های سفارشی (Custom Reports)
**نیاز به**:
- Report Builder UI
- انتخاب فیلدها و فیلترها
- Scheduling Reports
- Export به فرمت‌های مختلف

**فایل‌های مرتبط**:
- `src/routes/reports.ts` - موجود است اما نیاز به Builder API
- `client/src/pages/Reports.tsx` - نیاز به Builder UI

---

## 🟢 اولویت پایین (Medium) - می‌تواند بعداً انجام شود

### 15. یادآوری پیش‌فاکتورها (Estimate Reminders)
- یادآوری خودکار برای پیش‌فاکتورهای منقضی شده
- Email Notifications

### 16. Integration ایمیل قراردادها (Contract Email Integration)
- ارسال خودکار قراردادها
- امضای دیجیتال

### 17. Builder نظرسنجی‌ها (Survey Builder)
- UI برای ساخت نظرسنجی
- انواع سوالات مختلف
- توزیع نظرسنجی

### 18. UI کتابخانه رسانه (Media Library UI)
- UI کامل برای مدیریت فایل‌ها
- پوشه‌های کاربری
- اشتراک‌گذاری فایل‌ها

### 19. Google reCaptcha
- حفاظت از فرم‌های ورود
- حفاظت از Web-to-Lead Forms

### 20. پشتیبان‌گیری خودکار دیتابیس (Database Backup)
- Cron Job برای Backup
- ذخیره Backup در Cloud
- Restore Functionality

### 21. سفارشی‌سازی منو (Menu Customization)
- Drag & Drop برای منو
- Reorder Items
- Hide/Show Items

### 22. سفارشی‌سازی تم (Theme Customization)
- انتخاب رنگ‌ها
- Custom CSS Support
- Dark Mode

---

## 📋 چک‌لیست اجرایی

### فاز 1: Critical Improvements (هفته 1-2)

- [ ] Invoice Items Management UI
- [ ] Recurring Invoices Automation
- [ ] Payment Gateway Integration (حداقل یک درگاه)
- [ ] Activity Log Implementation
- [ ] Data Encryption Service
- [ ] Task Multi-assign API & UI
- [ ] Task Comments API & UI
- [ ] Task Attachments API & UI

### فاز 2: High Priority Improvements (هفته 3-4)

- [ ] Client Portal Enhancement
- [ ] Proposals Full Module
- [ ] Ticket Auto-response
- [ ] Recurring Expenses
- [ ] Email Integration
- [ ] SMS Integration
- [ ] Gantt Chart UI
- [ ] Calendar UI Enhancement

### فاز 3: Medium Priority Improvements (هفته 5-6)

- [ ] Custom Reports Builder
- [ ] Estimate Reminders
- [ ] Contract Email Integration
- [ ] Survey Builder
- [ ] Media Library UI
- [ ] Google reCaptcha
- [ ] Database Backup System

---

## 🔧 پیشنهادات فنی

### 1. اضافه کردن Queue System
```bash
npm install bullmq ioredis
```
برای پردازش Email/SMS و Cron Jobs

### 2. اضافه کردن Libraries برای UI
```bash
npm install react-big-calendar react-gantt-chart
npm install @fullcalendar/react @fullcalendar/daygrid
```

### 3. اضافه کردن Payment Gateway SDKs
```bash
npm install paypal-rest-sdk stripe
npm install zarinpal-checkout
```

### 4. اضافه کردن Encryption Library
```bash
npm install crypto-js
# یا استفاده از built-in crypto در Node.js
```

---

## 📊 آمار بهبودها

- **اولویت بالا**: 6 مورد
- **اولویت متوسط**: 8 مورد
- **اولویت پایین**: 8 مورد
- **جمع کل**: 22 مورد

---

## 🎯 نتیجه‌گیری

پروژه پایه قوی دارد اما برای رسیدن به سطح Production و رقابت با Perfex CRM، نیاز به بهبود در موارد فوق دارد. با اولویت‌بندی صحیح و اجرای مرحله‌ای، می‌توان به هدف رسید.

**توصیه**: شروع با فاز 1 (Critical Improvements) و سپس ادامه با فاز 2 و 3.

---

**تاریخ ایجاد**: 2025-01-07
**آخرین به‌روزرسانی**: 2025-01-07

