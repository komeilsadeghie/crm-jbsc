# فونت‌های فارسی برای PDF

برای نمایش صحیح متن فارسی در PDF، باید یک فونت فارسی در این پوشه قرار دهید.

## فونت‌های پیشنهادی

1. **Vazirmatn** (پیشنهاد می‌شود)
   - دانلود از: https://github.com/rastikerdar/vazirmatn
   - فایل مورد نیاز: `Vazirmatn-Regular.ttf`

2. **IRANSans**
   - دانلود از: https://github.com/rastikerdar/iranian-sans
   - فایل مورد نیاز: `IRANSans-Regular.ttf`

3. **Shabnam**
   - دانلود از: https://github.com/rastikerdar/shabnam-font
   - فایل مورد نیاز: `Shabnam-Regular.ttf`

## نحوه استفاده

1. فایل فونت را دانلود کنید (مثلاً `Vazirmatn-Regular.ttf`)
2. فایل را در این پوشه (`fonts/`) قرار دهید
3. سیستم به صورت خودکار فونت را پیدا کرده و استفاده می‌کند

## مسیرهای جستجو

سیستم به ترتیب در مسیرهای زیر به دنبال فونت می‌گردد:
- `fonts/Vazirmatn-Regular.ttf`
- `src/fonts/Vazirmatn-Regular.ttf`
- `dist/fonts/Vazirmatn-Regular.ttf`

## نکته

اگر فونت فارسی پیدا نشود، سیستم از فونت پیش‌فرض استفاده می‌کند که ممکن است نمایش فارسی را به درستی انجام ندهد.

