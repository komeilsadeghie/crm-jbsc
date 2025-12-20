# راهنمای Migration جداول

## مشکل فعلی

فقط دو جدول `users` و `customers` در دیتابیس وجود دارد. بقیه جداول باید توسط migration ها ساخته شوند.

## جداول که باید ساخته شوند

### جداول اصلی (توسط initDatabase):
- ✅ `users` - ساخته شده
- ✅ `customers` - ساخته شده

### جداول که توسط Migration ها ساخته می‌شوند:

1. **Tasks & Projects:**
   - `tasks` (اگر در initDatabase نیست)
   - `task_followers`
   - `task_assignees`
   - `task_comments`
   - `task_attachments`
   - `task_kanban_columns`
   - `projects`

2. **Invoices & Payments:**
   - `invoices` (اگر در initDatabase نیست)
   - `invoice_items`
   - `recurring_invoices`
   - `payment_gateways`
   - `payment_transactions`

3. **Estimates & Contracts:**
   - `estimates`
   - `contracts`

4. **Proposals:**
   - `proposals`
   - `proposal_items`
   - `proposal_attachments`

5. **Surveys:**
   - `surveys`
   - `survey_questions`
   - `survey_responses`

6. **Templates:**
   - `pdf_templates`

7. **Other:**
   - `contacts`
   - `accounts`
   - `deals`
   - `leads`
   - `expenses`
   - `activity_log`
   - `permissions`
   - `role_permissions`
   - `user_permissions`

## راه‌حل

### روش 1: Deploy مجدد در Railway (پیشنهادی)

1. **Commit و Push تغییرات:**
   ```bash
   git add .
   git commit -m "Fix all PRAGMA table_info for MySQL compatibility"
   git push
   ```

2. **Railway به صورت خودکار deploy می‌کند**

3. **بررسی لاگ‌ها:**
   - به Railway Dashboard بروید
   - بخش **Deploy Logs** را بررسی کنید
   - باید این پیام‌ها را ببینید:
     ```
     ✅ All database tables initialized successfully
     🔄 Migrating estimates table...
     🔄 Migrating tasks table...
     🔄 Migrating contacts table...
     ...
     ✅ Created surveys table
     ✅ Created proposals table
     ...
     ```

### روش 2: اجرای دستی Migration ها

اگر migration ها خودکار اجرا نشدند، می‌توانید از Railway Terminal استفاده کنید:

1. **به Railway Dashboard بروید**
2. **روی پروژه کلیک کنید**
3. **به بخش Terminal بروید**
4. **این دستورات را اجرا کنید:**

```bash
# اگر در production هستید
cd /app
node dist/database/migrate-surveys.js
node dist/database/migrate-proposals.js
node dist/database/migrate-invoices.js
node dist/database/migrate-tasks-enhanced.js
node dist/database/migrate-payment-gateways.js
node dist/database/migrate-pdf-templates.js
node dist/database/migrate-task-kanban-columns.js
```

**نکته:** این فایل‌ها باید بعد از build در `dist/database/` باشند.

## بررسی جداول موجود

برای بررسی اینکه کدام جداول ساخته شده‌اند:

### در MySQL (Railway Terminal):
```sql
SHOW TABLES;
```

### یا از طریق API:
اگر API برای لیست جداول دارید، استفاده کنید.

## عیب‌یابی

### اگر migration ها اجرا نشدند:

1. **بررسی لاگ‌های Railway:**
   - دنبال خطاهای `PRAGMA table_info` بگردید
   - اگر هنوز این خطاها را می‌بینید، یعنی کد جدید deploy نشده است

2. **بررسی DATABASE_URL:**
   - مطمئن شوید که `DATABASE_URL` درست تنظیم شده است
   - بررسی کنید که MySQL service فعال است

3. **Restart سرور:**
   - در Railway، سرور را restart کنید
   - migration ها باید هنگام startup اجرا شوند

4. **بررسی build:**
   - مطمئن شوید که TypeScript به JavaScript compile شده است
   - فایل‌های `dist/database/*.js` باید وجود داشته باشند

## نکات مهم

1. **Migration ها باید idempotent باشند:**
   - یعنی اگر دوباره اجرا شوند، خطا ندهند
   - از `CREATE TABLE IF NOT EXISTS` استفاده می‌کنند
   - از `INSERT IGNORE` یا `INSERT OR IGNORE` استفاده می‌کنند

2. **ترتیب اجرا مهم است:**
   - بعضی جداول به جداول دیگر وابسته هستند (foreign keys)
   - migration ها در `server.ts` به ترتیب درست اجرا می‌شوند

3. **خطاهای احتمالی:**
   - اگر جدول از قبل وجود دارد، خطا نمی‌دهد (IF NOT EXISTS)
   - اگر ستون از قبل وجود دارد، ممکن است خطا بدهد (باید handle شود)

## بعد از اجرای Migration ها

بعد از اینکه همه migration ها اجرا شدند، باید این جداول را ببینید:

- ✅ users
- ✅ customers
- ✅ tasks
- ✅ task_followers
- ✅ task_assignees
- ✅ task_comments
- ✅ task_attachments
- ✅ task_kanban_columns
- ✅ invoices
- ✅ invoice_items
- ✅ recurring_invoices
- ✅ payment_gateways
- ✅ payment_transactions
- ✅ estimates
- ✅ contracts
- ✅ proposals
- ✅ proposal_items
- ✅ proposal_attachments
- ✅ surveys
- ✅ survey_questions
- ✅ survey_responses
- ✅ pdf_templates
- ✅ contacts
- ✅ accounts
- ✅ deals
- ✅ leads
- ✅ expenses
- ✅ activity_log
- ✅ permissions
- ✅ role_permissions
- ✅ user_permissions

اگر همه این جداول را دیدید، migration ها با موفقیت اجرا شده‌اند! 🎉

