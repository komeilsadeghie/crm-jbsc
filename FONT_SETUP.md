# راهنمای نصب فونت فارسی

## مشکل فعلی

فونت Vazirmatn به درستی دانلود نشده یا فرمت آن مشکل دارد. 

## راه حل: دانلود دستی فونت

### گزینه 1: Vazirmatn (پیشنهاد می‌شود)

1. به این آدرس بروید: https://github.com/rastikerdar/vazirmatn/releases/latest
2. فایل `Vazirmatn-Regular.ttf` را دانلود کنید
3. فایل را در پوشه `fonts/` قرار دهید:
   ```
   fonts/Vazirmatn-Regular.ttf
   ```

### گزینه 2: IRANSans

1. به این آدرس بروید: https://github.com/rastikerdar/iranian-sans/releases/latest
2. فایل `IRANSans-Regular.ttf` را دانلود کنید
3. فایل را در پوشه `fonts/` قرار دهید
4. در فایل `src/services/pdf-generator.ts` نام فونت را تغییر دهید:
   ```typescript
   // خط 269-275 را تغییر دهید:
   const fontPaths = [
     path.join(process.cwd(), 'fonts/IRANSans-Regular.ttf'),
     // ...
   ];
   ```

### گزینه 3: Shabnam

1. به این آدرس بروید: https://github.com/rastikerdar/shabnam-font/releases/latest
2. فایل `Shabnam-Regular.ttf` را دانلود کنید
3. فایل را در پوشه `fonts/` قرار دهید
4. در فایل `src/services/pdf-generator.ts` نام فونت را تغییر دهید

## بعد از دانلود

1. سرور را restart کنید
2. PDF قرارداد را دوباره تولید کنید
3. بررسی کنید که متن فارسی به درستی نمایش داده می‌شود

## بررسی فونت

برای بررسی اینکه فونت به درستی اضافه شده است:

```bash
node scripts/test-persian-pdf.js
```

اگر پیام "✅ Font registered successfully" را دیدید، فونت به درستی اضافه شده است.

