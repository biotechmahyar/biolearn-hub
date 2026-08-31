# NIBRC Iran Mirror

نسخه آینه‌ای سایت اصلی NIBRC برای کاربران ایرانی.

## شروع سریع

### روش ۱: یک دستور
```bash
bash start.sh
```

### روش 2: دستی
```bash
# بک‌اند
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # یا .env خودت رو بساز
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# فرانت (اگه Node.js داری)
cd ../frontend
npm install
npm run build
```

## تنظیم `.env`

```bash
# آدرس سایت اصلی
MAIN_SITE_URL=https://nibrc.ir

# رمز سینک (باید با سایت اصلی یکی باشه)
SYNC_API_KEY=your-secret-key

# دیتابیس
DATABASE_URL=sqlite:///./data/genova.db
```

## ساختار

```
iran-version/
├── backend/          ← Python (FastAPI)
│   ├── app/          ← کد اصلی
│   ├── data/         ← دیتابیس SQLite
│   └── requirements.txt
├── frontend/         ← React (Vite)
│   ├── src/          ← کد فرانت
│   └── dist/         ← فایل build شده
├── start.sh          ← اجرای ساده
└── docker-compose.yml
```

## API Endpoints

### محتوا
- `GET /api/content/courses` — لیست دوره‌ها
- `GET /api/content/courses/:slug` — جزئیات دوره
- `GET /api/content/instructors` — لیست اساتید
- `GET /api/content/articles` — لیست مقالات
- `GET /api/content/products` — لیست محصولات
- `GET /api/content/workshops` — لیست کارگاه‌ها
- `GET /api/content/dictionary` — جستجوی دیکشنری
- `GET /api/content/exams` — لیست آزمون‌ها

### احراز هویت
- `POST /api/auth/register` — ثبت‌نام
- `POST /api/auth/login` — ورود
- `GET /api/auth/me` — اطلاعات کاربر

### آفلاین
- `POST /api/offline/enroll` — ثبت‌نام در دوره
- `GET /api/offline/enrollments` — لیست ثبت‌نام‌ها
- `POST /api/offline/sync-back` — ارسال تغییرات به سایت اصلی

### سینک
- `POST /api/sync/trigger` — سینک دستی
- `GET /api/sync/status` — وضعیت سینک

## هاست‌های پیشنهادی ایران

| هاست | نوع | هزینه |
|------|-----|-------|
| ابرآروان | VPS | ۲۰۰-۴۰۰ هزار تومان/ماه |
| پارس‌پک | VPS | ۲۰۰-۴۰۰ هزار تومان/ماه |
| چابکان | Python | رایگان تا پولید |
| ریکتوم | React | رایگان |

## نکات فنی

- **دیتابیس:** SQLite (پیش‌فرض) یا PostgreSQL
- **سینک:** هر ۳۰ دقیقه خودکار از سایت اصلی
- **آفلاین:** تغییرات در صف `offline_changes` ذخیره میشه
- **امنیت:** رمز عبور با PBKDF2 رمزنگاری میشه
- **توکن:** در فایل `data/tokens.json` ذخیره میشه
