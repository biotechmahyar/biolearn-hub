# 📱 اپلیکیشن اندروید Genova

این پوشه **اپ اندروید سایت** را می‌سازد. اپ دقیقاً همان وب‌اپ Vite/React همین
پروژه است که داخل یک پوسته بومی اندروید (Capacitor) بسته‌بندی می‌شود؛ بنابراین
**از ریشه همین پروژه تغذیه می‌شود**: همان حساب‌ها، همان دوره‌ها، همان پنل‌ها،
همان تم تیره/روشن و همان لوگو. هیچ کدی تکرار نمی‌شود.

```
apk/
├── .github/workflows/build-apk.yml   ← ساخت خودکار APK در گیت‌هاب (مهم‌ترین فایل)
├── capacitor.config.json             ← تنظیمات اپ (نام، شناسه، اسپلش)
├── package.json                      ← وابستگی‌های Capacitor
├── android-manifest/AndroidManifest.xml  ← مانیفست برند‌شده (INTERNET، singleTask)
├── resources/
│   ├── gen_icons.py                  ← تولیدکننده آیکون‌ها از لوگوی DNA
│   ├── icon.png / splash.png         ← آیکون و اسپلش
│   └── (آیکون‌ها هنگام build داخل پروژه اندروید کپی می‌شوند)
└── src/                              ← صفحه‌بارگذار داخلی (fallback) + آیکون
```

---

## 🚀 روش ۱ — ساخت خودکار با GitHub Actions (پیشنهادی، بدون نصب چیزی)

1. پروژه را روی گیت‌هاب push کنید تا پوشه `apk/` در ریپو باشد
2. در گیت‌هاب → تب **Actions** → ورک‌فلو **«Build Genova Android APK»**
3. دکمه **Run workflow** را بزنید:
   - گزینه `convex_url`: آدرس Convex production را وارد کنید
     (مثل `https://your-deployment.convex.cloud`) — این آدرس داخل APK
     bake می‌شود. اگر خالی بگذارید از `VITE_CONVEX_URL` در `.env.local` ریپو استفاده می‌شود.
4. ۵ تا ۱۰ دقیقه صبر کنید
5. پایین صفحه، از بخش **Artifacts** فایل `genova-android-apk` را دانلود کنید
6. داخلش: **`genova-release-signed.apk`** ✅

## 🔨 روش ۲ — ساخت روی سیستم خودتان (نیاز به Android Studio + JDK 17)

```bash
# در ریشه پروژه: اول وب‌اپ را build کنید
bun install
VITE_CONVEX_URL="https://your-deployment.convex.cloud" bun run build

# بعد پوسته اندروید
cd apk
npm install
mkdir -p www && cp -r ../dist/* www/
rm -f www/convex-config.js www/index.js
npx cap add android
npx cap sync android
cp android-manifest/AndroidManifest.xml android/app/src/main/AndroidManifest.xml

# آیکون‌ها (اختیاری — پیش‌فرض خود Capacitor هم کار می‌کند)
python3 resources/gen_icons.py --size 192 --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

npx cap open android
# در اندروید استودیو: Build → Build Bundle(s)/APK(s) → Build APK(s)
```

---

## 📲 نصب روی گوشی اندروید

1. فایل `genova-release-signed.apk` را به گوشی بفرستید (تلگرام، کابل، لینک دانلود)
2. روی فایل بزنید → اگر پرسید، **«اجازه نصب از منابع ناشناس»** را فعال کنید
3. نصب می‌شود → آیکون **Genova** (لوگوی DNA با پس‌زمینه سرمه‌ای) روی صفحه گوشی
4. اپ تمام‌صفحه و بدون نوار مرورگر باز می‌شود — اولین بار صفحه ورود سایت
5. با همان ایمیل/رمز سایت وارد شوید؛ همه‌چیز (دوره‌ها، آزمون‌ها، داشبورد) همان است

> 💡 اگر ارور «Parse error» یا «App not installed» دیدید:
> - نسخه اندروید گوشی باید **7 (API 24) به بالا** باشد
> - اگر قبلاً نسخه دیگری با همین شناسه نصب کرده‌اید، اول آن را حذف کنید

---

## 🏪 انتشار در گوگل‌پلی (اختیاری، برای آینده)

- در اندروید استودیو: `Build → Generate Signed Bundle/APK → Android App Bundle`
- اکانت **Google Play Console** لازم است (پرداخت یک‌باره ۲۵ دلار)
- شناسه فعلی: `ir.nibrc.genova` (در `capacitor.config.json` قابل تغییر)

## ⚙️ شخصی‌سازی سریع

| چه چیزی | کجا |
|---------|-----|
| آدرس Convex | ورودی `convex_url` هنگام Run workflow (یا `.env.local` ریپو) |
| نام اپ | `capacitor.config.json` → `appName` |
| شناسه پکیج | `capacitor.config.json` → `appId` |
| آیکون / اسپلش | `apk/resources/` (توسط `gen_icons.py` از لوگوی DNA ساخته می‌شود) |
| نسخه اندروید | `apk/android/app/build.gradle` بعد از `cap add` |

## ❓ سوالات رایج

**اپ و سایت چه فرقی دارند؟**
هیچ — اپ همان سایت است داخل پوسته اندروید. داده‌ها و حساب‌ها مشترک‌اند و
هر تغییری در سایت بلافاصله در اپ هم هست (بدون نیاز به آپدیت APK).

**آیا اپ آفلاین کار می‌کند؟**
برای محتوایی که قبلاً باز شده، کش مرورگر کمک می‌کند؛ ولی اپ ماهیتاً آنلاین است
(چون داده‌ها زنده از Convex می‌آیند).

**امنیت؟**
رمزها در Convex Auth هش می‌شوند و اپ فقط یک WebView به همان سایت است؛
آدرس Convex عمومی است و امنیت روی بک‌اند اعمال می‌شود.
