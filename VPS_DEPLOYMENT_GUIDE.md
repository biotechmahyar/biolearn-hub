# 🚀 راهنمای نصب سایت NIBRC روی VPS ایرانی

## معماری سایت

```
┌─────────────────┐     ┌─────────────────┐
│   فرانت‌اند      │────▶│   Convex Cloud   │
│   (Vite/React)  │     │  (Backend/DB)    │
│   استاتیک SPA   │     │  Auth/Realtime   │
└─────────────────┘     └─────────────────┘
        │
        ▼
   سرور VPS ایرانی
   (Nginx یا Apache)
```

---

## 📋 مراحل نصب

### ۱. پیش‌نیازها روی سرور

```bash
# نصب Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# نصب Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# نصب Git
sudo apt install git -y
```

### ۲. کپی پروژه

```bash
# از GitHub
git clone https://github.com/yourusername/nibrc-project.git
cd nibrc-project

# نصب وابستگی‌ها
bun install
```

### ۳. تنظیم متغیرهای محیطی

فایل `.env` بسازید:

```bash
VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
```

> ⚠️ نکته مهم: Convex URL رو از داشبورد Convex بگیرید.
> این URL در زمان build نیازه.

### ۴. Build نهایی

```bash
bun run build
```

خروجی در پوشه `dist/` ذخیره میشه.

### ۵. نصب Nginx

```bash
sudo apt install nginx -y
```

### ۶. تنظیم Nginx

```bash
sudo nano /etc/nginx/sites-available/nibrc
```

محتوای فایل:

```nginx
server {
    listen 80;
    server_name nibrc.ir www.nibrc.ir;

    root /var/www/nibrc/dist;
    index index.html;

    # SPA routing - همه مسیرها به index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # کش فایل‌های استاتیک
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # فشرده‌سازی
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

### ۷. فعال‌سازی سایت

```bash
sudo ln -s /etc/nginx/sites-available/nibrc /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### ۸. انتقال فایل‌ها به سرور

```bash
# از لوکال به سرور
rsync -avz dist/ root@your-vps-ip:/var/www/nibrc/dist/

# یا با scp
scp -r dist/* root@your-vps-ip:/var/www/nibrc/dist/
```

### ۹. نصب SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d nibrc.ir -d www.nibrc.ir
```

### ۱۰. DNS

در پنل مدیریت دامنه:

```
A Record:    nibrc.ir      → IP سرور VPS
CNAME:       www.nibrc.ir  → nibrc.ir
```

---

## ⚡ آنچه نیاز به تغییر نداره

| بخش | وضعیت | توضیح |
|------|--------|-------|
| Convex Backend | ☁️ ابری | در Convex Cloud باقی می‌ماند |
| Auth | ☁️ ابری | از طریق Convex ادامه دارد |
| Realtime | ☁️ ابری | از طریق Convex ادامه دارد |
| Database | ☁️ ابری | از طریق Convex ادامه دارد |
| فرانت‌اند | 🖥️ VPS | روی VPS ایرانی استاتیک سرو می‌شود |

---

## 🔒 نکات امنیتی

1. **VITE_CONVEX_URL** در فرانت‌ند کدگذاری شده (public)
   - مشکلی نداره چون Convex خودش authorization داره
2. **API Keys** Convex در سمت سرور Convex هستن
   - نه روی VPS شما ذخیره می‌شن
3. حتماً **HTTPS** فعال کنید
4. فایل `.env` را در `.gitignore` قرار دهید

---

## 📦 حجم و سرعت

- حجم build نهایی: ~۲-۵ مگابایت
- بارگذاری اول: < ۲ ثانیه
- مناسب برای سرور ۱-۲ گیگ رم
- پهنای باند: ~۱۰-۵۰ گیگابایت در ماه

---

## 🌐 هاست‌های پیشنهادی ایرانی

| هاست | ویژگی |
|------|-------|
| چابکان | پنل ساده، قیمت مناسب |
| ابرآروان | VPS حرفه‌ای، CDN داخلی |
| ایرانسرور | پشتیبانی فارسی |
| هاست‌ایران | قیمت ارزان |

---

## 🔄 آپدیت سایت

برای بروزرسانی بعد از تغییرات:

```bash
# در لوکال
git pull
bun install
bun run build

# انتقال به سرور
rsync -avz dist/ root@your-vps-ip:/var/www/nibrc/dist/
```

---

## 🐛 عیب‌یابی

### صفحه خالی نمایش داده می‌شه
```bash
# بررسی کنید فایل index.html وجود داره
ls -la /var/www/nibrc/dist/index.html

# بررسی log Nginx
sudo tail -f /var/log/nginx/error.log
```

### مسیرهای SPA کار نمی‌کنن
```bash
# مطمئن شوید try_files تنظیم شده
sudo nginx -t
sudo systemctl reload nginx
```

### SSL کار نمی‌کنه
```bash
# بررسی وضعیت Certbot
sudo certbot certificates
sudo certbot renew --dry-run
```

---

## ✅ چک‌لیست نهایی

- [ ] Node.js و Bun نصب شده
- [ ] پروژه clone شده
- [ ] `.env` با `VITE_CONVEX_URL` تنظیم شده
- [ ] `bun run build` موفق بوده
- [ ] Nginx نصب و تنظیم شده
- [ ] فایل‌ها به سرور منتقل شده
- [ ] DNS تنظیم شده
- [ ] SSL فعال شده
- [ ] سایت با HTTPS باز می‌شه
- [ ] صفحات SPA درست کار می‌کنن

---

**تاریخ ایجاد:** ۱ سپتامبر ۲۰۲۶
**نسخه:** 1.0
