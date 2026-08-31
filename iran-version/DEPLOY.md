# راهنمای استقرار سایت ایرانی

## ساختار پروژه

```
iran-version/
├── backend/     ← سرور Python (FastAPI)
└── frontend/    ← سایت React (فایل‌های استاتیک)
```

---

## پیش‌نیازها

### بک‌اند (Python)
- Python 3.11 یا بالاتر
- pip
- دسترسی به ترمینال/SSH

### فرانت (React)
- Node.js 18+ یا Bun
- npm یا bun

---

## مرحله ۱: نصب بک‌اند

```bash
# وارد پوشه بک‌اند شو
cd iran-version/backend

# نصب وابستگی‌ها
pip install -r requirements.txt

# ساخت فایل تنظیمات
cp .env.example .env
```

### تنظیم فایل `.env`

```bash
# آدرس سایت اصلی
MAIN_SITE_URL=https://nibrc.ir

# رمز عبور سینک (باید با سایت اصلی یکی باشه)
SYNC_API_KEY=یک-رمز-تصادفی-اینجا-بذارید

# هر چند ثانیه سینک بشه (1800 = 30 دقیقه)
SYNC_INTERVAL=1800

# آدرس دیتابیس
# SQLite (ساده):
DATABASE_URL=sqlite:///./data/iran_mirror.db
# PostgreSQL (توصیه شده برای تولید):
# DATABASE_URL=postgresql://user:password@localhost:5432/nibrc_mirror
```

### تست بک‌اند

```bash
# اجرای موقت
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# بررسی کن آیا کار می‌کنه
curl http://localhost:8000/health
# باید برگرده: {"ok": true}

# بررسی سینک
curl http://localhost:8000/api/sync/status
```

---

## مرحله ۲: نصب فرانت

```bash
# وارد پوشه فرانت شو
cd iran-version/frontend

# نصب وابستگی‌ها
npm install

# تست محلی
npm run dev
# سایت باز میشه روی http://localhost:5173

# ساخت نسخه نهایی (فایل‌های استاتیک)
npm run build
# فایل‌ها میرن توی پوشه dist/
```

---

## مرحله ۳: استقرار روی سرور ایران

### گزینه الف: سرور مجازی (VPS)

#### اتصال به سرور
```bash
ssh root@آدرس-آی‌پی-سرور
```

#### نصب پیش‌نیازها روی سرور
```bash
# آپدیت سیستم
apt update && apt upgrade -y

# نصب Python
apt install python3 python3-pip python3-venv -y

# نصب Node.js (برای ساخت فرانت)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y

# نصب Nginx (برای سرو کردن سایت)
apt install nginx -y

# نصب PostgreSQL (اختیاری، برای دیتابیس بهتر)
apt install postgresql postgresql-contrib -y
```

#### آپلود کد به سرور
```bash
# از کامپیوتر خودت:
scp -r iran-version/ root@آدرس-آی‌پی:/var/www/nibrc/
```

#### نصب بک‌اند روی سرور
```bash
# SSH به سرور
ssh root@آدرس-آی‌پی

# وارد پوشه شو
cd /var/www/nibrc/backend

# ساخت محیط مجازی Python
python3 -m venv venv
source venv/bin/activate

# نصب وابستگی‌ها
pip install -r requirements.txt

# تنظیم .env
cp .env.example .env
nano .env  # مقادیر رو تنظیم کن

# ساخت پوشه دیتا
mkdir -p data

# تست اجرا
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### ساخت فرانت روی سرور
```bash
cd /var/www/nibrc/frontend
npm install
npm run build
# فایل‌ها میرن توی dist/
```

#### تنظیم Nginx
```bash
nano /etc/nginx/sites-available/nibrc
```

محتوای فایل:
```nginx
server {
    listen 80;
    server_name nibrc.ir www.nibrc.ir;

    # فرانت (فایل‌های استاتیک)
    location / {
        root /var/www/nibrc/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # بک‌اند (API)
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # سینک (فقط با رمز)
    location /sync/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

فعال‌سازی:
```bash
ln -s /etc/nginx/sites-available/nibrc /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

#### اجرای دائمی بک‌اند (systemd)
```bash
nano /etc/systemd/system/nibrc-backend.service
```

محتوا:
```ini
[Unit]
Description=NIBRC Iran Backend
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/nibrc/backend
Environment=PATH=/var/www/nibrc/backend/venv/bin
ExecStart=/var/www/nibrc/backend/venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

فعال‌سازی:
```bash
systemctl daemon-reload
systemctl enable nibrc-backend
systemctl start nibrc-backend
systemctl status nibrc-backend
```

#### SSL (HTTPS)
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d nibrc.ir -d www.nibrc.ir
```

---

### گزینه ب: هاست اشتراکی ایران

اگه هاست اشتراکی Python دارید (مثل ابرآروان، پارس‌پک):

#### بک‌اند
```bash
# آپلود پوشه backend به هاست
# از طریق SSH یا File Manager

# نصب وابستگی‌ها
pip install -r requirements.txt

# اجرای app
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### فرانت
```bash
# ساخت locally
cd iran-version/frontend
npm install
npm run build

# آپلود محتوای پوشه dist/ به روت هاست
```

---

### گزینه ج: چابکان / ریکتوم

#### چابکان (Python)
```bash
# 1. پروژه بساز
# 2. آپلود کد backend
# 3. تنظیم:
#    - Build Command: pip install -r requirements.txt
#    - Start Command: python -m uvicorn app.main:app --port $PORT
#    - Environment Variables: MAIN_SITE_URL, SYNC_API_KEY, DATABASE_URL

# 4. فرانت رو جداگانه هاست کن (فرانت = فایل استاتیک)
```

#### ریکتوم (React)
```bash
# 1. پروژه بساز
# 2. آپلود کد frontend
# 3. تنظیم:
#    - Build Command: npm install && npm run build
#    - Output Directory: dist

# 4. بک‌اند رو جداگانه هاست کن
```

---

## مرحله ۴: تست نهایی

```bash
# 1. بررسی سایت
curl https://nibrc.ir/

# 2. بررسی API
curl https://nibrc.ir/api/content/courses

# 3. بررسی سینک
curl https://nibrc.ir/api/sync/status

# 4. تست ثبت‌نام
curl -X POST https://nibrc.ir/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"تست","email":"test@test.com","password":"123456"}'

# 5. تست سینک دستی
curl -X POST https://nibrc.ir/api/sync/trigger
```

---

## عیب‌یابی

### سینک کار نمی‌کنه
```bash
# بررسی لاگ
journalctl -u nibrc-backend -f

# تست دستی سینک
curl -X POST http://localhost:8000/api/sync/trigger

# بررسی .env
cat .env
```

### سایت باز نمی‌شه
```bash
# بررسی Nginx
nginx -t
systemctl status nginx

# بررسی پورت
netstat -tlnp | grep 8000
```

### دیتابیس ارور میده
```bash
# SQLite: پوشه data باید قابل نوشتن باشد
chmod -R 777 data/

# PostgreSQL: بررسی اتصال
psql -U user -d nibrc_mirror -h localhost
```

---

## هزینه تقریبی ماهانه

| آیتم | هزینه |
|------|-------|
| VPS ایران (۲ گیگ رم) | ۲۰۰-۴۰۰ هزار تومان |
| دامنه .ir | ۵۰ هزار تومان/سال |
| SSL | رایگان (Let's Encrypt) |
| **جمع** | **۲۰۰-۴۰۰ هزار تومان/ماه** |
