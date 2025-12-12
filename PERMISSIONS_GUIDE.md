# راهنمای دسترسی‌های سیستم CRM

## نقش‌های تعریف شده

1. **admin** - مدیر سیستم
2. **sales** - فروش
3. **sales_manager** - مدیر فروش
4. **coach** - کوچ
5. **media** - مدیا
6. **media_manager** - مدیر مدیا
7. **designer** - طراح سایت
8. **finance** - مالی
9. **user** - کاربر عادی

## دسترسی‌های مشترک (همه نقش‌ها)

همه نقش‌ها به این بخش‌ها دسترسی دارند:
- ✅ تیکت‌ها (`/tickets`)
- ✅ پروپوزال‌ها (`/proposals`)
- ✅ پایگاه دانش (`/knowledge-base`)
- ✅ وظایف (`/tasks`)
- ✅ پروژه‌ها (`/projects`)
- ✅ تقویم (`/calendar`)
- ✅ پروفایل (`/profile`)

## دسترسی‌های اختصاصی هر نقش

### Admin (مدیر سیستم)
- دسترسی به **همه** بخش‌ها
- تنظیمات سیستم (`/settings`)
- لاگ فعالیت‌ها (`/activity-log`)

### Sales (فروش)
- سرنخ‌ها (`/leads`)
- معاملات (`/deals`)
- مشتریان (`/customers`)
- پیش‌فاکتورها (`/estimates`)
- قراردادها (`/contracts`)
- هزینه‌ها (`/expenses`)
- قالب‌های ایمیل (`/email-templates`)
- گزارش‌ها (`/reports`)
- مانیتورینگ VOIP (`/voip/monitoring`)

### Sales Manager (مدیر فروش)
- همه دسترسی‌های Sales
- دسترسی کامل به بخش‌های فروش

### Coach (کوچ)
- مشتریان (`/customers`)
- کوچینگ (`/coaching`)
- نظرسنجی‌ها (`/surveys`)
- گزارش‌ها (`/reports`)

### Media (مدیا)
- مدیا (`/media`)
- نظرسنجی‌ها (`/surveys`)
- مانیتورینگ VOIP (`/voip/monitoring`)
- لاگ‌های VOIP (`/voip/logs`)
- گزارش‌ها (`/reports`)

### Media Manager (مدیر مدیا)
- همه دسترسی‌های Media
- دسترسی کامل به بخش‌های مدیا

### Designer (طراح سایت)
- پروژه‌ها (`/projects`) - فقط پروژه‌های طراحی
- دسترسی به بخش‌های مشترک

### Finance (مالی)
- پیش‌فاکتورها (`/estimates`)
- قراردادها (`/contracts`)
- هزینه‌ها (`/expenses`)
- درگاه‌های پرداخت (`/payment-gateways`)
- گزارش‌ها (`/reports`)

### User (کاربر عادی)
- فقط دسترسی به بخش‌های مشترک
- مشتریان (`/customers`)

## نحوه تست دسترسی‌ها

### تست دسترسی در Frontend

1. با نقش‌های مختلف لاگین کنید
2. بررسی کنید که فقط منوهای مجاز نمایش داده می‌شوند
3. تلاش برای دسترسی مستقیم به URL‌های غیرمجاز باید به داشبورد هدایت شود

### تست دسترسی در Backend

```javascript
// در backend باید middleware برای بررسی دسترسی‌ها اضافه شود
// مثال:
const checkPermission = (requiredRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (userRole === 'admin' || requiredRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
  };
};
```

## فایل‌های مرتبط

- `client/src/utils/permissions.ts` - تعریف دسترسی‌ها
- `client/src/components/Layout.tsx` - فیلتر منوها بر اساس دسترسی
- `client/src/components/ProtectedRoute.tsx` - محافظت از route‌ها
- `client/src/App.tsx` - استفاده از ProtectedRoute برای همه route‌ها
- `client/src/contexts/AuthContext.tsx` - تعریف نقش‌ها

## نکات مهم

1. **Admin همیشه دسترسی دارد**: نقش admin به همه بخش‌ها دسترسی دارد
2. **Route Protection**: همه route‌ها با `ProtectedRoute` محافظت می‌شوند
3. **Menu Filtering**: منوها در sidebar بر اساس دسترسی کاربر فیلتر می‌شوند
4. **Backend Validation**: باید در backend هم دسترسی‌ها بررسی شوند

## مثال استفاده

```typescript
import { ROUTE_PERMISSIONS, hasPermission } from './utils/permissions';
import { useAuth } from './contexts/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();
  
  // بررسی دسترسی
  if (hasPermission('/leads', user.role)) {
    // نمایش بخش سرنخ‌ها
  }
  
  return <div>...</div>;
};
```

